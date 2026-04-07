    def generate_future_transactions(self, db: Session, *, user_id: UUID) -> int:
        """
        Gera transações futuras para recorrências ativas (tipo subscription).
        Cobre mês atual + 2 meses à frente.

        Deduplicação em duas camadas:
        1. Por recurring_expense_id + mês/ano  → transações já geradas pelo sistema
        2. Por description + account_id + mês/ano → transações lançadas manualmente
           ou criadas antes desta lógica (sem recurring_expense_id preenchido)

        Se encontrar uma transação pela camada 2, vincula o recurring_expense_id
        para que verificações futuras usem a camada 1 (mais eficiente).

        Usa extract('year') e extract('month') em vez de date_trunc para evitar
        falsos negativos quando a data da transação existente difere da data
        calculada pelo gerador dentro do mesmo mês.
        """
        from app.models.transaction import Transaction, TransactionNature
        import calendar
        from dateutil.relativedelta import relativedelta

        today = datetime.date.today()
        target_months = [today.replace(day=1) + relativedelta(months=i) for i in range(3)]

        recurrings = db.scalars(
            select(RecurringExpense)
            .options(joinedload(RecurringExpense.category))
            .filter(
                RecurringExpense.user_id == user_id,
                RecurringExpense.active == True,
                RecurringExpense.type == "subscription",
            )
        ).unique().all()

        created_count = 0
        affected_account_ids = set()
        needs_commit = False

        for r in recurrings:
            for target_month_start in target_months:
                # Verifica se a recorrência se aplica a este mês
                if target_month_start < r.start_date.replace(day=1):
                    continue
                if r.end_date and target_month_start > r.end_date:
                    continue
                if r.frequency == "yearly" and r.start_date.month != target_month_start.month:
                    continue

                t_year  = target_month_start.year
                t_month = target_month_start.month

                # ── Camada 1: por recurring_expense_id + mês/ano ──────────────
                exists = db.scalar(
                    select(Transaction.id).filter(
                        Transaction.recurring_expense_id == r.id,
                        Transaction.user_id == user_id,
                        func.extract('year',  Transaction.date) == t_year,
                        func.extract('month', Transaction.date) == t_month,
                        Transaction.deleted_at == None,
                    )
                )
                if exists:
                    continue

                # ── Camada 2: por description + account + mês/ano ─────────────
                orphan_id = None
                if r.account_id:
                    orphan_id = db.scalar(
                        select(Transaction.id).filter(
                            Transaction.description == r.description,
                            Transaction.account_id  == r.account_id,
                            Transaction.user_id     == user_id,
                            func.extract('year',  Transaction.date) == t_year,
                            func.extract('month', Transaction.date) == t_month,
                            Transaction.deleted_at == None,
                        )
                    )

                if orphan_id:
                    # Vincula ao recurring_expense_id sem criar duplicata
                    db.execute(
                        Transaction.__table__.update()
                        .where(Transaction.id == orphan_id)
                        .values(recurring_expense_id=r.id)
                    )
                    needs_commit = True
                    continue

                # ── Cria nova transação ────────────────────────────────────────
                _, last_day = calendar.monthrange(t_year, t_month)
                t_date = target_month_start.replace(day=min(r.start_date.day, last_day))

                nature = TransactionNature.EXPENSE
                if r.category and r.category.type == CategoryType.income:
                    nature = TransactionNature.INCOME

                amount = -abs(r.amount) if nature == TransactionNature.EXPENSE else abs(r.amount)

                new_t = Transaction(
                    description=r.description,
                    amount=amount,
                    date=t_date,
                    nature=nature,
                    account_id=r.account_id,
                    category_id=r.category_id,
                    recurring_expense_id=r.id,
                    user_id=user_id,
                )
                db.add(new_t)
                created_count += 1
                needs_commit = True
                if r.account_id:
                    affected_account_ids.add(r.account_id)

        if needs_commit:
            db.commit()

        for acc_id in affected_account_ids:
            balance = crud_account.get_balance(db, acc_id)
            crud_account._record_history(db, acc_id, balance)

        return created_count

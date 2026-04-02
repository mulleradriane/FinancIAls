# Adicionar no arquivo app/routers/analytics.py
# Inserir antes do último endpoint ou no bloco de rotas de analytics

# ─────────────────────────────────────────────────────────────────────────────
# GET /analytics/account-balances-history
# Retorna o saldo de cada conta no encerramento do mês informado (year, month).
# Usa o último registro de balance_history dentro do mês.
# Se não houver registro para o mês exato, busca o registro mais recente
# anterior ao mês — representa o saldo "congelado" naquele período.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/account-balances-history")
def get_account_balances_history(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna { account_id: balance } para o encerramento do mês year/month.
    Útil para reconstruir a visão do Dashboard em meses passados.
    """
    from app.models.balance_history import BalanceHistory
    from app.models.account import Account
    import calendar
    from datetime import date

    # Último dia do mês solicitado
    last_day = calendar.monthrange(year, month)[1]
    end_of_month = date(year, month, last_day)

    # Busca contas do usuário
    accounts = db.scalars(
        select(Account).filter(Account.user_id == current_user.id)
    ).all()

    result = {}

    for acc in accounts:
        # Pega o registro mais recente de balance_history até o fim do mês
        history = db.scalar(
            select(BalanceHistory)
            .filter(
                BalanceHistory.account_id == acc.id,
                BalanceHistory.date <= end_of_month,
            )
            .order_by(BalanceHistory.date.desc())
            .limit(1)
        )
        if history:
            result[str(acc.id)] = float(history.balance)
        else:
            # Sem histórico: usa initial_balance se a conta existia antes do mês
            if acc.initial_balance_date and acc.initial_balance_date <= end_of_month:
                result[str(acc.id)] = float(acc.initial_balance or 0)
            # Conta criada depois do mês: não inclui no resultado

    return result

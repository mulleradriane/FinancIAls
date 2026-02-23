"""stabilize financial architecture

Revision ID: stabilize_fin_arch
Revises: 30df0591076f
Create Date: 2024-05-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect, text
import uuid
from decimal import Decimal

# revision identifiers, used by Alembic.
revision = 'stabilize_fin_arch'
down_revision = '30df0591076f'
branch_labels = None
depends_on = None

def table_exists(conn, name):
    insp = inspect(conn)
    return name in insp.get_table_names()

def column_exists(conn, table_name, column_name):
    insp = inspect(conn)
    columns = [c['name'] for c in insp.get_columns(table_name)]
    return column_name in columns

def upgrade():
    conn = op.get_bind()

    # ===== PASSO 0: RENOMEAR OS VALORES DO ENUM (CRÍTICO) =====
    # Isto deve acontecer ANTES de qualquer operação que use os novos nomes em português
    print("Verificando e renomeando valores do ENUM accounttype...")
    try:
        # Verifica quais valores existem atualmente no enum
        result = conn.execute(text("SELECT unnest(enum_range(NULL::accounttype))::text")).fetchall()
        enum_values = [r[0] for r in result]
        print(f"Valores atuais do ENUM: {enum_values}")

        # Mapeamento de valores antigos (inglês) para novos (português)
        enum_rename_map = {
            'bank': 'banco',
            'wallet': 'carteira',
            'savings': 'poupanca',
            'investment': 'investimento',
            'credit_card': 'cartao_credito'
        }

        # Renomeia cada valor que existir no enum
        for old_val, new_val in enum_rename_map.items():
            if old_val in enum_values:
                op.execute(f"ALTER TYPE accounttype RENAME VALUE '{old_val}' TO '{new_val}'")
                print(f"  Renomeado: '{old_val}' -> '{new_val}'")

        print("ENUM values renamed successfully")
    except Exception as e:
        # Se o enum não existir ou outro erro, apenas loga e continua
        print(f"Nota ao renomear ENUM: {e}")
        print("Continuando com a migração...")

    # ===== PASSO 1: ALINHAR TIPOS DE CONTA (SOMENTE SE HOUVER DADOS) =====
    # Primeiro, verifica se existem contas com tipos antigos/em maiúsculo
    result = conn.execute(
        text("SELECT type FROM accounts WHERE type::text IN ('bank', 'BANK', 'CHECKING', 'wallet', 'CASH', 'WALLET', 'savings', 'SAVINGS', 'investment', 'INVESTMENT', 'credit_card', 'CREDIT_CARD') LIMIT 1")
    ).first()
    
    # Só executa os updates se encontrar contas com esses tipos
    if result:
        op.execute("UPDATE accounts SET type = 'banco' WHERE type IN ('bank', 'BANK', 'CHECKING')")
        op.execute("UPDATE accounts SET type = 'carteira' WHERE type IN ('wallet', 'CASH', 'WALLET')")
        op.execute("UPDATE accounts SET type = 'poupanca' WHERE type IN ('savings', 'SAVINGS')")
        op.execute("UPDATE accounts SET type = 'investimento' WHERE type IN ('investment', 'INVESTMENT')")
        op.execute("UPDATE accounts SET type = 'cartao_credito' WHERE type IN ('credit_card', 'CREDIT_CARD')")
        print("Tipos de conta atualizados com sucesso.")
    else:
        print("Nenhuma conta legada encontrada. Pulando atualização de tipos.")

    # ===== PASSO 2: CRIAR CONTAS PADRÃO PARA DADOS LEGADOS =====
    # Verifica se temos investments legados para criar conta órfão
    has_investments = table_exists(conn, 'investments')
    legacy_inv_acc_id = None
    if has_investments:
        # Cria uma conta de investimento padrão para órfãos
        legacy_inv_acc_id = str(uuid.uuid4())
        # AGORA o ENUM já tem 'investimento' como valor válido (graças ao Passo 0)
        op.execute(text(f"INSERT INTO accounts (id, name, type, initial_balance) VALUES ('{legacy_inv_acc_id}', 'Investimentos Legados', 'investimento', 0)"))
        print(f"Conta legada criada: {legacy_inv_acc_id}")

    # ===== PASSO 3: ADICIONAR NOVAS COLUNAS AO TRANSACTIONS =====
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.add_column(sa.Column('nature', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('transfer_group_id', postgresql.UUID(as_uuid=True), nullable=True))
        batch_op.alter_column('category_id',
                   existing_type=sa.CHAR(32),
                   nullable=True)

    # ===== PASSO 4: MIGRAÇÃO DE DADOS (Python-based para confiabilidade e dual-entry) =====

    # 4.1 Atualizar transactions existentes
    if column_exists(conn, 'transactions', 'type'):
        op.execute("UPDATE transactions SET nature = 'INCOME' WHERE type = 'income'")
        op.execute("UPDATE transactions SET nature = 'EXPENSE' WHERE type = 'expense'")

    op.execute("UPDATE transactions SET nature = 'EXPENSE' WHERE nature IS NULL")
    op.execute("UPDATE transactions SET amount = -ABS(amount) WHERE nature = 'EXPENSE'")
    op.execute("UPDATE transactions SET amount = ABS(amount) WHERE nature = 'INCOME'")

    # 4.2 Migrate Incomes - Adaptado para estrutura real da tabela
    if table_exists(conn, 'incomes'):
        # Verifica estrutura da tabela
        insp = inspect(conn)
        income_columns = [c['name'] for c in insp.get_columns('incomes')]
        print(f"Colunas da tabela incomes: {income_columns}")
        has_category = 'category_id' in income_columns
        
        if has_category:
            res = conn.execute(text("SELECT id, description, amount, date, account_id, category_id FROM incomes")).all()
        else:
            res = conn.execute(text("SELECT id, description, amount, date, account_id FROM incomes")).all()
            
        for row in res:
            if has_category:
                op.execute(text("""
                    INSERT INTO transactions (id, description, amount, nature, date, account_id, category_id)
                    VALUES (:id, :desc, :amount, 'INCOME', :date, :acc, :cat)
                """).bindparams(id=row[0], desc=row[1], amount=abs(row[2]), date=row[3], acc=row[4], cat=row[5]))
            else:
                op.execute(text("""
                    INSERT INTO transactions (id, description, amount, nature, date, account_id)
                    VALUES (:id, :desc, :amount, 'INCOME', :date, :acc)
                """).bindparams(id=row[0], desc=row[1], amount=abs(row[2]), date=row[3], acc=row[4]))

    # 4.3 Migrate Transfers (DUAL ENTRY)
    if table_exists(conn, 'transfers'):
        res = conn.execute(text("SELECT id, description, amount, date, from_account_id, to_account_id FROM transfers")).all()
        for row in res:
            transfer_id = row[0]
            desc = row[1] or "Transferência"
            amount = abs(row[2])
            dt = row[3]
            from_acc = row[4]
            to_acc = row[5]

            # Registro 1: Saída (outflow)
            op.execute(text("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id, transfer_group_id)
                VALUES (:id, :desc, :amount, 'TRANSFER', :date, :acc, :group)
            """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=-amount, date=dt, acc=from_acc, group=transfer_id))

            # Registro 2: Entrada (inflow)
            op.execute(text("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id, transfer_group_id)
                VALUES (:id, :desc, :amount, 'TRANSFER', :date, :acc, :group)
            """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=amount, date=dt, acc=to_acc, group=transfer_id))

    # 4.4 Migrate Investments (DUAL ENTRY) - Adaptado para estrutura real
    if has_investments:
        # Verifica estrutura da tabela
        insp = inspect(conn)
        inv_columns = [c['name'] for c in insp.get_columns('investments')]
        print(f"Colunas da tabela investments: {inv_columns}")
        has_category_inv = 'category_id' in inv_columns
        
        if has_category_inv:
            res = conn.execute(text("SELECT id, description, amount, date, account_id, category_id FROM investments")).all()
        else:
            res = conn.execute(text("SELECT id, description, amount, date, account_id FROM investments")).all()
            
        for row in res:
            inv_id = row[0]
            desc = row[1]
            amount = abs(row[2])
            dt = row[3]
            from_acc = row[4]
            cat = row[5] if has_category_inv else None

            group_id = str(uuid.uuid4())

            # Record 1: Outflow (from Checking)
            if has_category_inv:
                op.execute(text("""
                    INSERT INTO transactions (id, description, amount, nature, date, account_id, category_id, transfer_group_id)
                    VALUES (:id, :desc, :amount, 'INVESTMENT', :date, :acc, :cat, :group)
                """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=-amount, date=dt, acc=from_acc, cat=cat, group=group_id))
            else:
                op.execute(text("""
                    INSERT INTO transactions (id, description, amount, nature, date, account_id, transfer_group_id)
                    VALUES (:id, :desc, :amount, 'INVESTMENT', :date, :acc, :group)
                """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=-amount, date=dt, acc=from_acc, group=group_id))

            # Record 2: Inflow (to Investment Account)
            if has_category_inv:
                op.execute(text("""
                    INSERT INTO transactions (id, description, amount, nature, date, account_id, category_id, transfer_group_id)
                    VALUES (:id, :desc, :amount, 'INVESTMENT', :date, :acc, :cat, :group)
                """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=amount, date=dt, acc=legacy_inv_acc_id, cat=cat, group=group_id))
            else:
                op.execute(text("""
                    INSERT INTO transactions (id, description, amount, nature, date, account_id, transfer_group_id)
                    VALUES (:id, :desc, :amount, 'INVESTMENT', :date, :acc, :group)
                """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=amount, date=dt, acc=legacy_inv_acc_id, group=group_id))

    # ===== PASSO 5: LIMPEZA FINAL =====
    op.execute("UPDATE transactions SET nature = 'EXPENSE' WHERE nature IS NULL")

    with op.batch_alter_table('transactions') as batch_op:
        batch_op.alter_column('nature', nullable=False)

def downgrade():
    pass
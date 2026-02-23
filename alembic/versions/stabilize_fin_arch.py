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

    # 1. Align Account Types
    op.execute("UPDATE accounts SET type = 'banco' WHERE type IN ('bank', 'BANK', 'CHECKING')")
    op.execute("UPDATE accounts SET type = 'carteira' WHERE type IN ('wallet', 'CASH', 'WALLET')")
    op.execute("UPDATE accounts SET type = 'poupanca' WHERE type IN ('savings', 'SAVINGS')")
    op.execute("UPDATE accounts SET type = 'investimento' WHERE type IN ('investment', 'INVESTMENT')")
    op.execute("UPDATE accounts SET type = 'cartao_credito' WHERE type IN ('credit_card', 'CREDIT_CARD')")

    # 2. Create Default Accounts for Legacy Data if needed
    # Check if we have legacy investments
    has_investments = table_exists(conn, 'investments')
    legacy_inv_acc_id = None
    if has_investments:
        # Create a default investment account for orphans
        legacy_inv_acc_id = str(uuid.uuid4())
        op.execute(text(f"INSERT INTO accounts (id, name, type, initial_balance) VALUES ('{legacy_inv_acc_id}', 'Investimentos Legados', 'investimento', 0)"))

    # 3. Add new columns to transactions
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.add_column(sa.Column('nature', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('transfer_group_id', postgresql.UUID(as_uuid=True), nullable=True))
        batch_op.alter_column('category_id',
                   existing_type=sa.CHAR(32),
                   nullable=True)

    # 4. DATA MIGRATION (Python-based for reliability and dual-entry)

    # 4.1 Update existing transactions
    if column_exists(conn, 'transactions', 'type'):
        op.execute("UPDATE transactions SET nature = 'INCOME' WHERE type = 'income'")
        op.execute("UPDATE transactions SET nature = 'EXPENSE' WHERE type = 'expense'")

    op.execute("UPDATE transactions SET nature = 'EXPENSE' WHERE nature IS NULL")
    op.execute("UPDATE transactions SET amount = -ABS(amount) WHERE nature = 'EXPENSE'")
    op.execute("UPDATE transactions SET amount = ABS(amount) WHERE nature = 'INCOME'")

    # 4.2 Migrate Incomes
    if table_exists(conn, 'incomes'):
        res = conn.execute(text("SELECT id, description, amount, date, account_id, category_id FROM incomes")).all()
        for row in res:
            op.execute(text("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id, category_id)
                VALUES (:id, :desc, :amount, 'INCOME', :date, :acc, :cat)
            """).bindparams(id=row[0], desc=row[1], amount=abs(row[2]), date=row[3], acc=row[4], cat=row[5]))

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

            # Record 1: Outflow
            op.execute(text("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id, transfer_group_id)
                VALUES (:id, :desc, :amount, 'TRANSFER', :date, :acc, :group)
            """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=-amount, date=dt, acc=from_acc, group=transfer_id))

            # Record 2: Inflow
            op.execute(text("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id, transfer_group_id)
                VALUES (:id, :desc, :amount, 'TRANSFER', :date, :acc, :group)
            """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=amount, date=dt, acc=to_acc, group=transfer_id))

    # 4.4 Migrate Investments (DUAL ENTRY)
    if has_investments:
        res = conn.execute(text("SELECT id, description, amount, date, account_id, category_id FROM investments")).all()
        for row in res:
            inv_id = row[0]
            desc = row[1]
            amount = abs(row[2])
            dt = row[3]
            from_acc = row[4]
            cat = row[5]

            group_id = str(uuid.uuid4())

            # Record 1: Outflow (from Checking)
            op.execute(text("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id, category_id, transfer_group_id)
                VALUES (:id, :desc, :amount, 'INVESTMENT', :date, :acc, :cat, :group)
            """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=-amount, date=dt, acc=from_acc, cat=cat, group=group_id))

            # Record 2: Inflow (to Investment Account)
            op.execute(text("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id, category_id, transfer_group_id)
                VALUES (:id, :desc, :amount, 'INVESTMENT', :date, :acc, :cat, :group)
            """).bindparams(id=str(uuid.uuid4()), desc=desc, amount=amount, date=dt, acc=legacy_inv_acc_id, cat=cat, group=group_id))

    # 5. Final Cleanup
    op.execute("UPDATE transactions SET nature = 'EXPENSE' WHERE nature IS NULL")

    with op.batch_alter_table('transactions') as batch_op:
        batch_op.alter_column('nature', nullable=False)

def downgrade():
    pass

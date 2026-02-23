"""stabilize financial architecture

Revision ID: stabilize_fin_arch
Revises: 30df0591076f
Create Date: 2024-05-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'stabilize_fin_arch'
down_revision = '30df0591076f'
branch_labels = None
depends_on = None

def table_exists(name):
    con = op.get_bind()
    insp = inspect(con)
    return name in insp.get_table_names()

def column_exists(table_name, column_name):
    con = op.get_bind()
    insp = inspect(con)
    columns = [c['name'] for c in insp.get_columns(table_name)]
    return column_name in columns

def upgrade():
    # 1. Align Account Types
    op.execute("UPDATE accounts SET type = 'banco' WHERE type IN ('bank', 'BANK', 'CHECKING')")
    op.execute("UPDATE accounts SET type = 'carteira' WHERE type IN ('wallet', 'CASH', 'WALLET')")
    op.execute("UPDATE accounts SET type = 'poupanca' WHERE type IN ('savings', 'SAVINGS')")
    op.execute("UPDATE accounts SET type = 'investimento' WHERE type IN ('investment', 'INVESTMENT')")
    op.execute("UPDATE accounts SET type = 'cartao_credito' WHERE type IN ('credit_card', 'CREDIT_CARD')")

    # 2. Add new columns to transactions
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.add_column(sa.Column('nature', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('transfer_group_id', postgresql.UUID(as_uuid=True), nullable=True))
        batch_op.alter_column('category_id',
                   existing_type=sa.CHAR(32),
                   nullable=True)

    # 3. DATA MIGRATION (Simplified and Protected)

    # 3.1 Update existing transactions
    if column_exists('transactions', 'type'):
        op.execute("UPDATE transactions SET nature = 'INCOME' WHERE type = 'income'")
        op.execute("UPDATE transactions SET nature = 'EXPENSE' WHERE type = 'expense'")

    op.execute("UPDATE transactions SET nature = 'EXPENSE' WHERE nature IS NULL")
    op.execute("UPDATE transactions SET amount = -ABS(amount) WHERE nature = 'EXPENSE'")
    op.execute("UPDATE transactions SET amount = ABS(amount) WHERE nature = 'INCOME'")

    # 3.2 Migrate Incomes
    if table_exists('incomes'):
        try:
            op.execute("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id)
                SELECT id, description, ABS(amount), 'INCOME', date, account_id
                FROM incomes
            """)
        except:
            pass

    # 3.3 Migrate Transfers
    if table_exists('transfers'):
        try:
            op.execute("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id, transfer_group_id)
                SELECT id, COALESCE(description, 'Transferência'), -ABS(amount), 'TRANSFER', date, from_account_id, id
                FROM transfers
            """)
        except:
            pass

    # 3.4 Migrate Investments
    if table_exists('investments'):
        try:
            op.execute("""
                INSERT INTO transactions (id, description, amount, nature, date, account_id)
                SELECT id, description, -ABS(amount), 'INVESTMENT', date, account_id
                FROM investments
            """)
        except:
            pass

    # 4. Final Cleanup
    op.execute("UPDATE transactions SET nature = 'EXPENSE' WHERE nature IS NULL")

    with op.batch_alter_table('transactions') as batch_op:
        batch_op.alter_column('nature', nullable=False)

def downgrade():
    pass

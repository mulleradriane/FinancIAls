"""migrate legacy data to default account

Revision ID: 8633a9001fff
Revises: 73f50035a5f8
Create Date: 2026-02-17 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import uuid

# revision identifiers, used by Alembic.
revision: str = '8633a9001fff'
down_revision: Union[str, Sequence[str], None] = '73f50035a5f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use a fixed UUID for the default account during migration to ensure consistency
    default_account_id = '00000000-0000-0000-0000-000000000001'

    # Check if accounts table is empty or if we need to create the default one
    # For simplicity, we just try to insert it if it doesn't exist, or just use op.execute

    # Create default account
    op.execute(
        f"INSERT INTO accounts (id, name, type) VALUES ('{default_account_id}', 'Carteira (Padrão)', 'wallet')"
    )

    # Update existing records
    tables = ['transactions', 'incomes', 'investments', 'recurring_expenses']
    for table in tables:
        op.execute(
            f"UPDATE {table} SET account_id = '{default_account_id}' WHERE account_id IS NULL"
        )


def downgrade() -> None:
    pass

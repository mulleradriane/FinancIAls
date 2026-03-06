"""fix_negative_income_amounts

Revision ID: 0a173a4a2b4d
Revises: c194840f9bb1
Create Date: 2026-03-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a173a4a2b4d'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fix negative income amounts in transactions
    op.execute("""
        UPDATE transactions
        SET amount = ABS(amount)
        WHERE nature = 'INCOME'
        AND amount < 0;
    """)

    # Fix negative amounts in recurring_expenses
    # For recurring_expenses, we don't have a 'nature' column, but we know they should be positive
    # Based on the user request: "Sim, corrigir também recurring_expenses onde amount < 0."
    op.execute("""
        UPDATE recurring_expenses
        SET amount = ABS(amount)
        WHERE amount < 0;
    """)


def downgrade() -> None:
    # No easy way to revert this without knowing which ones were originally negative
    pass

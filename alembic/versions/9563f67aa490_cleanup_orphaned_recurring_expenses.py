"""cleanup_orphaned_recurring_expenses

Revision ID: 9563f67aa490
Revises: 8633a9001fff
Create Date: 2026-02-18 13:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '9563f67aa490'
down_revision: Union[str, Sequence[str], None] = '8633a9001fff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("DELETE FROM recurring_expenses WHERE account_id IS NOT NULL AND account_id NOT IN (SELECT id FROM accounts)")

def downgrade() -> None:
    pass

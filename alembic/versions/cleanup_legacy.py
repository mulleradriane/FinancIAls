"""cleanup legacy tables and columns

Revision ID: cleanup_legacy
Revises: stabilize_fin_arch
Create Date: 2024-05-22

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'cleanup_legacy'
down_revision = 'stabilize_fin_arch'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Remove old tables
    op.drop_table('incomes')
    op.drop_table('investments')
    op.drop_table('transfers')

    # 2. Remove 'type' column from transactions
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.drop_column('type')

def downgrade():
    pass

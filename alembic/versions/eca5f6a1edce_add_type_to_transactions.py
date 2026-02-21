"""add_type_to_transactions

Revision ID: eca5f6a1edce
Revises: 6b5f08936118
Create Date: 2026-02-21 12:48:19.151613

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eca5f6a1edce'
down_revision: Union[str, Sequence[str], None] = '6b5f08936118'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Define the Enum
    transaction_type = sa.Enum('expense', 'income', name='transactiontype')

    # Add column as nullable first
    with op.batch_alter_table('transactions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('type', transaction_type, nullable=True))

    # Update data using subquery for compatibility
    op.execute(
        "UPDATE transactions SET type = (SELECT type FROM categories WHERE categories.id = transactions.category_id)"
    )

    # Set default for any orphans (if any)
    op.execute(
        "UPDATE transactions SET type = 'expense' WHERE type IS NULL"
    )

    # Set non-nullable
    with op.batch_alter_table('transactions', schema=None) as batch_op:
        batch_op.alter_column('type', nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('transactions', schema=None) as batch_op:
        batch_op.drop_column('type')

"""add is_system to categories

Revision ID: 30df0591076f
Revises: addbf9c492ec
Create Date: 2026-02-21 16:10:09.856958

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '30df0591076f'
down_revision: Union[str, Sequence[str], None] = 'b92b920524e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add column with default False
    op.add_column('categories', sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.text('FALSE')))

    # Update "Ajuste de Saldo" if it exists (case-insensitive search for safety during migration)
    op.execute("UPDATE categories SET is_system = TRUE WHERE LOWER(name) = 'ajuste de saldo'")

    # Explicitly create "Ajuste de Saldo" as a system category if it doesn't exist.
    # We use a fixed UUID for consistency across environments.
    op.execute("""
        INSERT INTO categories (id, name, type, icon, color, is_system)
        SELECT '3996962d-375e-4c74-90a6-89688d076d54', 'Ajuste de Saldo', 'income', '🛠️', '#6366f1', TRUE
        WHERE NOT EXISTS (
            SELECT 1 FROM categories WHERE LOWER(name) = 'ajuste de saldo'
        )
    """)


def downgrade() -> None:
    op.drop_column('categories', 'is_system')

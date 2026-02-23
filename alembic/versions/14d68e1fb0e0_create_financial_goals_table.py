"""create_financial_goals_table

Revision ID: 14d68e1fb0e0
Revises: 25b713b1ee97
Create Date: 2026-02-23 23:10:53.843822

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '14d68e1fb0e0'
down_revision: Union[str, Sequence[str], None] = '25b713b1ee97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'financial_goals',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('target_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('goal_type', sa.Enum('SAVINGS', 'NET_WORTH', name='goaltype'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('financial_goals')
    # If postgres, we might want to drop the enum type but usually it's handled or we can leave it.
    # In this project, they seem to use ENUMs.

"""add category_overrides table

Revision ID: a1b2c3d4e5f6
Revises: b4e4dd6833a7
Create Date: 2026-02-28 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'b4e4dd6833a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'category_overrides',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('monthly_budget', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'category_id', name='uq_category_overrides_user_category')
    )
    op.create_index('ix_category_overrides_user_id', 'category_overrides', ['user_id'])
    op.create_index('ix_category_overrides_category_id', 'category_overrides', ['category_id'])


def downgrade() -> None:
    op.drop_index('ix_category_overrides_category_id', table_name='category_overrides')
    op.drop_index('ix_category_overrides_user_id', table_name='category_overrides')
    op.drop_table('category_overrides')

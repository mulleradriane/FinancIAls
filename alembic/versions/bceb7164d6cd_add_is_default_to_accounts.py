"""add_is_default_to_accounts

Revision ID: bceb7164d6cd
Revises: a0a4736d2b2c
Create Date: 2024-05-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'bceb7164d6cd'
down_revision = 'a0a4736d2b2c'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('accounts', sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')))

def downgrade():
    op.drop_column('accounts', 'is_default')

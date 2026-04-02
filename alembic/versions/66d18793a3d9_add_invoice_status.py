"""add_invoice_status

Revision ID: 66d18793a3d9
Revises: 
Create Date: 2026-04-02 12:00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '66d18793a3d9'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Cria o enum
    invoice_status_enum = sa.Enum('open', 'closed', name='invoicestatus')
    invoice_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Adiciona as colunas
    op.add_column('accounts', sa.Column('invoice_status', sa.Enum('open', 'closed', name='invoicestatus'), nullable=False, server_default='open'))
    op.add_column('accounts', sa.Column('invoice_closed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('accounts', sa.Column('invoice_snapshot_amount', sa.Numeric(12, 2), nullable=True))

def downgrade() -> None:
    op.drop_column('accounts', 'invoice_snapshot_amount')
    op.drop_column('accounts', 'invoice_closed_at')
    op.drop_column('accounts', 'invoice_status')
    
    # Drop do enum
    sa.Enum(name='invoicestatus').drop(op.get_bind(), checkfirst=True)
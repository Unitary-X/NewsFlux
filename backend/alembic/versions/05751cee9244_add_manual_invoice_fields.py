"""add_manual_invoice_fields

Revision ID: 05751cee9244
Revises: 7cdd2c3f0773
Create Date: 2026-04-19 08:37:25.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '05751cee9244'
down_revision: Union[str, None] = '7cdd2c3f0773'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('invoices', sa.Column('manual_paper_name', sa.String(length=100), nullable=True))
    op.add_column('invoices', sa.Column('manual_paper_price', sa.Numeric(precision=10, scale=2), nullable=True))

def downgrade() -> None:
    op.drop_column('invoices', 'manual_paper_price')
    op.drop_column('invoices', 'manual_paper_name')

"""Add editable month/year taken fields to worker_daily_stock

Revision ID: d4e6f8a9b1c2
Revises: 05751cee9244
Create Date: 2026-04-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd4e6f8a9b1c2'
down_revision: Union[str, Sequence[str], None] = '05751cee9244'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE worker_daily_stock ADD COLUMN IF NOT EXISTS month_taken INTEGER")
    op.execute("ALTER TABLE worker_daily_stock ADD COLUMN IF NOT EXISTS year_taken INTEGER")


def downgrade() -> None:
    op.execute("ALTER TABLE worker_daily_stock DROP COLUMN IF EXISTS year_taken")
    op.execute("ALTER TABLE worker_daily_stock DROP COLUMN IF EXISTS month_taken")

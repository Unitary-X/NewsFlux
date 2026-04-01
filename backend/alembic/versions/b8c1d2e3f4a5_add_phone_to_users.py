"""add phone column to users

Revision ID: b8c1d2e3f4a5
Revises: a2f3b4c5d6e7
Create Date: 2026-04-01 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c1d2e3f4a5'
down_revision: Union[str, Sequence[str], None] = 'a2f3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Keep this idempotent for environments where schema drift already exists.
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS phone")

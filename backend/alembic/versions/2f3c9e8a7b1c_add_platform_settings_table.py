"""Add PlatformSettings table

Revision ID: 2f3c9e8a7b1c
Revises: 651ab7e39aec
Create Date: 2026-03-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f3c9e8a7b1c'
down_revision: Union[str, Sequence[str], None] = '651ab7e39aec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add PlatformSettings table."""
    op.create_table('platform_settings',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('setting_key', sa.String(length=100), nullable=False),
    sa.Column('setting_value', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('setting_key')
    )


def downgrade() -> None:
    """Downgrade schema by removing PlatformSettings table."""
    op.drop_table('platform_settings')

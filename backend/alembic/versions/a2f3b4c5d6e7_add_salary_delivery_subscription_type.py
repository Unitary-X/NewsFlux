"""add salary, daily_delivery tables and subscription_type column

Revision ID: a2f3b4c5d6e7
Revises: 651ab7e39aec
Create Date: 2026-03-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a2f3b4c5d6e7'
down_revision = '2f3c9e8a7b1c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add subscription_type to customer_subscriptions
    op.add_column('customer_subscriptions',
        sa.Column('subscription_type', sa.String(20), server_default='daily', nullable=True)
    )

    # Create salaries table
    op.create_table('salaries',
        sa.Column('id', sa.Uuid(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), sa.ForeignKey('agencies.id'), nullable=False),
        sa.Column('worker_id', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('base_salary', sa.DECIMAL(10, 2), server_default='0.00'),
        sa.Column('bonus', sa.DECIMAL(10, 2), server_default='0.00'),
        sa.Column('deductions', sa.DECIMAL(10, 2), server_default='0.00'),
        sa.Column('total_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create daily_deliveries table
    op.create_table('daily_deliveries',
        sa.Column('id', sa.Uuid(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), sa.ForeignKey('agencies.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('customer_id', sa.Uuid(), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('worker_id', sa.Uuid(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('daily_deliveries')
    op.drop_table('salaries')
    op.drop_column('customer_subscriptions', 'subscription_type')

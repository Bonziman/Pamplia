"""create  user table

Revision ID: 567a821b40e4
Revises: a43cbdca3b97
Create Date: 2025-04-22 03:29:39.576332

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '567a821b40e4'
down_revision: Union[str, None] = 'a43cbdca3b97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('password', sa.String(), nullable=False))
    op.add_column('users', sa.Column('role', sa.String(), nullable=True))
    op.drop_index('ix_users_email', table_name='users')
    op.create_unique_constraint(None, 'users', ['email'])
    op.drop_column('users', 'hashed_password')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('hashed_password', sa.VARCHAR(), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'users', type_='unique')
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.drop_column('users', 'role')
    op.drop_column('users', 'password')
    # ### end Alembic commands ###

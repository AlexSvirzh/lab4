from alembic import op
import sqlalchemy as sa

revision = "001_init"
down_revision = None

def upgrade():
    op.create_table("roles", sa.Column("name", sa.String(), primary_key=True))
    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role_name", sa.String(), sa.ForeignKey("roles.name")),
        sa.Column("permission", sa.String()),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("login", sa.String(32), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role_name", sa.String(), sa.ForeignKey("roles.name")),
        sa.Column("created_at", sa.DateTime()),
    )

def downgrade():
    op.drop_table("users")
    op.drop_table("role_permissions")
    op.drop_table("roles")
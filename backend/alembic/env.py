import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alembic import context
from sqlalchemy import create_engine
from main import Base

url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/lab4")
engine = create_engine(url)

with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
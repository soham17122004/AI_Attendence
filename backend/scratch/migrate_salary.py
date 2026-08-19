from app.core.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_salary FLOAT DEFAULT 30000.0;"))
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate FLOAT DEFAULT 150.0;"))
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances FLOAT DEFAULT 0.0;"))
        conn.commit()
        print("Employee salary columns migrated successfully!")

if __name__ == "__main__":
    migrate()

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


BASE_DIR = Path(__file__).resolve().parent.parent

# Prefer DATABASE_URL env var (e.g. Neon PostgreSQL on Vercel).
# Fall back to SQLite for local development.
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # psycopg2 requires "postgresql://" not "postgres://" (Neon may return the latter)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL)
else:
    # Local SQLite fallback
    if os.environ.get("VERCEL"):
        DATABASE_PATH = Path("/tmp/smart_blood.db")
    else:
        DATABASE_PATH = BASE_DIR / "smart_blood.db"
    sqlite_url = f"sqlite:///{DATABASE_PATH.as_posix()}"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
Base = declarative_base()


def create_tables() -> None:
    from app.auth import User, hash_password
    from models.profile import Profile  # noqa: F401
    from models.emergency import EmergencyRequest  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # Seed default admin user
    db = SessionLocal()
    try:
        admin_email = "admin@blooddonation.com"
        admin_username = "admin"
        admin_password = "Admin@12345"

        existing = db.query(User).filter(
            (User.email == admin_email) | (User.username == admin_username)
        ).first()

        if not existing:
            admin = User(
                username=admin_username,
                email=admin_email,
                password_hash=hash_password(admin_password),
                role="admin",
                is_active=True,
                email_verified=True,
                token=None,
            )
            db.add(admin)
            db.commit()
    except Exception as e:
        print(f"Error seeding admin user: {e}")
        db.rollback()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

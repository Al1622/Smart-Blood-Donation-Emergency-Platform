from app.database import SessionLocal
from app.auth import User, hash_password, create_token


db = SessionLocal()

email = "admin@blooddonation.com"
username = "admin"
password = "Admin@12345"

existing = db.query(User).filter(
    (User.email == email) | (User.username == username)
).first()

if existing:
    existing.role = "admin"
    existing.is_active = True
    existing.password_hash = hash_password(password)
    existing.token = None
    db.commit()

    print("Existing account converted to ADMIN.")
else:
    admin = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role="admin",
        is_active=True,
        email_verified=True,
        token=None,
    )

    db.add(admin)
    db.commit()

    print("ADMIN ACCOUNT CREATED.")

print("Email:", email)
print("Username:", username)
print("Password:", password)

db.close()
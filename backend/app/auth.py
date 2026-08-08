import json
import secrets
from datetime import datetime, timezone
from typing import Optional

from argon2 import PasswordHasher
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import Column, DateTime, Integer, String, Boolean
from sqlalchemy.orm import Session

from app.database import Base, get_db

security = HTTPBearer(auto_error=False)
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32, salt_len=16)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")
    is_active = Column(Boolean, nullable=False, default=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    token = Column(String(255), unique=True, nullable=True, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "email_verified": self.email_verified,
        }


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False

    try:
        return ph.verify(password_hash, password)
    except Exception:
        return False


def create_token() -> str:
    return secrets.token_urlsafe(32)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = db.query(User).filter(User.token == credentials.credentials).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    return user


def require_admin(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
):
    if credentials is None:
        return None

    user = db.query(User).filter(User.token == credentials.credentials).first()

    if user is None or not user.is_active:
        return None

    return user


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    actor_user_id = Column(Integer, nullable=False)
    action = Column(String(80), nullable=False, index=True)
    target_type = Column(String(40), nullable=True)
    target_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    details = Column(String(500), nullable=True)


def log_audit(db: Session, action: str, actor_user_id: int, target_type: str | None = None, target_id: int | None = None, metadata: dict | None = None):
    safe_metadata = {}

    if metadata:
        for key, value in metadata.items():
            if key in {"password", "password_hash", "token", "nid_number", "nid_document_contents", "nid_document_reference"}:
                continue
            if isinstance(value, (dict, list)):
                safe_metadata[key] = value
            else:
                safe_metadata[key] = value

    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=json.dumps(safe_metadata or {}, ensure_ascii=False),
        )
    )

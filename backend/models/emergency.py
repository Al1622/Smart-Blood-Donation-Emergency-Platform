from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, ForeignKey

from app.database import Base

VALID_URGENCY_LEVELS = {"HIGH", "MEDIUM", "LOW"}


class EmergencyRequest(Base):
    __tablename__ = "emergency_requests"

    id = Column(Integer, primary_key=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    blood_group = Column(String(3), nullable=False)
    location = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    contact = Column(String(120), nullable=False)
    urgency = Column(String(10), nullable=False, default="HIGH")

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "created_by": self.created_by,
            "blood_group": self.blood_group,
            "location": self.location,
            "description": self.description,
            "contact": self.contact,
            "urgency": self.urgency,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

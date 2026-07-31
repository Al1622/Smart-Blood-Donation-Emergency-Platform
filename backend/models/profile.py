from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String

from app.database import Base

VALID_BLOOD_GROUPS = {
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
}


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True)

    full_name = Column(
        String(120),
        nullable=False,
    )

    email = Column(
        String(120),
        unique=True,
        nullable=False,
        index=True,
    )

    phone = Column(
        String(20),
        nullable=False,
    )

    blood_group = Column(
        String(3),
        nullable=False,
    )

    address = Column(
        String(255),
        nullable=False,
    )

    date_of_birth = Column(
        Date,
        nullable=True,
    )

    last_donation_date = Column(
        Date,
        nullable=True,
    )

    is_available = Column(
        Boolean,
        nullable=False,
        default=True,
    )

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
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "blood_group": self.blood_group,
            "address": self.address,
            "date_of_birth": (
                self.date_of_birth.isoformat()
                if self.date_of_birth
                else None
            ),
            "last_donation_date": (
                self.last_donation_date.isoformat()
                if self.last_donation_date
                else None
            ),
            "is_available": self.is_available,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            ),
        }
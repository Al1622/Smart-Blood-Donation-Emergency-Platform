from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

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
    __table_args__ = (UniqueConstraint("user_id", name="uq_profiles_user_id"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

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

    location = Column(String(120), nullable=True)
    gender = Column(String(20), nullable=True)
    nid_number = Column(String(40), nullable=True)
    nid_document_reference = Column(String(255), nullable=True)
    verification_status = Column(String(20), nullable=False, default="PENDING")
    rejection_reason = Column(String(255), nullable=True)
    verified_by = Column(Integer, nullable=True)
    verified_at = Column(DateTime, nullable=True)

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

    def to_public_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "blood_group": self.blood_group,
            "address": self.address,
            "location": self.location,
            "gender": self.gender,
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
            "verification_status": self.verification_status,
            "rejection_reason": self.rejection_reason,
            "verified_by": self.verified_by,
            "verified_at": (
                self.verified_at.isoformat()
                if self.verified_at
                else None
            ),
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

    def to_dict(self):
        data = self.to_public_dict()
        data.update({
            "nid_number": self.nid_number,
            "nid_document_reference": self.nid_document_reference,
        })
        return data
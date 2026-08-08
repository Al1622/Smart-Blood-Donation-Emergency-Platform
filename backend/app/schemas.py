from typing import Optional

from pydantic import BaseModel


class ProfileCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    blood_group: str
    address: str
    location: Optional[str] = None
    gender: Optional[str] = None
    nid_number: Optional[str] = None
    nid_document_reference: Optional[str] = None
    date_of_birth: Optional[str] = None
    last_donation_date: Optional[str] = None
    is_available: bool = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None
    gender: Optional[str] = None
    nid_number: Optional[str] = None
    nid_document_reference: Optional[str] = None
    date_of_birth: Optional[str] = None
    last_donation_date: Optional[str] = None
    is_available: Optional[bool] = None
    verification_status: Optional[str] = None

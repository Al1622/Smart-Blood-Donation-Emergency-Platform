from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ProfileCreate, ProfileUpdate
from models.profile import Profile, VALID_BLOOD_GROUPS

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


def parse_date(value):
    if value in (None, ""):
        return None

    return date.fromisoformat(value)


def validate_profile(data, creating=False):
    errors = {}

    required_fields = [
        "full_name",
        "email",
        "phone",
        "blood_group",
        "address",
    ]

    if creating:
        for field in required_fields:
            if not str(data.get(field, "")).strip():
                errors[field] = f"{field} is required."

    if "blood_group" in data:
        blood_group = str(data["blood_group"]).upper().strip()

        if blood_group not in VALID_BLOOD_GROUPS:
            errors["blood_group"] = "Invalid blood group."

    if "is_available" in data and not isinstance(data["is_available"], bool):
        errors["is_available"] = "is_available must be true or false."

    for field in ["date_of_birth", "last_donation_date"]:
        if field in data:
            try:
                parse_date(data[field])
            except (TypeError, ValueError):
                errors[field] = f"{field} must use YYYY-MM-DD format."

    return errors


def validation_error_response(errors):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation failed.",
            "errors": errors,
        },
    )


def normalize_payload(payload):
    if payload is None:
        return {}

    data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    normalized = {}

    for key, value in data.items():
        if value is None:
            continue

        if isinstance(value, str):
            if key in {"email"}:
                normalized[key] = value.lower().strip()
            elif key in {"blood_group"}:
                normalized[key] = value.upper().strip()
            else:
                normalized[key] = value.strip()
        else:
            normalized[key] = value

    return normalized


@router.get("")
def get_all_profiles(db: Session = Depends(get_db)):
    profiles = db.query(Profile).order_by(Profile.id.desc()).all()

    return {
        "success": True,
        "count": len(profiles),
        "data": [profile.to_dict() for profile in profiles],
    }


@router.post("", status_code=201)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    data = normalize_payload(payload)
    errors = validate_profile(data, creating=True)

    if errors:
        return validation_error_response(errors)

    profile = Profile(
        full_name=str(data["full_name"]).strip(),
        email=str(data["email"]).lower().strip(),
        phone=str(data["phone"]).strip(),
        blood_group=str(data["blood_group"]).upper().strip(),
        address=str(data["address"]).strip(),
        date_of_birth=parse_date(data.get("date_of_birth")),
        last_donation_date=parse_date(data.get("last_donation_date")),
        is_available=data.get("is_available", True),
    )

    try:
        db.add(profile)
        db.commit()
        db.refresh(profile)
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "message": "This email already exists.",
            },
        )

    return JSONResponse(
        status_code=201,
        content={
            "success": True,
            "message": "Profile created successfully.",
            "data": profile.to_dict(),
        },
    )


@router.get("/{profile_id}")
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.get(Profile, profile_id)

    if profile is None:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message": "Profile not found.",
            },
        )

    return {
        "success": True,
        "data": profile.to_dict(),
    }


@router.put("/{profile_id}")
@router.patch("/{profile_id}")
def update_profile(
    profile_id: int,
    payload: ProfileUpdate | None = None,
    db: Session = Depends(get_db),
):
    profile = db.get(Profile, profile_id)

    if profile is None:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message": "Profile not found.",
            },
        )

    data = normalize_payload(payload) if payload else {}
    errors = validate_profile(data)

    if errors:
        return validation_error_response(errors)

    if "full_name" in data:
        profile.full_name = str(data["full_name"]).strip()

    if "email" in data:
        profile.email = str(data["email"]).lower().strip()

    if "phone" in data:
        profile.phone = str(data["phone"]).strip()

    if "blood_group" in data:
        profile.blood_group = str(data["blood_group"]).upper().strip()

    if "address" in data:
        profile.address = str(data["address"]).strip()

    if "date_of_birth" in data:
        profile.date_of_birth = parse_date(data["date_of_birth"])

    if "last_donation_date" in data:
        profile.last_donation_date = parse_date(data["last_donation_date"])

    if "is_available" in data:
        profile.is_available = data["is_available"]

    try:
        db.commit()
        db.refresh(profile)
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "message": "This email already exists.",
            },
        )

    return {
        "success": True,
        "message": "Profile updated successfully.",
        "data": profile.to_dict(),
    }


@router.delete("/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.get(Profile, profile_id)

    if profile is None:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message": "Profile not found.",
            },
        )

    db.delete(profile)
    db.commit()

    return {
        "success": True,
        "message": "Profile deleted successfully.",
    }

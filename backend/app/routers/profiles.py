from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import User, get_current_user, get_optional_current_user, log_audit, require_admin
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
def get_all_profiles(db: Session = Depends(get_db), current_user: User | None = Depends(get_optional_current_user)):
    if current_user is None:
        return JSONResponse(
            status_code=401,
            content={
                "success": False,
                "message": "Authentication required",
            },
        )

    profiles = db.query(Profile).order_by(Profile.id.desc()).all()

    if current_user.role == "admin":
        data = [profile.to_dict() for profile in profiles]
    else:
        data = [profile.to_public_dict() for profile in profiles]

    return {
        "success": True,
        "count": len(profiles),
        "data": data,
    }


@router.post("", status_code=201)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = normalize_payload(payload)
    errors = validate_profile(data, creating=True)

    if errors:
        return validation_error_response(errors)

    if current_user.role != "admin" and "verification_status" in data:
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "message": "You cannot set verification status.",
            },
        )

    existing_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if existing_profile is not None:
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "message": "You already have a donor profile.",
            },
        )

    profile = Profile(
        user_id=current_user.id,
        full_name=str(data["full_name"]).strip(),
        email=str(data["email"]).lower().strip(),
        phone=str(data["phone"]).strip(),
        blood_group=str(data["blood_group"]).upper().strip(),
        address=str(data["address"]).strip(),
        location=data.get("location"),
        gender=data.get("gender"),
        nid_number=data.get("nid_number"),
        nid_document_reference=data.get("nid_document_reference"),
        date_of_birth=parse_date(data.get("date_of_birth")),
        last_donation_date=parse_date(data.get("last_donation_date")),
        is_available=data.get("is_available", True),
        verification_status="APPROVED" if current_user.role == "admin" else "PENDING",
        verified_by=current_user.id if current_user.role == "admin" else None,
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

    log_audit(db, action="PROFILE_CREATED", actor_user_id=current_user.id, target_type="donor_profile", target_id=profile.id, metadata={"status": profile.verification_status})
    db.commit()

    return JSONResponse(
        status_code=201,
        content={
            "success": True,
            "message": "Your donor profile has been submitted and is awaiting admin verification.",
            "data": profile.to_public_dict(),
        },
    )


@router.get("/me")
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if profile is None:
        return {
            "success": True,
            "data": None,
        }
    return {
        "success": True,
        "data": profile.to_dict(),
    }


@router.get("/{profile_id}")
def get_profile(profile_id: int, db: Session = Depends(get_db), current_user: User | None = Depends(get_optional_current_user)):
    profile = db.get(Profile, profile_id)

    if profile is None:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message": "Profile not found.",
            },
        )

    if current_user is None:
        return JSONResponse(
            status_code=401,
            content={
                "success": False,
                "message": "Authentication required",
            },
        )

    if current_user.role != "admin" and profile.user_id != current_user.id:
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "message": "Access denied.",
            },
        )

    if current_user.role == "admin" or profile.user_id == current_user.id:
        payload = profile.to_dict()
    else:
        payload = profile.to_public_dict()

    return {
        "success": True,
        "data": payload,
    }


@router.put("/{profile_id}")
@router.patch("/{profile_id}")
def update_profile(
    profile_id: int,
    payload: ProfileUpdate | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

    if profile.user_id != current_user.id and current_user.role != "admin":
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "message": "You can only manage your own profile.",
            },
        )

    data = normalize_payload(payload) if payload else {}
    errors = validate_profile(data)

    if errors:
        return validation_error_response(errors)

    if current_user.role != "admin" and "verification_status" in data:
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "message": "Verification status cannot be changed from the frontend.",
            },
        )

    if current_user.role != "admin" and any(field in data for field in ["full_name", "date_of_birth", "nid_number", "nid_document_reference", "address", "location", "gender"]):
        profile.verification_status = "PENDING"
        profile.rejection_reason = None
        profile.verified_by = None
        profile.verified_at = None

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

    if "location" in data:
        profile.location = str(data["location"]).strip() or None

    if "gender" in data:
        profile.gender = str(data["gender"]).strip() or None

    if "nid_number" in data:
        profile.nid_number = str(data["nid_number"]).strip() or None

    if "nid_document_reference" in data:
        profile.nid_document_reference = str(data["nid_document_reference"]).strip() or None

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

    log_audit(db, action="PROFILE_UPDATED", actor_user_id=current_user.id, target_type="donor_profile", target_id=profile.id, metadata={"updated_by_owner": current_user.role != "admin"})
    db.commit()

    return {
        "success": True,
        "message": "Profile updated successfully.",
        "data": profile.to_public_dict(),
    }


@router.delete("/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
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

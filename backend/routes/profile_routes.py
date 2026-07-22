from datetime import date

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from models.profile import Profile, VALID_BLOOD_GROUPS


profile_bp = Blueprint(
    "profiles",
    __name__,
    url_prefix="/api/profiles",
)


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

    if (
        "is_available" in data
        and not isinstance(data["is_available"], bool)
    ):
        errors["is_available"] = (
            "is_available must be true or false."
        )

    for field in ["date_of_birth", "last_donation_date"]:
        if field in data:
            try:
                parse_date(data[field])
            except (TypeError, ValueError):
                errors[field] = (
                    f"{field} must use YYYY-MM-DD format."
                )

    return errors


@profile_bp.get("")
def get_all_profiles():
    profiles = Profile.query.order_by(Profile.id.desc()).all()

    return jsonify(
        {
            "success": True,
            "count": len(profiles),
            "data": [profile.to_dict() for profile in profiles],
        }
    ), 200


@profile_bp.post("")
def create_profile():
    data = request.get_json(silent=True) or {}
    errors = validate_profile(data, creating=True)

    if errors:
        return jsonify(
            {
                "success": False,
                "message": "Validation failed.",
                "errors": errors,
            }
        ), 422

    profile = Profile(
        full_name=str(data["full_name"]).strip(),
        email=str(data["email"]).lower().strip(),
        phone=str(data["phone"]).strip(),
        blood_group=str(data["blood_group"]).upper().strip(),
        address=str(data["address"]).strip(),
        date_of_birth=parse_date(data.get("date_of_birth")),
        last_donation_date=parse_date(
            data.get("last_donation_date")
        ),
        is_available=data.get("is_available", True),
    )

    try:
        db.session.add(profile)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()

        return jsonify(
            {
                "success": False,
                "message": "This email already exists.",
            }
        ), 409

    return jsonify(
        {
            "success": True,
            "message": "Profile created successfully.",
            "data": profile.to_dict(),
        }
    ), 201


@profile_bp.get("/<int:profile_id>")
def get_profile(profile_id):
    profile = db.session.get(Profile, profile_id)

    if profile is None:
        return jsonify(
            {
                "success": False,
                "message": "Profile not found.",
            }
        ), 404

    return jsonify(
        {
            "success": True,
            "data": profile.to_dict(),
        }
    ), 200


@profile_bp.route(
    "/<int:profile_id>",
    methods=["PUT", "PATCH"],
)
def update_profile(profile_id):
    profile = db.session.get(Profile, profile_id)

    if profile is None:
        return jsonify(
            {
                "success": False,
                "message": "Profile not found.",
            }
        ), 404

    data = request.get_json(silent=True) or {}
    errors = validate_profile(data)

    if errors:
        return jsonify(
            {
                "success": False,
                "message": "Validation failed.",
                "errors": errors,
            }
        ), 422

    if "full_name" in data:
        profile.full_name = str(data["full_name"]).strip()

    if "email" in data:
        profile.email = str(data["email"]).lower().strip()

    if "phone" in data:
        profile.phone = str(data["phone"]).strip()

    if "blood_group" in data:
        profile.blood_group = (
            str(data["blood_group"]).upper().strip()
        )

    if "address" in data:
        profile.address = str(data["address"]).strip()

    if "date_of_birth" in data:
        profile.date_of_birth = parse_date(
            data["date_of_birth"]
        )

    if "last_donation_date" in data:
        profile.last_donation_date = parse_date(
            data["last_donation_date"]
        )

    if "is_available" in data:
        profile.is_available = data["is_available"]

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()

        return jsonify(
            {
                "success": False,
                "message": "This email already exists.",
            }
        ), 409

    return jsonify(
        {
            "success": True,
            "message": "Profile updated successfully.",
            "data": profile.to_dict(),
        }
    ), 200


@profile_bp.delete("/<int:profile_id>")
def delete_profile(profile_id):
    profile = db.session.get(Profile, profile_id)

    if profile is None:
        return jsonify(
            {
                "success": False,
                "message": "Profile not found.",
            }
        ), 404

    db.session.delete(profile)
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "message": "Profile deleted successfully.",
        }
    ), 200
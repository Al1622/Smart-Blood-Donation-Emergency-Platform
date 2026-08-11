from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth import User, get_current_user, log_audit, require_admin
from app.database import get_db
from models.emergency import EmergencyRequest, VALID_URGENCY_LEVELS
from models.profile import VALID_BLOOD_GROUPS

router = APIRouter(prefix="/api/emergency", tags=["emergency"])


@router.get("")
def list_emergency_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    requests = (
        db.query(EmergencyRequest)
        .filter(EmergencyRequest.is_active == True)  # noqa: E712
        .order_by(EmergencyRequest.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "count": len(requests),
        "data": [r.to_dict() for r in requests],
    }


@router.post("", status_code=201)
def create_emergency_request(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    blood_group = str(payload.get("blood_group", "")).upper().strip()
    location = str(payload.get("location", "")).strip()
    contact = str(payload.get("contact", "")).strip()
    description = str(payload.get("description", "")).strip() or None
    urgency = str(payload.get("urgency", "HIGH")).upper().strip()

    errors = {}

    if not blood_group:
        errors["blood_group"] = "Blood group is required."
    elif blood_group not in VALID_BLOOD_GROUPS:
        errors["blood_group"] = "Invalid blood group."

    if not location:
        errors["location"] = "Location is required."

    if not contact:
        errors["contact"] = "Contact information is required."

    if urgency not in VALID_URGENCY_LEVELS:
        errors["urgency"] = "Urgency must be HIGH, MEDIUM, or LOW."

    if errors:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": "Validation failed.",
                "errors": errors,
            },
        )

    emergency = EmergencyRequest(
        created_by=current_user.id,
        blood_group=blood_group,
        location=location,
        contact=contact,
        description=description,
        urgency=urgency,
    )

    db.add(emergency)
    db.commit()
    db.refresh(emergency)

    log_audit(
        db,
        action="EMERGENCY_REQUEST_CREATED",
        actor_user_id=current_user.id,
        target_type="emergency_request",
        target_id=emergency.id,
        metadata={"blood_group": blood_group, "urgency": urgency},
    )
    db.commit()

    return JSONResponse(
        status_code=201,
        content={
            "success": True,
            "message": "Emergency request posted successfully.",
            "data": emergency.to_dict(),
        },
    )


@router.delete("/{request_id}")
def close_emergency_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emergency = db.get(EmergencyRequest, request_id)

    if emergency is None:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Emergency request not found."},
        )

    if emergency.created_by != current_user.id and current_user.role != "admin":
        return JSONResponse(
            status_code=403,
            content={"success": False, "message": "Access denied."},
        )

    emergency.is_active = False
    db.commit()

    log_audit(
        db,
        action="EMERGENCY_REQUEST_CLOSED",
        actor_user_id=current_user.id,
        target_type="emergency_request",
        target_id=emergency.id,
    )
    db.commit()

    return {
        "success": True,
        "message": "Emergency request closed.",
    }


@router.get("/all")
def list_all_emergency_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: list all requests including closed ones."""
    requests = (
        db.query(EmergencyRequest)
        .order_by(EmergencyRequest.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "count": len(requests),
        "data": [r.to_dict() for r in requests],
    }

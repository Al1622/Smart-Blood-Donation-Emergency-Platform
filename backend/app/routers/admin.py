from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import AuditLog, User, log_audit, require_admin
from app.database import get_db
from models.profile import Profile

router = APIRouter(prefix="/api/admin", tags=["admin"])


def build_admin_profile_payload(profile: Profile):
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "full_name": profile.full_name,
        "email": profile.email,
        "phone": profile.phone,
        "blood_group": profile.blood_group,
        "address": profile.address,
        "location": profile.location,
        "gender": profile.gender,
        "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None,
        "last_donation_date": profile.last_donation_date.isoformat() if profile.last_donation_date else None,
        "is_available": profile.is_available,
        "verification_status": profile.verification_status,
        "rejection_reason": profile.rejection_reason,
        "nid_number": profile.nid_number,
        "nid_document_reference": profile.nid_document_reference,
        "verified_by": profile.verified_by,
        "verified_at": profile.verified_at.isoformat() if profile.verified_at else None,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


@router.get("/profiles/pending")
def pending_requests(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    profiles = db.query(Profile).filter(Profile.verification_status == "PENDING").order_by(Profile.created_at.desc()).all()

    return {
        "success": True,
        "count": len(profiles),
        "data": [profile.to_public_dict() for profile in profiles],
    }


@router.get("/profiles/{profile_id}")
def review_profile(profile_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    profile = db.get(Profile, profile_id)

    if profile is None:
        return {
            "success": False,
            "message": "Profile not found.",
        }

    return {
        "success": True,
        "data": build_admin_profile_payload(profile),
    }


@router.post("/profiles/{profile_id}/approve")
def approve_profile(profile_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    profile = db.get(Profile, profile_id)

    if profile is None:
        return {"success": False, "message": "Profile not found."}

    if profile.verification_status != "PENDING":
        return {"success": False, "message": "Only pending profiles can be approved."}

    profile.verification_status = "APPROVED"
    profile.verified_by = current_user.id
    profile.verified_at = datetime.now(timezone.utc)
    profile.rejection_reason = None
    log_audit(db, action="PROFILE_APPROVED", actor_user_id=current_user.id, target_type="donor_profile", target_id=profile.id, metadata={"status": "APPROVED"})
    db.commit()

    return {
        "success": True,
        "message": "Profile approved successfully.",
        "data": profile.to_public_dict(),
    }


@router.post("/profiles/{profile_id}/reject")
def reject_profile(profile_id: int, payload: dict | None = None, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    profile = db.get(Profile, profile_id)

    if profile is None:
        return {"success": False, "message": "Profile not found."}

    if profile.user_id == current_user.id:
        return {"success": False, "message": "You cannot reject your own profile."}

    if profile.verification_status != "PENDING":
        return {"success": False, "message": "Only pending profiles can be rejected."}

    reason = None
    if payload:
        reason = str(payload.get("reason") or "Identity verification could not be confirmed.").strip() or None

    profile.verification_status = "REJECTED"
    profile.rejection_reason = reason
    profile.verified_by = None
    profile.verified_at = None
    log_audit(db, action="PROFILE_REJECTED", actor_user_id=current_user.id, target_type="donor_profile", target_id=profile.id, metadata={"reason": reason or "No reason provided"})
    db.commit()

    return {
        "success": True,
        "message": "Profile rejected successfully.",
        "data": profile.to_public_dict(),
    }


@router.post("/profiles/{profile_id}/suspend")
def suspend_profile(profile_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    profile = db.get(Profile, profile_id)

    if profile is None:
        return {"success": False, "message": "Profile not found."}

    profile.verification_status = "SUSPENDED"
    log_audit(db, action="PROFILE_SUSPENDED", actor_user_id=current_user.id, target_type="donor_profile", target_id=profile.id)
    db.commit()

    return {
        "success": True,
        "message": "Profile suspended successfully.",
        "data": profile.to_public_dict(),
    }


@router.post("/users/{user_id}/deactivate")
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.get(User, user_id)

    if user is None:
        return {"success": False, "message": "User not found."}

    user.is_active = False
    user.token = None
    log_audit(db, action="ACCOUNT_DEACTIVATED", actor_user_id=current_user.id, target_type="user", target_id=user.id)
    db.commit()

    return {
        "success": True,
        "message": "User deactivated successfully.",
    }


@router.post("/users/{user_id}/reactivate")
def reactivate_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.get(User, user_id)

    if user is None:
        return {"success": False, "message": "User not found."}

    user.is_active = True
    log_audit(db, action="ACCOUNT_REACTIVATED", actor_user_id=current_user.id, target_type="user", target_id=user.id)
    db.commit()

    return {
        "success": True,
        "message": "User reactivated successfully.",
    }


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    users = db.query(User).order_by(User.id.desc()).offset(skip).limit(limit).all()
    total = db.query(User).count()

    return {
        "success": True,
        "total": total,
        "count": len(users),
        "data": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "email_verified": u.email_verified,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()  # noqa: E712
    total_profiles = db.query(Profile).count()
    pending_profiles = db.query(Profile).filter(Profile.verification_status == "PENDING").count()
    approved_profiles = db.query(Profile).filter(Profile.verification_status == "APPROVED").count()
    rejected_profiles = db.query(Profile).filter(Profile.verification_status == "REJECTED").count()
    suspended_profiles = db.query(Profile).filter(Profile.verification_status == "SUSPENDED").count()
    available_donors = db.query(Profile).filter(
        Profile.verification_status == "APPROVED",
        Profile.is_available == True,  # noqa: E712
    ).count()

    return {
        "success": True,
        "data": {
            "total_users": total_users,
            "active_users": active_users,
            "total_profiles": total_profiles,
            "pending_profiles": pending_profiles,
            "approved_profiles": approved_profiles,
            "rejected_profiles": rejected_profiles,
            "suspended_profiles": suspended_profiles,
            "available_donors": available_donors,
        },
    }


@router.get("/audit-logs")
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    total = db.query(AuditLog).count()

    return {
        "success": True,
        "total": total,
        "count": len(logs),
        "data": [
            {
                "id": log.id,
                "actor_user_id": log.actor_user_id,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "details": log.details,
            }
            for log in logs
        ],
    }

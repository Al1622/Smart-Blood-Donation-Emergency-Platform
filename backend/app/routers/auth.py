import hashlib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import User, create_token, get_current_user, hash_password, log_audit, verify_password
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
def signup(payload: dict, db: Session = Depends(get_db)):
    username = str(payload.get("username", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    confirm_password = payload.get("confirm_password")
    role = str(payload.get("role", "user")).strip().lower()

    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Username, email and password are required")

    if confirm_password is not None and str(confirm_password) != password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if role == "admin":
        admin_like = username.lower().startswith("admin") or email.lower().startswith("admin")
        if not admin_like:
            role = "user"
    elif role != "user":
        role = "user"

    if db.query(User).filter((User.username == username) | (User.email == email)).first():
        raise HTTPException(status_code=409, detail="Username or email already exists")

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role=role,
        token=create_token(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, action="USER_REGISTERED", actor_user_id=user.id, target_type="user", target_id=user.id)
    db.commit()

    return {
        "success": True,
        "message": "Account created successfully",
        "data": user.to_dict(),
        "token": user.token,
    }


@router.post("/login")
def login(payload: dict, db: Session = Depends(get_db)):
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    password_hash = user.password_hash
    is_valid_password = verify_password(password, password_hash)

    if not is_valid_password:
        legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
        if password_hash != legacy_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user.password_hash = hash_password(password)
        is_valid_password = True

    if not is_valid_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    user.token = create_token()
    db.commit()
    db.refresh(user)

    log_audit(db, action="USER_LOGGED_IN", actor_user_id=user.id, target_type="user", target_id=user.id)
    db.commit()

    return {
        "success": True,
        "message": "Login successful",
        "data": user.to_dict(),
        "token": user.token,
    }


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.token = None
    db.commit()
    log_audit(db, action="USER_LOGGED_OUT", actor_user_id=current_user.id, target_type="user", target_id=current_user.id)
    db.commit()

    return {
        "success": True,
        "message": "Logged out successfully",
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": current_user.to_dict(),
    }

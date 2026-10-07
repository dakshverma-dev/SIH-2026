"""RBAC. Four roles, JWT bearer, bcrypt hashes. Deliberately small -- the demo needs to prove
that a field supervisor cannot approve their own update, not to be an identity provider.

SECURITY: no credential is hardcoded here. Demo users come from scripts/seed_users.py and
their passwords are bcrypt-hashed at seed time; JWT_SECRET comes from .env.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .db import User, get_session
from .schemas import Role

_bearer = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def make_token(username: str, role: str) -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_session),
) -> User:
    if cred is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    try:
        payload = jwt.decode(cred.credentials, settings.jwt_secret,
                             algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token expired") from None
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token") from None
    user = db.get(User, payload.get("sub"))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "unknown user")
    return user


def require_role(*allowed: Role):
    """Admin passes everything; otherwise the role must be listed."""
    names = {r.value for r in allowed}

    def dep(user: User = Depends(current_user)) -> User:
        if user.role != Role.admin.value and user.role not in names:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"role '{user.role}' cannot perform this action; requires one of {sorted(names)}",
            )
        return user

    return dep


# readable shorthands used by the routes
can_submit = require_role(Role.field_supervisor, Role.planner, Role.project_manager)
can_review = require_role(Role.planner)
can_read = require_role(Role.field_supervisor, Role.planner, Role.project_manager)
can_import_schedule = require_role(Role.planner)

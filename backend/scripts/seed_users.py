"""Seed the four demo users. Passwords are bcrypt-hashed here, never stored in the repo.
Override any of them with env vars, e.g. P2R_PLANNER_PASSWORD=... before running.

    python scripts/seed_users.py
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.auth import hash_password          # noqa: E402
from app.db import SessionLocal, User, init_db   # noqa: E402
from app.schemas import Role                # noqa: E402

USERS = [
    ("supervisor", Role.field_supervisor, "Field Supervisor (demo)"),
    ("planner", Role.planner, "Planner (demo)"),
    ("manager", Role.project_manager, "Project Manager (demo)"),
    ("admin", Role.admin, "Admin (demo)"),
]


def main() -> None:
    init_db()
    db = SessionLocal()
    for username, role, full_name in USERS:
        pwd = os.environ.get(f"P2R_{username.upper()}_PASSWORD", f"{username}123")
        row = db.get(User, username)
        if row:
            row.password_hash = hash_password(pwd)
            row.role = role.value
        else:
            db.add(User(username=username, password_hash=hash_password(pwd),
                        role=role.value, full_name=full_name))
        print(f"  {username:12s} role={role.value}")
    db.commit()
    db.close()
    print("\nseeded. default password is <username>123 -- override with P2R_<USER>_PASSWORD")


if __name__ == "__main__":
    main()

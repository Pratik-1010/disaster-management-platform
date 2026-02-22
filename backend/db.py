"""
Database helper module for Disaster Response & Relief Platform.
Uses a single persistent SQLite file. No in-memory DB. Tables created IF NOT EXISTS only.
Credibility scoring: accuracy_score 0-100, is_verified, confirmation_count, request_confirmations.
"""

import sqlite3
import os
import math
from contextlib import contextmanager
from datetime import datetime, timedelta

# Absolute database path so it does not depend on runtime cwd
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "relief.db")
print("Using database at:", DB_PATH)

_db_initialized = False

# Status color mapping for UI/frontend
STATUS_COLORS = {
    "pending": "#eab308",
    "accepted": "#2563eb",
    "completed": "#16a34a",
}


def get_db():
    """Return a connection to the persistent database file. Use for all DB access."""
    return sqlite3.connect(DB_PATH, check_same_thread=False)


def get_status_color(status):
    """Return hex color for a given status. Default gray if unknown."""
    return STATUS_COLORS.get((status or "").lower(), "#6b7280")


def haversine_km(lat1, lon1, lat2, lon2):
    """Distance in km between two (lat, lon) points."""
    if None in (lat1, lon1, lat2, lon2):
        return float("inf")
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def recalculate_score(request_id):
    """
    Credibility score 0-100. Base 50. Signals: identity behavior, location consistency,
    spam timing, community confirmation. When completed: score=100, is_verified=1.
    """
    with get_connection() as conn:
        row = conn.execute(
            """SELECT id, phone, latitude, longitude, created_at, confirmation_count, status
               FROM requests WHERE id = ?""",
            (request_id,),
        ).fetchone()
        if not row:
            return
        r = dict(row)
        phone = (r.get("phone") or "").strip()
        lat, lon = r.get("latitude"), r.get("longitude")
        created_at = r.get("created_at")
        confirmation_count = int(r.get("confirmation_count") or 0)
        status = (r.get("status") or "pending").lower()

        if status == "completed":
            conn.execute(
                "UPDATE requests SET accuracy_score = 100, is_verified = 1 WHERE id = ?",
                (request_id,),
            )
            conn.commit()
            print(f"[DB] Scoring: request {request_id} completed -> accuracy_score=100, is_verified=1")
            return

        score = 50

        # A. Identity behavior: same phone in last 24 hours (from this request's created_at)
        try:
            count_24 = conn.execute(
                """SELECT COUNT(*) FROM requests WHERE phone = ? AND created_at >= datetime(?, '-24 hours')""",
                (phone, created_at or datetime.now().isoformat()),
            ).fetchone()[0]
            if count_24 == 1:
                score += 15
            elif count_24 > 3:
                score -= 20
        except Exception:
            pass

        # B. Location consistency: previous request from same phone (by created_at)
        prev = conn.execute(
            """SELECT latitude, longitude FROM requests WHERE phone = ? AND id != ? AND created_at < ?
               ORDER BY created_at DESC LIMIT 1""",
            (phone, request_id, created_at or ""),
        ).fetchone()
        if prev and lat is not None and lon is not None:
            p = dict(prev)
            dist = haversine_km(lat, lon, p.get("latitude"), p.get("longitude"))
            if dist < 2:
                score += 15
            else:
                score -= 10

        # C. Spam timing: same phone >2 other requests within 5 minutes of this request
        try:
            count_5min = conn.execute(
                """SELECT COUNT(*) FROM requests WHERE phone = ? AND id != ?
                   AND created_at <= datetime(?, '+5 minutes') AND created_at >= datetime(?, '-5 minutes')""",
                (phone, request_id, created_at or "", created_at or ""),
            ).fetchone()[0]
            if count_5min >= 2:
                score -= 25
        except Exception:
            pass

        # D. Community confirmation
        score += confirmation_count * 10

        score = max(0, min(100, score))
        conn.execute(
            "UPDATE requests SET accuracy_score = ? WHERE id = ?",
            (score, request_id),
        )
        conn.commit()
        print(f"[DB] Scoring: request {request_id} -> accuracy_score={score}")


def has_volunteer_confirmed(request_id, volunteer_id):
    """True if this volunteer already confirmed this request."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM request_confirmations WHERE request_id = ? AND volunteer_id = ?",
            (request_id, volunteer_id),
        ).fetchone()
    return row is not None


def add_confirmation(request_id, volunteer_id):
    """Insert confirmation, increment confirmation_count, recalculate score. Returns True if added."""
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT 1 FROM request_confirmations WHERE request_id = ? AND volunteer_id = ?",
            (request_id, volunteer_id),
        ).fetchone()
        if existing:
            return False
        conn.execute(
            "INSERT INTO request_confirmations (request_id, volunteer_id) VALUES (?, ?)",
            (request_id, volunteer_id),
        )
        conn.execute(
            "UPDATE requests SET confirmation_count = confirmation_count + 1 WHERE id = ?",
            (request_id,),
        )
        conn.commit()
    recalculate_score(request_id)
    return True


@contextmanager
def get_connection():
    """Context manager: get connection from get_db(), commit on success, rollback on error, then close."""
    conn = get_db()
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create tables ONLY IF NOT EXISTS. No DROP TABLE. Call once at server start."""
    global _db_initialized
    if _db_initialized:
        return
    _db_initialized = True
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                phone TEXT,
                help_type TEXT,
                description TEXT,
                latitude REAL,
                longitude REAL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        try:
            conn.execute("ALTER TABLE requests ADD COLUMN disaster_type TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE requests ADD COLUMN priority INTEGER DEFAULT 0")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE requests ADD COLUMN priority_level TEXT DEFAULT 'LOW'")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE requests ADD COLUMN assigned_volunteer_id INTEGER")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE requests ADD COLUMN assigned_organization TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        for col, spec in [
            ("phone", "TEXT DEFAULT ''"),
            ("organization", "TEXT DEFAULT ''"),
            ("is_active", "INTEGER DEFAULT 1"),
        ]:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col} {spec}")
                conn.commit()
            except sqlite3.OperationalError:
                pass
        for col, spec in [
            ("accuracy_score", "INTEGER DEFAULT 50"),
            ("is_verified", "INTEGER DEFAULT 0"),
            ("confirmation_count", "INTEGER DEFAULT 0"),
            ("duplicate_flag", "INTEGER DEFAULT 0"),
            ("accepted_at", "TIMESTAMP"),
            ("completed_at", "TIMESTAMP"),
        ]:
            try:
                conn.execute(f"ALTER TABLE requests ADD COLUMN {col} {spec}")
                conn.commit()
            except sqlite3.OperationalError:
                pass
        conn.execute("""
            CREATE TABLE IF NOT EXISTS request_confirmations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER,
                volunteer_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    print("Database initialized at:", DB_PATH)


def create_user(name, email, password_hash, role, phone="", organization=""):
    """Insert a user. Returns id. Raises on duplicate email."""
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO users (name, email, password, role, phone, organization, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name.strip(), email.strip().lower(), password_hash, role, (phone or "").strip(), (organization or "").strip(), 1 if role == "volunteer" else 1),
        )
        conn.commit()
        return cur.lastrowid


def get_user_by_email(email):
    """Return user dict including phone, organization, is_active (1/0)."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name, email, password, role, created_at, phone, organization, is_active FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    if "is_active" not in d or d["is_active"] is None:
        d["is_active"] = 1
    return d


def get_user_by_id(user_id):
    """Return user dict by id, or None."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name, email, password, role, created_at, phone, organization, is_active FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    if "is_active" not in d or d["is_active"] is None:
        d["is_active"] = 1
    return d


def get_volunteers():
    """Return ALL users where role='volunteer'. No limit."""
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT id, name, email, phone, organization, is_active, created_at
               FROM users WHERE role = 'volunteer' ORDER BY created_at DESC"""
        ).fetchall()
    return [dict(r) for r in rows]


def set_volunteer_active(user_id, is_active):
    """Set is_active (1 or 0) for a volunteer. Returns True if updated."""
    with get_connection() as conn:
        cur = conn.execute("UPDATE users SET is_active = ? WHERE id = ? AND role = 'volunteer'", (1 if is_active else 0, user_id))
        conn.commit()
        return cur.rowcount > 0


def delete_volunteer(user_id):
    """Delete a volunteer by id. Returns True if deleted."""
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM users WHERE id = ? AND role = 'volunteer'", (user_id,))
        conn.commit()
        return cur.rowcount > 0


def set_request_priority(request_id, priority):
    """Set priority for a request. Returns True if updated."""
    with get_connection() as conn:
        cur = conn.execute("UPDATE requests SET priority = ? WHERE id = ?", (int(priority), request_id))
        conn.commit()
        return cur.rowcount > 0


def delete_request(request_id):
    """Delete a request by id. Returns True if deleted."""
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM requests WHERE id = ?", (request_id,))
        conn.commit()
        return cur.rowcount > 0


def admin_exists():
    """Return True if at least one admin user exists."""
    with get_connection() as conn:
        row = conn.execute("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").fetchone()
    return row is not None


def create_request(name, phone, help_type, description=None, latitude=None, longitude=None, disaster_type=None):
    """
    Insert a new help request. Returns the new row id.
    Priority: Rescue -> HIGH, Medicine -> MEDIUM, else LOW.
    Sets credibility columns to defaults and recalculates score after insert.
    """
    dt = (disaster_type or "").strip() or "Unknown"
    ht = (help_type or "").strip()
    if ht == "Rescue":
        priority = "HIGH"
    elif ht == "Medicine":
        priority = "MEDIUM"
    else:
        priority = "LOW"
    with get_connection() as conn:
        print("[DB] create_request: before INSERT INTO requests")
        cur = conn.execute(
            """
            INSERT INTO requests (name, phone, help_type, disaster_type, description, latitude, longitude, status,
                accuracy_score, is_verified, confirmation_count, duplicate_flag, priority_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 50, 0, 0, 0, ?)
            """,
            (name, phone, help_type, dt, description or "", latitude, longitude, priority),
        )
        conn.commit()
        row_id = cur.lastrowid
        print(f"[DB] create_request: after commit, row_id={row_id}")
    recalculate_score(row_id)
    print(f"[DB] Created request id={row_id} type={help_type} disaster_type={dt} priority={priority} status=pending")
    return row_id


def get_all_requests():
    """Return all requests as list of dicts with timestamps and credibility fields."""
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT
                r.*,
                u.name AS volunteer_name
            FROM requests r
            LEFT JOIN users u
            ON r.assigned_volunteer_id = u.id
            ORDER BY r.created_at DESC
        """).fetchall()
    return [row_to_dict(r) for r in rows]


def get_requests_by_status(status):
    """Return requests filtered by status (pending, accepted, completed)."""
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT
                r.*,
                u.name AS volunteer_name
            FROM requests r
            LEFT JOIN users u
            ON r.assigned_volunteer_id = u.id
            WHERE r.status = ?
            ORDER BY r.created_at DESC
        """, (status.lower(),)).fetchall()
    return [row_to_dict(r) for r in rows]


def get_request_by_id(request_id):
    """Return a single request by id, or None if not found."""
    with get_connection() as conn:
        row = conn.execute("""
            SELECT
                r.*,
                u.name AS volunteer_name
            FROM requests r
            LEFT JOIN users u
            ON r.assigned_volunteer_id = u.id
            WHERE r.id = ?
        """, (request_id,)).fetchone()
    return row_to_dict(row) if row else None


def set_request_status(request_id, new_status):
    """
    Update status of a request. Sets accepted_at on accept, completed_at and is_verified/accuracy_score on complete.
    Returns True if a row was updated, False otherwise.
    """
    new_status = new_status.lower()
    with get_connection() as conn:
        if new_status == "accepted":
            cur = conn.execute(
                "UPDATE requests SET status = ?, accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP) WHERE id = ?",
                (new_status, request_id),
            )
        elif new_status == "completed":
            cur = conn.execute(
                "UPDATE requests SET status = ?, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP), is_verified = 1, accuracy_score = 100 WHERE id = ?",
                (new_status, request_id),
            )
        else:
            cur = conn.execute(
                "UPDATE requests SET status = ? WHERE id = ?",
                (new_status, request_id),
            )
        conn.commit()
        updated = cur.rowcount
    if updated:
        print(f"[DB] Request id={request_id} status -> {new_status}")
    return updated > 0


def accept_request_with_volunteer(request_id, volunteer_id, organization):
    """
    Set request as accepted and assign volunteer. Returns updated request dict or None if not found.
    """
    org = (organization or "").strip() or None
    with get_connection() as conn:
        cur = conn.execute(
            """UPDATE requests
               SET assigned_volunteer_id = ?, assigned_organization = ?, status = 'accepted',
                   accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP)
               WHERE id = ?""",
            (volunteer_id, org, request_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            return None
    return get_request_by_id(request_id)


def get_stats():
    """Return counts: total_requests, pending, accepted, completed."""
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM requests").fetchone()[0]
        pending = conn.execute("SELECT COUNT(*) FROM requests WHERE status = 'pending'").fetchone()[0]
        accepted = conn.execute("SELECT COUNT(*) FROM requests WHERE status = 'accepted'").fetchone()[0]
        completed = conn.execute("SELECT COUNT(*) FROM requests WHERE status = 'completed'").fetchone()[0]
    return {
        "total_requests": total,
        "pending": pending,
        "accepted": accepted,
        "completed": completed,
    }


def row_to_dict(row):
    """Convert sqlite3.Row to dict with snake_case keys and ISO timestamp."""
    if row is None:
        return None
    d = dict(row)
    for ts in ("created_at", "accepted_at", "completed_at"):
        if ts in d and d[ts]:
            d[ts] = str(d[ts])
    if d.get("disaster_type") is None or (isinstance(d.get("disaster_type"), str) and not d["disaster_type"].strip()):
        d["disaster_type"] = "Unknown"
    return d

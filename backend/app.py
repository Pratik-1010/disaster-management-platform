"""
Disaster Response & Relief Coordination Platform - Flask REST API.
Run with: python app.py
Server: http://localhost:5000
"""

import logging
import traceback
from functools import wraps
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

import db

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
app.secret_key = "super-secret-key-change-this"
app.config.update({
    "SESSION_COOKIE_HTTPONLY": True,
    "SESSION_COOKIE_SAMESITE": "Lax",
    "SESSION_COOKIE_SECURE": False
})

CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:5173"]
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def log(msg):
    print(f"[API] {msg}")
    logger.info(msg)


# ---------------------------------------------------------------------------
# Auth decorators
# ---------------------------------------------------------------------------

def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"success": False, "message": "Login required"}), 401
        if session.get("role") == "volunteer" and not session.get("is_active", 1):
            return jsonify({"success": False, "message": "Your volunteer account is currently disabled by admin."}), 403
        return f(*args, **kwargs)
    return wrapped


def admin_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"success": False, "message": "Login required"}), 401
        if session.get("role") != "admin":
            return jsonify({"success": False, "message": "Admin access required"}), 403
        return f(*args, **kwargs)
    return wrapped


def volunteer_required(f):
    """Only volunteers can confirm requests; blocked volunteers already rejected by login_required."""
    @wraps(f)
    def wrapped(*args, **kwargs):
        if session.get("role") != "volunteer":
            return jsonify({"success": False, "message": "Volunteer access required"}), 403
        return f(*args, **kwargs)
    return wrapped


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_HELP_TYPES = {"Food", "Medicine", "Rescue", "Shelter"}


def request_to_api_format(row):
    if not row:
        return None
    disaster_type = row.get("disaster_type") or "Unknown"
    priority = row.get("priority_level") or row.get("priority") or "LOW"
    if priority not in ("HIGH", "MEDIUM", "LOW"):
        priority = "LOW"
    out = {
        "id": row.get("id"),
        "name": row.get("name"),
        "fullName": row.get("name"),
        "phone": row.get("phone"),
        "phoneNumber": row.get("phone"),
        "help_type": row.get("help_type"),
        "helpType": row.get("help_type"),
        "disaster_type": disaster_type,
        "disasterType": disaster_type,
        "description": row.get("description"),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "status": row.get("status") or "pending",
        "priority": priority,
        "created_at": row.get("created_at"),
        "createdAt": row.get("created_at"),
        "status_color": db.get_status_color(row.get("status")),
        "accuracy_score": row.get("accuracy_score", 50),
        "accuracyScore": row.get("accuracy_score", 50),
        "is_verified": row.get("is_verified", 0),
        "isVerified": row.get("is_verified", 0),
        "confirmation_count": row.get("confirmation_count", 0),
        "confirmationCount": row.get("confirmation_count", 0),
        "accepted_at": row.get("accepted_at"),
        "acceptedAt": row.get("accepted_at"),
        "completed_at": row.get("completed_at"),
        "completedAt": row.get("completed_at"),
        "assigned_volunteer_id": row.get("assigned_volunteer_id"),
        "assigned_organization": row.get("assigned_organization") or None,
        "volunteer_name": row.get("volunteer_name") or None,
    }
    return out


# ---------------------------------------------------------------------------
# Auth routes (public)
# ---------------------------------------------------------------------------

@app.route("/api/register", methods=["POST"])
def register():
    """Volunteer registration. Role = volunteer only. Requires phone, organization; is_solo -> organization = Independent."""
    print("===== REGISTER PAYLOAD =====")
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"message": "Invalid JSON"}), 400
    print(data)
    print("============================")
    log("POST /api/register")
    data = data or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    phone = (data.get("phone") or "").strip()
    organization = (data.get("organization") or "").strip()
    is_solo = data.get("is_solo") in (True, "true", 1)

    if is_solo:
        organization = "Independent"
    if not name:
        return jsonify({"message": "name is required"}), 400
    if not email:
        return jsonify({"message": "email is required"}), 400
    if not password:
        return jsonify({"message": "password is required"}), 400
    if not phone:
        return jsonify({"message": "phone is required"}), 400
    if not organization:
        return jsonify({"message": "organization is required"}), 400

    if db.get_user_by_email(email):
        return jsonify({"message": "Email already registered"}), 400

    try:
        pw_hash = generate_password_hash(password)
        role = "volunteer"
        db.create_user(name, email, pw_hash, role, phone=phone, organization=organization)
        print("Volunteer registered:", name)
        log(f"Registered volunteer: {email}")
        return jsonify({"message": "Registration successful"}), 201
    except Exception as e:
        log(f"Register error: {e}")
        return jsonify({"message": "Registration failed"}), 500


@app.route("/api/login", methods=["POST"])
def login():
    """Login: verify email + password with check_password_hash. Return 401 if invalid, 403 if disabled."""
    log("POST /api/login")
    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    user = db.get_user_by_email(email)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    is_active = user.get("is_active", 1)
    if is_active == 0:
        return jsonify({"error": "Account disabled by admin"}), 403

    session["user_id"] = user["id"]
    session["role"] = user["role"]
    session["name"] = user["name"]
    session["is_active"] = is_active
    print("User logged in:", user["name"])
    log(f"Login: {email} role={user['role']}")
    return jsonify({
        "message": "Login successful",
        "role": user["role"],
        "name": user["name"],
    })


@app.route("/api/logout", methods=["POST"])
def logout():
    """Clear session."""
    session.clear()
    return jsonify({"message": "Logged out"})


# ---------------------------------------------------------------------------
# Public routes (no auth)
# ---------------------------------------------------------------------------

def _valid_gps(lat, lon):
    """Return True if both are valid numbers in valid range."""
    try:
        la = float(lat) if lat is not None else None
        lo = float(lon) if lon is not None else None
    except (TypeError, ValueError):
        return False
    if la is None or lo is None:
        return False
    return -90 <= la <= 90 and -180 <= lo <= 180


@app.route("/api/request", methods=["POST"])
def create_help_request():
    """Create help request. Public. Validation: phone, disaster_type, help_type, valid GPS, description length >= 15."""
    print("===== RECEIVED PAYLOAD =====")
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"success": False, "message": "Invalid JSON"}), 400
    print(data)
    print("============================")
    print("[API] POST /api/request - route entered")
    log("POST /api/request - create help request")
    data = data or {}

    if data.get("latitude") is None or data.get("longitude") is None:
        return jsonify({"success": False, "message": "Location is required"}), 400

    name = (data.get("name") or data.get("fullName") or "Anonymous").strip() or "Anonymous"
    phone = (data.get("phone") or data.get("phoneNumber") or "Not provided").strip() or "Not provided"
    help_type = (data.get("help_type") or data.get("helpType") or "Rescue").strip() or "Rescue"
    disaster_type = (data.get("disaster_type") or data.get("disasterType") or "Unknown").strip() or "Unknown"
    description = (data.get("description") or "").strip()
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not _valid_gps(latitude, longitude):
        return jsonify({"success": False, "message": "Location is required"}), 400

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Validation error"}), 400

    try:
        request_id = db.create_request(
            name=name,
            phone=phone,
            help_type=help_type,
            disaster_type=disaster_type,
            description=description or None,
            latitude=lat,
            longitude=lon,
        )
        log(f"Request created id={request_id}")
        return jsonify({"success": True, "data": {"message": "Request created successfully", "id": request_id}}), 201
    except Exception as e:
        print(f"[API] create_help_request exception: {e!r}")
        traceback.print_exc()
        log(f"Error creating request: {e}")
        return jsonify({"success": False, "message": "Failed to create request"}), 500


@app.route("/api/requests", methods=["GET"])
def get_all():
    """List all requests. Public."""
    log("GET /api/requests - list all")
    try:
        rows = db.get_all_requests()
        out = [request_to_api_format(r) for r in rows]
        return jsonify({"success": True, "data": out})
    except Exception as e:
        log(f"Error listing requests: {e}")
        return jsonify({"success": False, "message": "Failed to fetch requests"}), 500


@app.route("/api/requests/<int:request_id>", methods=["GET"])
def get_one_request(request_id):
    """Get one request. Public."""
    log(f"GET /api/requests/{request_id}")
    row = db.get_request_by_id(request_id)
    if not row:
        return jsonify({"success": False, "message": "Request not found"}), 404
    return jsonify({"success": True, "data": request_to_api_format(row)})


@app.route("/api/requests/<status>", methods=["GET"])
def get_by_status(status):
    """List by status. Public."""
    log(f"GET /api/requests/{status}")
    status_lower = status.lower()
    if status_lower not in ("pending", "accepted", "completed"):
        return jsonify({"success": False, "message": "Invalid status"}), 400
    try:
        rows = db.get_requests_by_status(status_lower)
        out = [request_to_api_format(r) for r in rows]
        return jsonify({"success": True, "data": out})
    except Exception as e:
        log(f"Error listing requests by status: {e}")
        return jsonify({"success": False, "message": "Failed to fetch requests"}), 500


# ---------------------------------------------------------------------------
# Volunteer / logged-in routes (accept, complete)
# ---------------------------------------------------------------------------

def _accept(request_id):
    volunteer_id = session.get("user_id")
    if not volunteer_id:
        return jsonify({"success": False, "message": "Login required"}), 401
    volunteer = db.get_user_by_id(volunteer_id)
    if not volunteer:
        return jsonify({"success": False, "message": "User not found"}), 404
    organization = volunteer.get("organization") or ""
    updated = db.accept_request_with_volunteer(request_id, volunteer_id, organization)
    if not updated:
        return jsonify({"success": False, "message": "Request not found"}), 404
    return jsonify({
        "success": True,
        "data": {
            "message": "Request accepted",
            "status": "accepted",
            "request": request_to_api_format(updated),
        },
    })


def _complete(request_id):
    if not db.set_request_status(request_id, "completed"):
        return jsonify({"success": False, "message": "Request not found"}), 404
    return jsonify({"success": True, "data": {"message": "Request completed", "status": "completed"}})


@app.route("/api/request/<int:request_id>/accept", methods=["PUT"])
@login_required
def accept_request_singular(request_id):
    log(f"PUT /api/request/{request_id}/accept")
    return _accept(request_id)


@app.route("/api/request/<int:request_id>/complete", methods=["PUT"])
@login_required
def complete_request_singular(request_id):
    log(f"PUT /api/request/{request_id}/complete")
    return _complete(request_id)


@app.route("/api/requests/<int:request_id>/accept", methods=["PUT", "PATCH"])
@login_required
def accept_request_plural(request_id):
    log(f"PUT/PATCH /api/requests/{request_id}/accept")
    return _accept(request_id)


@app.route("/api/requests/<int:request_id>/complete", methods=["PUT", "PATCH"])
@login_required
def complete_request_plural(request_id):
    log(f"PUT/PATCH /api/requests/{request_id}/complete")
    return _complete(request_id)


@app.route("/api/request/<int:request_id>/confirm", methods=["POST"])
@login_required
@volunteer_required
def confirm_request(request_id):
    """Volunteer confirms situation nearby. One confirmation per volunteer per request. Returns updated accuracy_score."""
    log(f"POST /api/request/{request_id}/confirm")
    row = db.get_request_by_id(request_id)
    if not row:
        return jsonify({"success": False, "message": "Request not found"}), 404
    volunteer_id = session.get("user_id")
    if db.has_volunteer_confirmed(request_id, volunteer_id):
        return jsonify({"success": False, "message": "Already confirmed"}), 400
    try:
        db.add_confirmation(request_id, volunteer_id)
        updated = db.get_request_by_id(request_id)
        score = (updated or {}).get("accuracy_score", 50)
        log(f"Request {request_id} confirmed by volunteer {volunteer_id}, new score={score}")
        return jsonify({"success": True, "data": {"accuracy_score": score}})
    except Exception as e:
        log(f"Confirm error: {e}")
        return jsonify({"success": False, "message": "Failed to confirm"}), 500


# ---------------------------------------------------------------------------
# Admin-only routes
# ---------------------------------------------------------------------------

@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def admin_stats():
    log("GET /api/admin/stats")
    try:
        raw = db.get_stats()
        stats = {
            "total_requests": raw["total_requests"],
            "pending": raw["pending"],
            "accepted": raw["accepted"],
            "completed": raw["completed"],
            "totalRequests": raw["total_requests"],
            "pendingRequests": raw["pending"],
            "activeVolunteers": raw.get("accepted", 0),
            "completedRequests": raw["completed"],
        }
        return jsonify(stats)
    except Exception as e:
        log(f"Error fetching stats: {e}")
        return jsonify({"message": "Failed to fetch stats"}), 500


@app.route("/api/admin/activity", methods=["GET"])
@admin_required
def admin_activity():
    log("GET /api/admin/activity")
    return jsonify([])


@app.route("/api/admin/create-admin", methods=["POST"])
@admin_required
def create_admin():
    """Create another admin. Admin only."""
    log("POST /api/admin/create-admin")
    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        return jsonify({"message": "Invalid JSON"}), 400

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name:
        return jsonify({"message": "name is required"}), 400
    if not email:
        return jsonify({"message": "email is required"}), 400
    if not password:
        return jsonify({"message": "password is required"}), 400

    if db.get_user_by_email(email):
        return jsonify({"message": "Email already registered"}), 400

    try:
        pw_hash = generate_password_hash(password)
        db.create_user(name, email, pw_hash, "admin", phone="", organization="")
        log(f"Admin created: {email}")
        return jsonify({"message": "Admin created successfully"}), 201
    except Exception as e:
        log(f"Create admin error: {e}")
        return jsonify({"message": "Failed to create admin"}), 500


@app.route("/api/admin/volunteers", methods=["GET"])
@admin_required
def admin_get_volunteers():
    """List ALL volunteers (role='volunteer'). Admin only. No limit."""
    log("GET /api/admin/volunteers")
    try:
        volunteers = db.get_volunteers()
        out = []
        for v in volunteers:
            out.append({
                "id": v["id"],
                "name": v["name"],
                "email": v["email"],
                "phone": v.get("phone") or "",
                "organization": v.get("organization") or "",
                "is_active": v.get("is_active", 1),
                "created_at": str(v["created_at"]) if v.get("created_at") else None,
            })
        return jsonify(out)
    except Exception as e:
        log(f"Error listing volunteers: {e}")
        return jsonify({"message": "Failed to fetch volunteers"}), 500


@app.route("/api/admin/volunteer/<int:user_id>/block", methods=["PUT"])
@admin_required
def admin_block_volunteer(user_id):
    """Set volunteer is_active = 0. Admin only."""
    log(f"PUT /api/admin/volunteer/{user_id}/block")
    if not db.set_volunteer_active(user_id, False):
        return jsonify({"message": "Volunteer not found"}), 404
    return jsonify({"message": "Volunteer blocked"})


@app.route("/api/admin/volunteer/<int:user_id>/activate", methods=["PUT"])
@admin_required
def admin_activate_volunteer(user_id):
    """Set volunteer is_active = 1. Admin only."""
    log(f"PUT /api/admin/volunteer/{user_id}/activate")
    if not db.set_volunteer_active(user_id, True):
        return jsonify({"message": "Volunteer not found"}), 404
    return jsonify({"message": "Volunteer activated"})


@app.route("/api/admin/volunteer/<int:user_id>", methods=["DELETE"])
@admin_required
def admin_delete_volunteer(user_id):
    """Delete a volunteer. Admin only."""
    log(f"DELETE /api/admin/volunteer/{user_id}")
    if not db.delete_volunteer(user_id):
        return jsonify({"message": "Volunteer not found"}), 404
    return jsonify({"message": "Volunteer deleted"})


@app.route("/api/admin/request/<int:request_id>/priority", methods=["PUT"])
@admin_required
def admin_set_request_priority(request_id):
    """Set request priority. Admin only. Body: { "priority": 0 }."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        priority = data.get("priority", 0)
    except Exception:
        return jsonify({"message": "Invalid JSON"}), 400
    if not db.set_request_priority(request_id, priority):
        return jsonify({"message": "Request not found"}), 404
    return jsonify({"message": "Priority updated"})


@app.route("/api/admin/request/<int:request_id>/delete", methods=["PUT", "DELETE"])
@admin_required
def admin_delete_request(request_id):
    """Delete a request. Admin only."""
    log(f"PUT/DELETE /api/admin/request/{request_id}/delete")
    if not db.delete_request(request_id):
        return jsonify({"message": "Request not found"}), 404
    return jsonify({"message": "Request deleted"})


# ---------------------------------------------------------------------------
# Health / root
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return jsonify({
        "service": "Disaster Response & Relief API",
        "version": "1.0",
        "endpoints": [
            "POST /api/register",
            "POST /api/login",
            "POST /api/request",
            "GET /api/requests",
            "PUT /api/request/<id>/accept",
            "PUT /api/request/<id>/complete",
            "GET /api/admin/stats",
            "POST /api/admin/create-admin",
        ],
    })


# ---------------------------------------------------------------------------
# Run + default admin
# ---------------------------------------------------------------------------

def ensure_default_admin():
    if db.admin_exists():
        return
    pw_hash = generate_password_hash("12345")
    db.create_user("Pratik more", "admin@dm.com", pw_hash, "admin", phone="", organization="")
    print("[API] Default admin created: admin@dm.com / 12345")


if __name__ == "__main__":
    db.init_db()
    ensure_default_admin()

    port = int(os.environ.get("PORT", 5000))

    log(f"Starting server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
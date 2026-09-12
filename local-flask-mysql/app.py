"""AI Course Timetable — local Flask + MySQL application (WAMP friendly)."""

import os
from functools import wraps

import mysql.connector
from dotenv import load_dotenv
from flask import Flask, flash, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from scheduler import CREDIT_RULES, DAYS, PERIOD_TIMINGS, PERIODS_PER_DAY, generate, validate

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "change-this-secret-key")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "timetable_db"),
}


def db():
    return mysql.connector.connect(**DB_CONFIG)


def query(sql, params=None, one=False):
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return (rows[0] if rows else None) if one else rows


def execute(sql, params=None):
    conn = db()
    cur = conn.cursor()
    cur.execute(sql, params or ())
    conn.commit()
    last = cur.lastrowid
    cur.close()
    conn.close()
    return last


def login_required(role=None):
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            if "user_id" not in session:
                return redirect(url_for("login"))
            if role and session.get("role") != role:
                flash("You do not have access to that page.", "error")
                return redirect(url_for("home"))
            return view(*args, **kwargs)

        return wrapper

    return decorator


# ----------------------------------------------------------------- auth


@app.route("/")
def home():
    role = session.get("role")
    if role == "admin":
        return redirect(url_for("admin_dashboard"))
    if role == "faculty":
        return redirect(url_for("faculty_dashboard"))
    if role == "student":
        return redirect(url_for("student_dashboard"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = query(
            "SELECT * FROM users WHERE username=%s AND is_active=1",
            (request.form["username"],),
            one=True,
        )
        if user and check_password_hash(user["password_hash"], request.form["password"]):
            session.update(
                user_id=user["id"],
                role=user["role"],
                username=user["username"],
                full_name=user["full_name"],
                faculty_id=user["faculty_id"],
                department=user["department"],
                section=user["section"],
            )
            return redirect(url_for("home"))
        flash("Invalid username or password.", "error")
    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    """Self-service registration for faculty and students only."""
    faculty = query("SELECT * FROM faculty ORDER BY name")
    if request.method == "POST":
        role = request.form["role"]
        if role not in ("faculty", "student"):
            flash("Administrator accounts are created by an existing administrator.", "error")
            return redirect(url_for("register"))
        if query("SELECT id FROM users WHERE username=%s", (request.form["username"],), one=True):
            flash("That username is already taken.", "error")
            return redirect(url_for("register"))
        execute(
            """INSERT INTO users (username, password_hash, full_name, role, faculty_id, department, section)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (
                request.form["username"],
                generate_password_hash(request.form["password"]),
                request.form.get("full_name"),
                role,
                request.form.get("faculty_id") or None,
                request.form.get("department") or None,
                request.form.get("section") or None,
            ),
        )
        flash("Account created — please sign in.", "success")
        return redirect(url_for("login"))
    return render_template("register.html", faculty=faculty)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ----------------------------------------------------------------- data helpers


def all_courses():
    rows = query("SELECT * FROM courses ORDER BY code")
    for r in rows:
        r["consecutive_block"] = bool(r["consecutive_block"])
    return rows


def all_rooms():
    return query("SELECT * FROM rooms ORDER BY room_number")


def timetable_entries():
    return query(
        """SELECT t.*, c.code, c.name AS course_name, c.department, c.section, c.course_type,
                  c.faculty_id, c.credit, c.periods_per_week, c.max_periods_per_day,
                  c.consecutive_block, c.student_count, c.room_type,
                  f.name AS faculty_name, r.room_number
           FROM timetable t
           JOIN courses c ON c.id = t.course_id
           LEFT JOIN faculty f ON f.id = c.faculty_id
           LEFT JOIN rooms r ON r.id = t.room_id
           ORDER BY FIELD(t.day,'Monday','Tuesday','Wednesday','Thursday','Friday'), t.period"""
    )


def grid(entries):
    cells = {(d, p): [] for d in DAYS for p in range(1, PERIODS_PER_DAY + 1)}
    for e in entries:
        cells[(e["day"], e["period"])].append(e)
    return cells


# ----------------------------------------------------------------- admin


@app.route("/admin/dashboard")
@login_required("admin")
def admin_dashboard():
    run = query("SELECT * FROM generation_runs ORDER BY created_at DESC LIMIT 1", one=True)
    return render_template(
        "admin_dashboard.html",
        counts={
            "courses": len(all_courses()),
            "faculty": len(query("SELECT id FROM faculty")),
            "rooms": len(all_rooms()),
            "periods": len(query("SELECT id FROM timetable")),
        },
        run=run,
    )


@app.route("/admin/generate", methods=["GET", "POST"])
@login_required("admin")
def admin_generate():
    result = None
    if request.method == "POST":
        action = request.form.get("action")
        courses, rooms = all_courses(), all_rooms()
        if action == "reset":
            execute("DELETE FROM timetable")
            flash("Timetable cleared.", "success")
        elif action == "validate":
            entries = timetable_entries()
            placements = [
                {
                    "course": next(c for c in courses if c["id"] == e["course_id"]),
                    "day": e["day"],
                    "period": e["period"],
                    "room_id": e["room_id"],
                }
                for e in entries
            ]
            result = validate(placements, courses, rooms)
        else:
            if not courses:
                flash("Add courses before generating a timetable.", "error")
                return redirect(url_for("admin_generate"))
            placements, metrics = generate(courses, rooms)
            execute("DELETE FROM timetable")
            conn = db()
            cur = conn.cursor()
            cur.executemany(
                """INSERT INTO timetable (course_id, occurrence, day, period, timing, room_id)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                [
                    (p["course_id"], p["occurrence"], p["day"], p["period"], p["timing"], p["room_id"])
                    for p in placements
                ],
            )
            conn.commit()
            cur.close()
            conn.close()
            execute(
                """INSERT INTO generation_runs
                   (initial_fitness, optimized_fitness, validation_score, hard_violations, soft_violations)
                   VALUES (%s,%s,%s,%s,%s)""",
                (
                    metrics["initial_fitness"],
                    metrics["optimized_fitness"],
                    metrics["validation_score"],
                    metrics["hard_violations"],
                    metrics["soft_violations"],
                ),
            )
            result = metrics
            flash("Timetable generated.", "success")
    return render_template("admin_generate.html", result=result)


@app.route("/admin/courses", methods=["GET", "POST"])
@login_required("admin")
def admin_courses():
    if request.method == "POST":
        if request.form.get("delete_id"):
            execute("DELETE FROM courses WHERE id=%s", (request.form["delete_id"],))
        else:
            credit = int(request.form["credit"])
            hours, per_week, max_day, block = CREDIT_RULES[credit]
            execute(
                """INSERT INTO courses (code, name, credit, required_hours, course_type, faculty_id,
                       department, section, student_count, room_type, periods_per_week,
                       max_periods_per_day, consecutive_block)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    request.form["code"].upper(),
                    request.form["name"],
                    credit,
                    hours,
                    request.form["course_type"],
                    request.form.get("faculty_id") or None,
                    request.form["department"],
                    request.form["section"],
                    int(request.form["student_count"]),
                    request.form["room_type"],
                    per_week,
                    max_day,
                    int(block),
                ),
            )
        return redirect(url_for("admin_courses"))
    return render_template(
        "admin_courses.html",
        courses=all_courses(),
        faculty=query("SELECT * FROM faculty ORDER BY name"),
        credit_rules=CREDIT_RULES,
    )


@app.route("/admin/faculty", methods=["GET", "POST"])
@login_required("admin")
def admin_faculty():
    if request.method == "POST":
        if request.form.get("delete_id"):
            execute("DELETE FROM faculty WHERE id=%s", (request.form["delete_id"],))
        else:
            execute(
                "INSERT INTO faculty (name, department, email) VALUES (%s,%s,%s)",
                (request.form["name"], request.form["department"], request.form["email"]),
            )
        return redirect(url_for("admin_faculty"))
    return render_template("admin_faculty.html", faculty=query("SELECT * FROM faculty ORDER BY name"))


@app.route("/admin/rooms", methods=["GET", "POST"])
@login_required("admin")
def admin_rooms():
    if request.method == "POST":
        if request.form.get("delete_id"):
            execute("DELETE FROM rooms WHERE id=%s", (request.form["delete_id"],))
        else:
            execute(
                "INSERT INTO rooms (room_number, room_type, capacity) VALUES (%s,%s,%s)",
                (request.form["room_number"], request.form["room_type"], int(request.form["capacity"])),
            )
        return redirect(url_for("admin_rooms"))
    return render_template("admin_rooms.html", rooms=all_rooms())


@app.route("/admin/semester", methods=["GET", "POST"])
@login_required("admin")
def admin_semester():
    settings = query("SELECT * FROM semester_settings ORDER BY id DESC LIMIT 1", one=True)
    if request.method == "POST":
        execute(
            """UPDATE semester_settings SET semester_name=%s, semester_start_date=%s,
                   semester_end_date=%s, semester_months=%s, teaching_weeks=%s,
                   period_duration_minutes=%s WHERE id=%s""",
            (
                request.form["semester_name"],
                request.form.get("semester_start_date") or None,
                request.form.get("semester_end_date") or None,
                int(request.form["semester_months"]),
                int(request.form["teaching_weeks"]),
                int(request.form["period_duration_minutes"]),
                settings["id"],
            ),
        )
        flash("Semester settings saved.", "success")
        return redirect(url_for("admin_semester"))
    return render_template("admin_semester.html", settings=settings, timings=PERIOD_TIMINGS)


@app.route("/admin/timetable")
@login_required("admin")
def admin_timetable():
    entries = timetable_entries()
    department = request.args.get("department", "")
    section = request.args.get("section", "")
    faculty_id = request.args.get("faculty_id", "")
    if department:
        entries = [e for e in entries if e["department"] == department]
    if section:
        entries = [e for e in entries if e["section"] == section]
    if faculty_id:
        entries = [e for e in entries if str(e["faculty_id"]) == faculty_id]
    return render_template(
        "timetable.html",
        title="Master timetable",
        cells=grid(entries),
        days=DAYS,
        periods=range(1, PERIODS_PER_DAY + 1),
        timings=PERIOD_TIMINGS,
        filters=True,
        faculty=query("SELECT * FROM faculty ORDER BY name"),
        departments=sorted({e["department"] for e in timetable_entries()}),
        selected={"department": department, "section": section, "faculty_id": faculty_id},
    )


# ----------------------------------------------------------------- faculty / student


@app.route("/faculty/dashboard")
@login_required("faculty")
def faculty_dashboard():
    fid = session.get("faculty_id")
    courses = [c for c in all_courses() if c["faculty_id"] == fid]
    entries = [e for e in timetable_entries() if e["faculty_id"] == fid]
    return render_template(
        "faculty_dashboard.html",
        courses=courses,
        entries=entries,
        days=DAYS,
    )


@app.route("/faculty/timetable")
@login_required("faculty")
def faculty_timetable():
    entries = [e for e in timetable_entries() if e["faculty_id"] == session.get("faculty_id")]
    return render_template(
        "timetable.html",
        title="My timetable",
        cells=grid(entries),
        days=DAYS,
        periods=range(1, PERIODS_PER_DAY + 1),
        timings=PERIOD_TIMINGS,
        filters=False,
    )


@app.route("/student/dashboard")
@login_required("student")
def student_dashboard():
    dept, sec = session.get("department"), session.get("section")
    courses = [c for c in all_courses() if c["department"] == dept and c["section"] == sec]
    entries = [e for e in timetable_entries() if e["department"] == dept and e["section"] == sec]
    return render_template(
        "student_dashboard.html", courses=courses, entries=entries, days=DAYS, dept=dept, sec=sec
    )


@app.route("/student/timetable")
@login_required("student")
def student_timetable():
    dept, sec = session.get("department"), session.get("section")
    entries = [e for e in timetable_entries() if e["department"] == dept and e["section"] == sec]
    return render_template(
        "timetable.html",
        title="Class timetable",
        cells=grid(entries),
        days=DAYS,
        periods=range(1, PERIODS_PER_DAY + 1),
        timings=PERIOD_TIMINGS,
        filters=False,
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)

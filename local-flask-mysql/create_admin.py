"""Create the first administrator account. Run once: python create_admin.py"""

import getpass

from werkzeug.security import generate_password_hash

from app import execute, query

username = input("Admin username: ").strip()
full_name = input("Full name: ").strip()
password = getpass.getpass("Password: ")

if query("SELECT id FROM users WHERE username=%s", (username,), one=True):
    print("That username already exists.")
else:
    execute(
        "INSERT INTO users (username, password_hash, full_name, role) VALUES (%s,%s,%s,'admin')",
        (username, generate_password_hash(password), full_name),
    )
    print("Administrator created. You can now sign in at http://localhost:5000/login")

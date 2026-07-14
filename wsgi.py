from app import app, ensure_tables

with app.app_context():
    ensure_tables()

application = app
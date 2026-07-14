# Deployment Guide

## Backend
- Use `gunicorn wsgi:application` as the start command.
- Set `SECRET_KEY`, `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DB` in your host environment.
- Add `OPENAI_API_KEY` if you use the chatbot.

## Database
- Create a MySQL database and import `database.sql` first.
- Keep the database reachable before starting the app so `ensure_tables()` can complete.

## Frontend
- Build the Vite app from `frontend/` with `npm ci` and `npm run build`.
- The build outputs into `static/react/`, which the Flask templates already reference.

## Local run
- Copy `.env.example` to `.env` and fill in the values.
- Run `python app.py` for local development.
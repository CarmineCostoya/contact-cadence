# Production database prompt

Ensure a newly published Replit deployment can start against its separate, initially empty production PostgreSQL database. Apply the idempotent schema before the Express server begins listening, and fail startup clearly if the database is unavailable. Preserve the standalone migration command for development and manual verification.

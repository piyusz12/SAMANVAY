-- Initialize PostgreSQL extensions and schemas for SAMANVAY
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE samanvay_db TO samanvay_user;

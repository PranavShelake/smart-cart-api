-- scripts/phase1_auth_migration.sql
-- ============================================================================================================
-- FILE: scripts/phase1_auth_migration.sql
-- PURPOSE: Add tables required by the Auth Module that are NOT in the base schema
-- RUN ORDER: After 01_schema.sql and 02_seed_reference_data.sql
-- MODULE: Phase 1 — Auth Module
-- WHY NEEDED: The base schema has users, email_verification_tokens, password_reset_tokens
--             BUT is missing refresh_tokens — critical for JWT refresh token rotation
-- ============================================================================================================


-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
-- WHY: We use a dual-token auth strategy:
--   Access Token  → 15 min TTL, stored in React memory (not localStorage, not cookie)
--   Refresh Token → 7 day TTL, stored in HTTP-only cookie
--
-- WHY STORE IN DB:
--   - Allows token revocation (logout, suspicious activity, password change)
--   - Enables "logout from all devices" feature
--   - Detects token reuse attacks (refresh token rotation)
--
-- SECURITY: We store SHA-256 hash of the token, NOT the raw token
--   → Even if DB is compromised, tokens cannot be used

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,   -- SHA-256 produces 64 hex chars
    device_info     VARCHAR(255),                  -- Optional: "Chrome on Windows" for session mgmt
    ip_address      VARCHAR(45),                   -- IPv4 (15) or IPv6 (45). For audit trail.
    is_revoked      BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_used_at    TIMESTAMPTZ                    -- Updated on each refresh — useful for "active sessions"
);

-- Indexes: We query by token_hash on every refresh request (hot path)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);  -- For cleanup jobs


-- ============================================
-- COUPON USAGE TRACKING TABLE
-- ============================================
-- WHY NEEDED NOW (Phase 1 prep): The coupon_code table has usage_limit and usage_per_user
-- but there's no table to track WHICH user used WHICH coupon.
-- Without this, we can't enforce per-user limits.
-- Used by: Phase 4 (Orders), but needs to exist before Phase 4.

CREATE TABLE IF NOT EXISTS coupon_usage (
    id          SERIAL PRIMARY KEY,
    coupon_id   INTEGER NOT NULL REFERENCES coupon_code(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id    INTEGER,                -- Nullable — filled when order is confirmed
    used_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(coupon_id, user_id, order_id)  -- Prevent duplicate records per order
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon  ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user    ON coupon_usage(user_id);


-- ============================================
-- USER LOGIN AUDIT LOG (Optional but impressive for portfolio)
-- ============================================
-- WHY: Tracks every login attempt — success and failure.
-- Real-world use: Security alerts, "Login from new device" notifications,
-- lockout after N failed attempts, compliance requirements.

CREATE TABLE IF NOT EXISTS user_login_audit (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- NULL if email not found
    email_attempted VARCHAR(255) NOT NULL,
    ip_address      VARCHAR(45),
    device_info     VARCHAR(255),
    status          VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'LOCKED')),
    failure_reason  VARCHAR(100),   -- e.g. 'WRONG_PASSWORD', 'ACCOUNT_INACTIVE', 'ACCOUNT_NOT_FOUND'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_audit_user_id   ON user_login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_ip        ON user_login_audit(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_audit_created   ON user_login_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_login_audit_status    ON user_login_audit(status);


-- ============================================
-- CLEANUP FUNCTION: Purge Expired Tokens
-- ============================================
-- WHY: Refresh tokens accumulate over time. Users who never explicitly logout
-- leave stale tokens in the DB. This function purges them.
-- USAGE: Call via pg_cron (production) or manually during maintenance.

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS TABLE(deleted_refresh_tokens INTEGER, deleted_verification_tokens INTEGER, deleted_reset_tokens INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_refresh      INTEGER;
    v_verify       INTEGER;
    v_reset        INTEGER;
BEGIN
    -- Delete expired refresh tokens
    DELETE FROM refresh_tokens
    WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS v_refresh = ROW_COUNT;

    -- Delete expired / used email verification tokens
    DELETE FROM email_verification_tokens
    WHERE expires_at < CURRENT_TIMESTAMP OR is_used = TRUE;
    GET DIAGNOSTICS v_verify = ROW_COUNT;

    -- Delete expired / used password reset tokens
    DELETE FROM password_reset_tokens
    WHERE expires_at < CURRENT_TIMESTAMP OR is_used = TRUE;
    GET DIAGNOSTICS v_reset = ROW_COUNT;

    RAISE NOTICE 'Cleanup complete: % refresh tokens, % verification tokens, % reset tokens deleted',
        v_refresh, v_verify, v_reset;

    RETURN QUERY SELECT v_refresh, v_verify, v_reset;
END;
$$;

-- Usage: SELECT * FROM cleanup_expired_tokens();


-- ============================================
-- FUNCTION: Get User With Role (used by auth service)
-- ============================================
-- WHY: The auth service needs user + their roles in ONE query (not two round trips)
-- This function returns the user row joined with role names as an array.
-- Called during login to build the JWT claims payload.

CREATE OR REPLACE FUNCTION get_user_with_roles(p_email VARCHAR)
RETURNS TABLE (
    id              INTEGER,
    email           VARCHAR,
    password_hash   VARCHAR,
    first_name      VARCHAR,
    last_name       VARCHAR,
    phone           VARCHAR,
    is_active       BOOLEAN,
    soft_delete     BOOLEAN,
    roles           TEXT[]    -- Array of role names: ['CUSTOMER'] or ['SELLER', 'ADMIN']
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.phone,
        u.is_active,
        u.soft_delete,
        ARRAY_AGG(r.name::TEXT) AS roles
    FROM users u
    LEFT JOIN user_role ur ON ur.user_id = u.id AND ur.is_active = TRUE
    LEFT JOIN roles r ON r.id = ur.role_id AND r.is_active = TRUE
    WHERE u.email = LOWER(TRIM(p_email))
    GROUP BY u.id, u.email, u.password_hash, u.first_name, u.last_name, u.phone, u.is_active, u.soft_delete;
END;
$$;

-- Usage: SELECT * FROM get_user_with_roles('user@example.com');


-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    v_refresh   BOOLEAN;
    v_coupon_u  BOOLEAN;
    v_audit     BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refresh_tokens')      INTO v_refresh;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_usage')        INTO v_coupon_u;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_login_audit')    INTO v_audit;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'PHASE 1 AUTH MIGRATION VERIFICATION';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'refresh_tokens table     : %', CASE WHEN v_refresh  THEN 'OK' ELSE 'MISSING!' END;
    RAISE NOTICE 'coupon_usage table       : %', CASE WHEN v_coupon_u THEN 'OK' ELSE 'MISSING!' END;
    RAISE NOTICE 'user_login_audit table   : %', CASE WHEN v_audit    THEN 'OK' ELSE 'MISSING!' END;
    RAISE NOTICE 'cleanup_expired_tokens() : created';
    RAISE NOTICE 'get_user_with_roles()    : created';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'PHASE 1 MIGRATION COMPLETE — Ready to build Auth Module';
    RAISE NOTICE '============================================';
END $$;
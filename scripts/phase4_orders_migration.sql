-- ============================================================
-- scripts/phase4_orders_migration.sql
-- Adds order number generator function + useful order views
-- Run before building Orders module
-- ============================================================

-- ── Order number generator ────────────────────────────────────
-- Format: SC-20240506-000042
-- WHY a function? Consistent format across the codebase.
-- Called inside the order creation transaction.

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
    v_date   VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    v_seq    INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        NULLIF(REGEXP_REPLACE(order_number, '[^0-9]', '', 'g'), '')::INTEGER
    ), 0) + 1
    INTO v_seq
    FROM orders
    WHERE order_number LIKE 'SC-' || v_date || '-%';

    RETURN 'SC-' || v_date || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ── Coupon usage count helper ─────────────────────────────────
-- Returns how many times a user has used a specific coupon
CREATE OR REPLACE FUNCTION get_user_coupon_usage(p_coupon_id INT, p_user_id INT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM coupon_usage
        WHERE coupon_id = p_coupon_id
          AND user_id   = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- ── Verification ──────────────────────────────────────────────
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Phase 4 Migration Complete';
    RAISE NOTICE 'generate_order_number()    : created';
    RAISE NOTICE 'get_user_coupon_usage()    : created';
    RAISE NOTICE '============================================';
END $$;
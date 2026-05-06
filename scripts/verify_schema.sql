-- ============================================================================================================
-- FILE: scripts/verify_schema.sql
-- PURPOSE: Run this ANYTIME to get a full health check of your database
--          Shows: all tables, row counts, indexes, functions, triggers
-- RUN: After running all scripts, to confirm everything is correct
-- ============================================================================================================

-- ============================================
-- SECTION 1: ALL TABLES WITH ROW COUNTS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'SMART CART — DATABASE HEALTH CHECK';
    RAISE NOTICE '=====================================================';
END $$;

SELECT
    t.table_name                                    AS "Table",
    pg_stat_user_tables.n_live_tup                  AS "Row Count",
    pg_size_pretty(pg_total_relation_size(
        (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass
    ))                                              AS "Size",
    CASE
        WHEN pg_stat_user_tables.n_live_tup > 0 THEN '✅ Has data'
        ELSE '⬜ Empty'
    END                                             AS "Status"
FROM information_schema.tables t
LEFT JOIN pg_stat_user_tables
    ON pg_stat_user_tables.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;


-- ============================================
-- SECTION 2: REFERENCE DATA CHECK
-- ============================================
-- These tables MUST have data before any module works.

SELECT 'roles'          AS "Reference Table", COUNT(*) AS "Row Count", CASE WHEN COUNT(*) >= 3 THEN '✅ OK' ELSE '❌ MISSING DATA' END AS "Status" FROM roles
UNION ALL
SELECT 'order_state',          COUNT(*), CASE WHEN COUNT(*) >= 10 THEN '✅ OK' ELSE '❌ MISSING DATA' END FROM order_state
UNION ALL
SELECT 'payment_method',       COUNT(*), CASE WHEN COUNT(*) >= 6  THEN '✅ OK' ELSE '❌ MISSING DATA' END FROM payment_method
UNION ALL
SELECT 'payment_status',       COUNT(*), CASE WHEN COUNT(*) >= 5  THEN '✅ OK' ELSE '❌ MISSING DATA' END FROM payment_status
UNION ALL
SELECT 'tax_rates',            COUNT(*), CASE WHEN COUNT(*) >= 4  THEN '✅ OK' ELSE '❌ MISSING DATA' END FROM tax_rates
UNION ALL
SELECT 'category',             COUNT(*), CASE WHEN COUNT(*) >= 10 THEN '✅ OK' ELSE '❌ MISSING DATA' END FROM category
UNION ALL
SELECT 'coupon_code',          COUNT(*), CASE WHEN COUNT(*) >= 1  THEN '✅ OK' ELSE '⚠ No coupons' END  FROM coupon_code;


-- ============================================
-- SECTION 3: MODULE READINESS CHECK
-- ============================================
-- Shows whether each development phase is ready to be built

SELECT
    phase                   AS "Phase",
    module                  AS "Module",
    required_table          AS "Requires Table",
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = required_table
        ) THEN '✅ Ready'
        ELSE '❌ Missing Table'
    END                     AS "Status"
FROM (VALUES
    ('Phase 1', 'Auth',         'users'),
    ('Phase 1', 'Auth',         'refresh_tokens'),
    ('Phase 1', 'Auth',         'email_verification_tokens'),
    ('Phase 1', 'Auth',         'password_reset_tokens'),
    ('Phase 1', 'Auth',         'user_login_audit'),
    ('Phase 1', 'Users',        'user_addresses'),
    ('Phase 2', 'Catalog',      'category'),
    ('Phase 2', 'Products',     'products'),
    ('Phase 2', 'Products',     'product_variants'),
    ('Phase 2', 'Products',     'product_images'),
    ('Phase 3', 'Cart',         'cart'),
    ('Phase 3', 'Cart',         'cart_items'),
    ('Phase 3', 'Wishlist',     'wishlist'),
    ('Phase 4', 'Orders',       'orders'),
    ('Phase 4', 'Orders',       'order_items'),
    ('Phase 4', 'Orders',       'order_status_history'),
    ('Phase 4', 'Payments',     'payment_method'),
    ('Phase 4', 'Payments',     'payment_status'),
    ('Phase 4', 'Coupons',      'coupon_code'),
    ('Phase 4', 'Coupons',      'coupon_usage'),
    ('Phase 5', 'Reviews',      'product_reviews'),
    ('Phase 5', 'Returns',      'returns'),
    ('Phase 5', 'Returns',      'return_items')
) AS checks(phase, module, required_table)
ORDER BY phase, module;


-- ============================================
-- SECTION 4: INDEXES CHECK
-- ============================================
SELECT
    tablename   AS "Table",
    indexname   AS "Index Name",
    '✅'         AS "Status"
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'     -- Skip primary key indexes (auto-created)
ORDER BY tablename, indexname;


-- ============================================
-- SECTION 5: TRIGGERS CHECK
-- ============================================
SELECT
    trigger_name        AS "Trigger",
    event_object_table  AS "On Table",
    event_manipulation  AS "Event",
    action_timing       AS "Timing",
    '✅ Active'          AS "Status"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;


-- ============================================
-- SECTION 6: FUNCTIONS CHECK
-- ============================================
SELECT
    routine_name        AS "Function Name",
    routine_type        AS "Type",
    '✅ Exists'          AS "Status"
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;


-- ============================================
-- SECTION 7: FOREIGN KEY RELATIONSHIPS
-- ============================================
SELECT
    tc.table_name           AS "Table",
    kcu.column_name         AS "Column",
    ccu.table_name          AS "References Table",
    ccu.column_name         AS "References Column",
    rc.delete_rule          AS "On Delete"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;


-- ============================================
-- FINAL SUMMARY
-- ============================================
DO $$
DECLARE
    v_total_tables  INTEGER;
    v_total_indexes INTEGER;
    v_total_funcs   INTEGER;
    v_total_triggers INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_tables
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

    SELECT COUNT(*) INTO v_total_indexes
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey';

    SELECT COUNT(*) INTO v_total_funcs
    FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

    SELECT COUNT(*) INTO v_total_triggers
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';

    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'SMART CART — DATABASE SUMMARY';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total Tables   : %', v_total_tables;
    RAISE NOTICE 'Total Indexes  : % (excl. PKs)', v_total_indexes;
    RAISE NOTICE 'Total Functions: %', v_total_funcs;
    RAISE NOTICE 'Total Triggers : %', v_total_triggers;
    RAISE NOTICE '=====================================================';
END $$;
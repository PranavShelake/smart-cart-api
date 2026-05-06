-- ============================================================================================================
-- FILE: scripts/02_seed_reference_data.sql
-- PURPOSE: Seed all static / reference tables required before any module can function
-- RUN ORDER: After 01_schema.sql
-- TABLES SEEDED: roles, order_state, payment_method, payment_status, tax_rates, category, coupon_code
-- ============================================================================================================

-- ============================================
-- ROLES (Phase 1 — Auth Module requires this)
-- ============================================
-- Every user MUST have a role. These 3 roles cover all access levels in the system.
-- CUSTOMER  → Normal buyer
-- SELLER    → Can list products, manage inventory
-- ADMIN     → Full system access

INSERT INTO roles (name, description, is_active) VALUES
    ('CUSTOMER', 'Standard buyer account. Can browse, add to cart, place orders, review products.', TRUE),
    ('SELLER',   'Merchant account. Can create/manage products, view own orders, manage inventory.', TRUE),
    ('ADMIN',    'Full system access. Can manage users, approve products, process returns, view all orders.', TRUE)
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- ORDER STATES (Phase 4 — Orders Module requires this)
-- ============================================
-- These represent every possible state an order can be in.
-- The state machine flow is:
--   PENDING → CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
--   Any state (before SHIPPED) → CANCELLED
--   DELIVERED → RETURN_REQUESTED → RETURN_APPROVED/RETURN_REJECTED → REFUNDED

INSERT INTO order_state (name, description, color_code) VALUES
    ('PENDING',             'Order placed but payment not yet confirmed.',                           '#FFA500'),  -- Orange
    ('CONFIRMED',           'Payment confirmed. Order accepted by the system.',                      '#3498DB'),  -- Blue
    ('PROCESSING',          'Order is being packed and prepared for dispatch.',                      '#9B59B6'),  -- Purple
    ('SHIPPED',             'Order has been handed to the logistics partner.',                       '#2ECC71'),  -- Green
    ('OUT_FOR_DELIVERY',    'Order is with the delivery agent, arriving today.',                     '#1ABC9C'),  -- Teal
    ('DELIVERED',           'Order successfully delivered to the customer.',                         '#27AE60'),  -- Dark Green
    ('CANCELLED',           'Order was cancelled (by customer or system).',                          '#E74C3C'),  -- Red
    ('RETURN_REQUESTED',    'Customer has requested a return for this order.',                       '#E67E22'),  -- Dark Orange
    ('RETURN_APPROVED',     'Return approved. Pickup scheduled.',                                    '#F39C12'),  -- Yellow
    ('RETURN_REJECTED',     'Return request was rejected by admin/seller.',                          '#C0392B'),  -- Dark Red
    ('REFUNDED',            'Refund processed and credited to original payment method.',             '#16A085')   -- Dark Teal
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- PAYMENT METHODS (Phase 4 — Orders Module requires this)
-- ============================================
-- These are the payment options available at checkout.
-- UPI and Cards are the most common in India.

INSERT INTO payment_method (name, description, is_active) VALUES
    ('UPI',             'Pay via UPI apps like GPay, PhonePe, Paytm.',          TRUE),
    ('CREDIT_CARD',     'Pay using Visa, Mastercard, or Rupay credit card.',     TRUE),
    ('DEBIT_CARD',      'Pay using Visa, Mastercard, or Rupay debit card.',      TRUE),
    ('NET_BANKING',     'Pay via internet banking from major Indian banks.',     TRUE),
    ('WALLET',          'Pay using digital wallets (Paytm, Amazon Pay).',        TRUE),
    ('COD',             'Cash on Delivery. Pay when the order arrives.',         TRUE),
    ('EMI',             'Equated Monthly Installments via credit card.',         TRUE),
    ('BANK_TRANSFER',   'Direct NEFT/RTGS transfer. Used for bulk orders.',      FALSE)
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- PAYMENT STATUSES (Phase 4 — Orders + Payments Module requires this)
-- ============================================
-- Tracks the lifecycle of a payment transaction.

INSERT INTO payment_status (name, description) VALUES
    ('PENDING',     'Payment initiated but not yet confirmed by payment gateway.'),
    ('AUTHORIZED',  'Payment authorized by bank. Not yet captured.'),
    ('PAID',        'Payment successfully received and captured.'),
    ('FAILED',      'Payment attempt failed. Customer should retry.'),
    ('REFUND_PENDING', 'Refund has been initiated and is being processed.'),
    ('REFUNDED',    'Full refund has been credited to original payment method.'),
    ('PARTIALLY_REFUNDED', 'Partial refund issued (e.g., one item returned out of many.')
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- TAX RATES (Phase 4 — Orders Module: tax calculation)
-- ============================================
-- GST rates in India. Applied based on product category.
-- In production, category_id would link tax_rates to category.

INSERT INTO tax_rates (country, state, tax_name, rate, is_active) VALUES
    ('India', NULL,           'GST 5%',   5.00,  TRUE),   -- Food, essential items
    ('India', NULL,           'GST 12%',  12.00, TRUE),   -- Processed food, phones
    ('India', NULL,           'GST 18%',  18.00, TRUE),   -- Electronics, clothing
    ('India', NULL,           'GST 28%',  28.00, TRUE),   -- Luxury goods, AC, cars
    ('India', 'Maharashtra',  'CGST+SGST 9%+9%', 18.00, TRUE),  -- State-specific example
    ('India', NULL,           'GST 0%',   0.00,  TRUE)    -- Exempted items (books, milk)
ON CONFLICT DO NOTHING;


-- ============================================
-- CATEGORIES (Phase 2 — Catalog Module requires this)
-- ============================================
-- Using a self-referential hierarchy: parent_category_id = NULL means top-level.
-- Slugs are used in URLs: /categories/electronics

-- TOP-LEVEL CATEGORIES
INSERT INTO category (name, slug, description, parent_category_id, display_order, is_active) VALUES
    ('Electronics',         'electronics',          'Phones, laptops, gadgets and more.',               NULL, 1,  TRUE),
    ('Fashion',             'fashion',              'Clothing, footwear, and accessories.',             NULL, 2,  TRUE),
    ('Home & Kitchen',      'home-kitchen',         'Furniture, appliances, cookware.',                 NULL, 3,  TRUE),
    ('Sports & Fitness',    'sports-fitness',       'Equipment, supplements, activewear.',              NULL, 4,  TRUE),
    ('Books',               'books',                'Fiction, non-fiction, textbooks.',                 NULL, 5,  TRUE),
    ('Beauty & Health',     'beauty-health',        'Skincare, haircare, wellness products.',           NULL, 6,  TRUE),
    ('Toys & Games',        'toys-games',           'Toys for kids, board games, puzzles.',             NULL, 7,  TRUE),
    ('Grocery',             'grocery',              'Daily essentials, snacks, beverages.',             NULL, 8,  TRUE),
    ('Automotive',          'automotive',           'Car accessories, tools, spare parts.',             NULL, 9,  TRUE),
    ('Jewellery',           'jewellery',            'Gold, silver, fashion jewellery.',                 NULL, 10, TRUE)
ON CONFLICT (slug) DO NOTHING;


-- SUB-CATEGORIES (Electronics)
INSERT INTO category (name, slug, description, parent_category_id, display_order, is_active) VALUES
    ('Smartphones',     'smartphones',      'Android and iOS smartphones.',         (SELECT id FROM category WHERE slug = 'electronics'),    1, TRUE),
    ('Laptops',         'laptops',          'Gaming, business, and student laptops.',(SELECT id FROM category WHERE slug = 'electronics'),    2, TRUE),
    ('Headphones',      'headphones',       'Wired and wireless headphones.',        (SELECT id FROM category WHERE slug = 'electronics'),    3, TRUE),
    ('Televisions',     'televisions',      'Smart TVs and LED TVs.',               (SELECT id FROM category WHERE slug = 'electronics'),    4, TRUE),
    ('Cameras',         'cameras',          'DSLRs, mirrorless, and action cameras.',(SELECT id FROM category WHERE slug = 'electronics'),    5, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- SUB-CATEGORIES (Fashion)
INSERT INTO category (name, slug, description, parent_category_id, display_order, is_active) VALUES
    ('Men Clothing',    'men-clothing',     'T-shirts, shirts, trousers for men.',  (SELECT id FROM category WHERE slug = 'fashion'),  1, TRUE),
    ('Women Clothing',  'women-clothing',   'Kurtas, sarees, dresses for women.',   (SELECT id FROM category WHERE slug = 'fashion'),  2, TRUE),
    ('Footwear',        'footwear',         'Shoes, sandals, sports shoes.',        (SELECT id FROM category WHERE slug = 'fashion'),  3, TRUE),
    ('Bags',            'bags',             'Handbags, backpacks, wallets.',        (SELECT id FROM category WHERE slug = 'fashion'),  4, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- SUB-CATEGORIES (Home & Kitchen)
INSERT INTO category (name, slug, description, parent_category_id, display_order, is_active) VALUES
    ('Kitchen Appliances', 'kitchen-appliances', 'Mixer grinders, microwaves, OTGs.', (SELECT id FROM category WHERE slug = 'home-kitchen'), 1, TRUE),
    ('Furniture',          'furniture',           'Beds, sofas, wardrobes.',           (SELECT id FROM category WHERE slug = 'home-kitchen'), 2, TRUE),
    ('Cookware',           'cookware',            'Pans, pressure cookers, tawa.',     (SELECT id FROM category WHERE slug = 'home-kitchen'), 3, TRUE)
ON CONFLICT (slug) DO NOTHING;


-- ============================================
-- SAMPLE COUPON CODES (Phase 4 — Coupons Module)
-- ============================================
-- These are development/testing coupons. Real coupons created via Admin panel.

INSERT INTO coupon_code (
    code, discount_type, discount_value, min_purchase_amount,
    max_discount_amount, valid_from, valid_to, usage_limit,
    usage_per_user, is_active
) VALUES
    ('WELCOME10',   'percentage', 10.00, 299.00,  100.00, NOW(), NOW() + INTERVAL '365 days', 1000, 1, TRUE),
    ('FLAT100',     'fixed',     100.00, 599.00,  100.00, NOW(), NOW() + INTERVAL '30 days',   500, 1, TRUE),
    ('SAVE20',      'percentage', 20.00, 999.00,  200.00, NOW(), NOW() + INTERVAL '7 days',    200, 1, TRUE),
    ('FIRSTORDER',  'percentage', 15.00, 199.00,  150.00, NOW(), NOW() + INTERVAL '180 days', 9999, 1, TRUE)
ON CONFLICT (code) DO NOTHING;


-- ============================================
-- VERIFICATION — Print row counts to confirm seeding worked
-- ============================================
DO $$
DECLARE
    v_roles            INTEGER;
    v_order_states     INTEGER;
    v_payment_methods  INTEGER;
    v_payment_statuses INTEGER;
    v_tax_rates        INTEGER;
    v_categories       INTEGER;
    v_coupons          INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_roles            FROM roles;
    SELECT COUNT(*) INTO v_order_states     FROM order_state;
    SELECT COUNT(*) INTO v_payment_methods  FROM payment_method;
    SELECT COUNT(*) INTO v_payment_statuses FROM payment_status;
    SELECT COUNT(*) INTO v_tax_rates        FROM tax_rates;
    SELECT COUNT(*) INTO v_categories       FROM category;
    SELECT COUNT(*) INTO v_coupons          FROM coupon_code;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'SEED DATA VERIFICATION';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Roles            : % rows', v_roles;
    RAISE NOTICE 'Order States     : % rows', v_order_states;
    RAISE NOTICE 'Payment Methods  : % rows', v_payment_methods;
    RAISE NOTICE 'Payment Statuses : % rows', v_payment_statuses;
    RAISE NOTICE 'Tax Rates        : % rows', v_tax_rates;
    RAISE NOTICE 'Categories       : % rows', v_categories;
    RAISE NOTICE 'Coupon Codes     : % rows', v_coupons;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ALL REFERENCE DATA SEEDED SUCCESSFULLY';
    RAISE NOTICE '============================================';
END $$;
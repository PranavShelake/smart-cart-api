-- scripts/phase2_sample_data.sql
-- ============================================================
-- scripts/phase2_sample_data.sql
-- Seed 3 products with variants + images for testing Phase 2
-- Run AFTER phase1_auth_migration.sql
-- ============================================================

-- ── Sample Products ───────────────────────────────────────

INSERT INTO products
    (name, slug, category_id, sku, price, compare_at_price,
     description, short_description, stock, low_stock_threshold,
     is_active, is_featured)
VALUES
    (
        'Apple iPhone 15',
        'apple-iphone-15',
        (SELECT id FROM category WHERE slug = 'smartphones'),
        'IPH15-BLK-128',
        79999.00, 84999.00,
        'Latest Apple iPhone 15 with 48MP camera, A16 Bionic chip, and USB-C charging.',
        'iPhone 15 — 48MP Camera, A16 Bionic, USB-C',
        50, 5, TRUE, TRUE
    ),
    (
        'Samsung Galaxy S24',
        'samsung-galaxy-s24',
        (SELECT id FROM category WHERE slug = 'smartphones'),
        'SGS24-BLK-256',
        74999.00, 79999.00,
        'Samsung Galaxy S24 with Snapdragon 8 Gen 3, 50MP camera, and Galaxy AI features.',
        'Galaxy S24 — Galaxy AI, 50MP, Snapdragon 8 Gen 3',
        35, 5, TRUE, TRUE
    ),
    (
        'boAt Rockerz 450 Bluetooth Headphone',
        'boat-rockerz-450',
        (SELECT id FROM category WHERE slug = 'headphones'),
        'BOAT-RKZ450-BLK',
        1299.00, 2999.00,
        'boAt Rockerz 450 with 15 hours battery, 40mm drivers, and foldable design.',
        'boAt Rockerz 450 — 15hr Battery, Bluetooth 5.0',
        200, 20, TRUE, FALSE
    )
ON CONFLICT (slug) DO NOTHING;


-- ── Variants for iPhone 15 ────────────────────────────────

INSERT INTO product_variants
    (product_id, sku, variant_name, color, material, price, compare_at_price, stock, is_active)
VALUES
    (
        (SELECT id FROM products WHERE slug = 'apple-iphone-15'),
        'IPH15-BLK-128', 'Black 128GB', 'Black', NULL,
        79999.00, 84999.00, 20, TRUE
    ),
    (
        (SELECT id FROM products WHERE slug = 'apple-iphone-15'),
        'IPH15-BLU-128', 'Blue 128GB', 'Blue', NULL,
        79999.00, 84999.00, 15, TRUE
    ),
    (
        (SELECT id FROM products WHERE slug = 'apple-iphone-15'),
        'IPH15-BLK-256', 'Black 256GB', 'Black', NULL,
        89999.00, 94999.00, 15, TRUE
    )
ON CONFLICT (sku) DO NOTHING;


-- ── Variants for Galaxy S24 ───────────────────────────────

INSERT INTO product_variants
    (product_id, sku, variant_name, color, price, compare_at_price, stock, is_active)
VALUES
    (
        (SELECT id FROM products WHERE slug = 'samsung-galaxy-s24'),
        'SGS24-BLK-256', 'Phantom Black 256GB', 'Phantom Black',
        74999.00, 79999.00, 20, TRUE
    ),
    (
        (SELECT id FROM products WHERE slug = 'samsung-galaxy-s24'),
        'SGS24-GRY-256', 'Marble Gray 256GB', 'Marble Gray',
        74999.00, 79999.00, 15, TRUE
    )
ON CONFLICT (sku) DO NOTHING;


-- ── Product Images ────────────────────────────────────────

INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
VALUES
    (
        (SELECT id FROM products WHERE slug = 'apple-iphone-15'),
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
        'iPhone 15 Black Front', TRUE, 1
    ),
    (
        (SELECT id FROM products WHERE slug = 'samsung-galaxy-s24'),
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800',
        'Samsung Galaxy S24', TRUE, 1
    ),
    (
        (SELECT id FROM products WHERE slug = 'boat-rockerz-450'),
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        'boAt Rockerz 450 Headphone', TRUE, 1
    )
ON CONFLICT DO NOTHING;


-- ── Verification ──────────────────────────────────────────
DO $$
DECLARE v_products INTEGER; v_variants INTEGER; v_images INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_products FROM products;
    SELECT COUNT(*) INTO v_variants FROM product_variants;
    SELECT COUNT(*) INTO v_images   FROM product_images;
    RAISE NOTICE '================================';
    RAISE NOTICE 'Phase 2 Sample Data';
    RAISE NOTICE 'Products : %', v_products;
    RAISE NOTICE 'Variants : %', v_variants;
    RAISE NOTICE 'Images   : %', v_images;
    RAISE NOTICE '================================';
END $$;
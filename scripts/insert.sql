-- ============================================
-- STATIC DATA INSERTS
-- ============================================

-- Role 
INSERT INTO roles (id, name, description, is_active)
VALUES 
(1, 'Super Admin', 'Highest-level admin with full system control', TRUE),
(2, 'Admin', 'Manage users, roles, products, and orders', TRUE),
(3, 'Seller', 'Manage own products and view related orders', TRUE),
(4, 'Customer', 'Browse and purchase products', TRUE),
(5, 'Delivery', 'Access orders assigned for delivery', TRUE),
(6, 'Support', 'Handle customer tickets and complaints', TRUE),
(7, 'Finance', 'Access payments and financial reports', TRUE),
(8, 'Marketing', 'Manage promotions and marketing campaigns', TRUE);

-- Insert Order States
INSERT INTO order_state (id, name, description, color_code) VALUES
    (1, 'Pending', 'Order has been placed and is awaiting processing', '#FFA500'),
    (2, 'Processing', 'Order is being prepared for shipment', '#3B82F6'),
    (3, 'Confirmed', 'Order has been confirmed and payment verified', '#10B981'),
    (4, 'Packed', 'Order has been packed and ready to ship', '#8B5CF6'),
    (5, 'Shipped', 'Order has been shipped and is in transit', '#0EA5E9'),
    (6, 'Out for Delivery', 'Order is out for delivery', '#F59E0B'),
    (7, 'Delivered', 'Order has been successfully delivered', '#22C55E'),
    (8, 'Cancelled', 'Order has been cancelled', '#EF4444'),
    (9, 'Returned', 'Order has been returned by customer', '#F97316'),
    (10, 'Refunded', 'Payment has been refunded to customer', '#EC4899')
ON CONFLICT (name) DO NOTHING;

-- Insert Payment Methods
INSERT INTO payment_method (id, name, description, is_active) VALUES
    (1, 'Credit Card', 'Payment via Credit Card (Visa, Mastercard, AMEX)', TRUE),
    (2, 'Debit Card', 'Payment via Debit Card', TRUE),
    (3, 'UPI', 'Unified Payments Interface (Google Pay, PhonePe, Paytm)', TRUE),
    (4, 'Digital Wallet', 'Digital Wallet (PayTM, PhonePe, Amazon Pay)', TRUE),
    (5, 'Net Banking', 'Direct bank transfer via Net Banking', TRUE),
    (6, 'Cash on Delivery', 'Pay cash when product is delivered', TRUE),
    (7, 'EMI', 'Easy Monthly Installments', TRUE),
    (8, 'PayPal', 'Payment via PayPal account', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert Payment Statuses
INSERT INTO payment_status (id, name, description) VALUES
    (1, 'Paid', 'Payment has been successfully completed'),
    (2, 'Pending', 'Payment is awaiting confirmation'),
    (3, 'Failed', 'Payment attempt failed'),
    (4, 'Refunded', 'Payment has been refunded to customer'),
    (5, 'Cancelled', 'Payment was cancelled by user'),
    (6, 'Partially Refunded', 'Payment has been partially refunded'),
    (7, 'Processing', 'Payment is being processed')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- CATEGORY HIERARCHY EXAMPLE
-- Structure: Electronics → Mobiles → Android Phones
-- ============================================

-- ========== LEVEL 1: MAIN CATEGORIES (No Parent) ==========
INSERT INTO category (name, slug, description, parent_category_id, is_active, display_order) VALUES
    ('Electronics', 'electronics', 'Electronic devices, gadgets, and accessories', NULL, TRUE, 1),
    ('Fashion', 'fashion', 'Clothing, footwear, and fashion accessories', NULL, TRUE, 2),
    ('Home & Kitchen', 'home-kitchen', 'Home appliances, kitchenware, and furniture', NULL, TRUE, 3),
    ('Books', 'books', 'Books, magazines, and educational materials', NULL, TRUE, 4),
    ('Sports & Fitness', 'sports-fitness', 'Sports equipment, fitness gear, and outdoor items', NULL, TRUE, 5),
    ('Beauty & Personal Care', 'beauty-personal-care', 'Beauty products, cosmetics, and personal care items', NULL, TRUE, 6),
    ('Toys & Games', 'toys-games', 'Toys, games, and hobby items', NULL, TRUE, 7),
    ('Automotive', 'automotive', 'Automotive parts, accessories, and tools', NULL, TRUE, 8),
    ('Health & Wellness', 'health-wellness', 'Health supplements, medical equipment, and wellness products', NULL, TRUE, 9),
    ('Grocery & Food', 'grocery-food', 'Groceries, packaged food, and beverages', NULL, TRUE, 10)
ON CONFLICT (name) DO NOTHING;

-- ========== LEVEL 2: SUBCATEGORIES (Parent: Electronics) ==========
INSERT INTO category (name, slug, description, parent_category_id, is_active, display_order) VALUES
    ('Mobiles', 'mobiles', 'Mobile phones and smartphones', 
        (SELECT id FROM category WHERE slug = 'electronics'), TRUE, 1),
    ('Laptops', 'laptops', 'Laptops and notebooks', 
        (SELECT id FROM category WHERE slug = 'electronics'), TRUE, 2),
    ('Headphones', 'headphones', 'Headphones, earphones, and audio accessories', 
        (SELECT id FROM category WHERE slug = 'electronics'), TRUE, 3),
    ('Cameras', 'cameras', 'Digital cameras and photography equipment', 
        (SELECT id FROM category WHERE slug = 'electronics'), TRUE, 4),
    ('Tablets', 'tablets', 'Tablets and e-readers', 
        (SELECT id FROM category WHERE slug = 'electronics'), TRUE, 5),
    ('Televisions', 'televisions', 'TVs and home entertainment', 
        (SELECT id FROM category WHERE slug = 'electronics'), TRUE, 6)
ON CONFLICT (name) DO NOTHING;

-- ========== LEVEL 3: SUB-SUBCATEGORIES (Parent: Mobiles) ==========
-- Example: Electronics → Mobiles → Android Phones
INSERT INTO category (name, slug, description, parent_category_id, is_active, display_order) VALUES
    ('Android Phones', 'android-phones', 'Smartphones running Android OS', 
        (SELECT id FROM category WHERE slug = 'mobiles'), TRUE, 1),
    ('iPhones', 'iphones', 'Apple iPhone series', 
        (SELECT id FROM category WHERE slug = 'mobiles'), TRUE, 2),
    ('Feature Phones', 'feature-phones', 'Basic mobile phones', 
        (SELECT id FROM category WHERE slug = 'mobiles'), TRUE, 3),
    ('Refurbished Phones', 'refurbished-phones', 'Certified refurbished mobile phones', 
        (SELECT id FROM category WHERE slug = 'mobiles'), TRUE, 4)
ON CONFLICT (name) DO NOTHING;

-- ========== LEVEL 3: SUB-SUBCATEGORIES (Parent: Laptops) ==========
INSERT INTO category (name, slug, description, parent_category_id, is_active, display_order) VALUES
    ('Gaming Laptops', 'gaming-laptops', 'High-performance laptops for gaming', 
        (SELECT id FROM category WHERE slug = 'laptops'), TRUE, 1),
    ('Business Laptops', 'business-laptops', 'Professional laptops for work', 
        (SELECT id FROM category WHERE slug = 'laptops'), TRUE, 2),
    ('Ultrabooks', 'ultrabooks', 'Thin and light portable laptops', 
        (SELECT id FROM category WHERE slug = 'laptops'), TRUE, 3),
    ('2-in-1 Laptops', '2-in-1-laptops', 'Convertible laptop-tablet hybrids', 
        (SELECT id FROM category WHERE slug = 'laptops'), TRUE, 4)
ON CONFLICT (name) DO NOTHING;

-- ========== LEVEL 2: SUBCATEGORIES (Parent: Fashion) ==========
INSERT INTO category (name, slug, description, parent_category_id, is_active, display_order) VALUES
    ('Men''s Clothing', 'mens-clothing', 'Clothing for men', 
        (SELECT id FROM category WHERE slug = 'fashion'), TRUE, 1),
    ('Women''s Clothing', 'womens-clothing', 'Clothing for women', 
        (SELECT id FROM category WHERE slug = 'fashion'), TRUE, 2),
    ('Kids'' Clothing', 'kids-clothing', 'Clothing for children', 
        (SELECT id FROM category WHERE slug = 'fashion'), TRUE, 3),
    ('Footwear', 'footwear', 'Shoes, sandals, and boots', 
        (SELECT id FROM category WHERE slug = 'fashion'), TRUE, 4),
    ('Accessories', 'accessories', 'Bags, belts, watches, and fashion accessories', 
        (SELECT id FROM category WHERE slug = 'fashion'), TRUE, 5)
ON CONFLICT (name) DO NOTHING;

-- ========== LEVEL 3: SUB-SUBCATEGORIES (Parent: Men's Clothing) ==========
INSERT INTO category (name, slug, description, parent_category_id, is_active, display_order) VALUES
    ('Men''s T-Shirts', 'mens-tshirts', 'Casual and formal t-shirts for men', 
        (SELECT id FROM category WHERE slug = 'mens-clothing'), TRUE, 1),
    ('Men''s Jeans', 'mens-jeans', 'Denim jeans for men', 
        (SELECT id FROM category WHERE slug = 'mens-clothing'), TRUE, 2),
    ('Men''s Formal Shirts', 'mens-formal-shirts', 'Formal shirts for office wear', 
        (SELECT id FROM category WHERE slug = 'mens-clothing'), TRUE, 3),
    ('Men''s Jackets', 'mens-jackets', 'Jackets and outerwear for men', 
        (SELECT id FROM category WHERE slug = 'mens-clothing'), TRUE, 4)
ON CONFLICT (name) DO NOTHING;

-- Insert Tax Rates (India GST Example)
INSERT INTO tax_rates (country, state, tax_name, rate, is_active) VALUES
    ('India', NULL, 'GST 5%', 5.00, TRUE),
    ('India', NULL, 'GST 12%', 12.00, TRUE),
    ('India', NULL, 'GST 18%', 18.00, TRUE),
    ('India', NULL, 'GST 28%', 28.00, TRUE),
    ('USA', NULL, 'Sales Tax', 7.00, TRUE),
    ('UK', NULL, 'VAT', 20.00, TRUE)
ON CONFLICT DO NOTHING;

-- Insert Sample Coupon Codes
INSERT INTO coupon_code (code, discount_type, discount_value, min_purchase_amount, max_discount_amount, valid_from, valid_to, usage_limit, usage_per_user, is_active) VALUES
    ('WELCOME10', 'percentage', 10.00, 500.00, 100.00, 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 1000, 1, TRUE),
    ('SAVE50', 'fixed', 50.00, 500.00, NULL, 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 500, 1, TRUE),
    ('FESTIVE20', 'percentage', 20.00, 1000.00, 200.00, 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '15 days', NULL, 2, TRUE),
    ('FREESHIP', 'fixed', 0.00, 299.00, NULL, 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '60 days', NULL, 1, TRUE)
ON CONFLICT (code) DO NOTHING;
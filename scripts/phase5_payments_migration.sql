-- scripts/phase5_payments_migration.sql
-- ============================================================
-- scripts/phase5_payments_migration.sql
-- Adds payments tracking table for Razorpay integration
-- Run before starting the payments module
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    id                  SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    razorpay_order_id   VARCHAR(100) UNIQUE NOT NULL,   -- rp order id (order_XXXX)
    razorpay_payment_id VARCHAR(100),                   -- rp payment id after capture
    razorpay_signature  VARCHAR(255),                   -- webhook signature stored for audit
    amount              DECIMAL(10, 2) NOT NULL,        -- in INR
    currency            VARCHAR(10) DEFAULT 'INR',
    status              VARCHAR(50)  DEFAULT 'created'  -- created|authorized|captured|failed|refunded
        CHECK (status IN ('created','authorized','captured','failed','refunded')),
    method              VARCHAR(50),                    -- upi|card|netbanking|wallet|emi
    failure_reason      TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id          ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status            ON payments(status);

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Phase 5 Payments Migration Complete';
    RAISE NOTICE 'payments table : created';
    RAISE NOTICE '============================================';
END $$;
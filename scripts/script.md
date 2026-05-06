# 📂 scripts/ — Database Scripts Guide

This folder contains ALL SQL scripts for the Smart Cart project.  
Run them **in order**. Each script is self-contained and idempotent (safe to re-run).

---

## 🗂 Script Index

| File | Purpose | Run When | Phase |
|---|---|---|---|
| `01_schema.sql` | Creates all 20 tables, indexes, triggers | Once — project start | Foundation |
| `02_seed_reference_data.sql` | Inserts static data (roles, states, methods, categories) | Once — after schema | Foundation |
| `phase1_auth_migration.sql` | Adds `refresh_tokens`, `coupon_usage`, `user_login_audit` tables + functions | Before Auth Module | Phase 1 |
| `verify_schema.sql` | Full DB health check — tables, rows, indexes, triggers | Anytime | All |

> **Scripts for Phase 2–7 will be added here as each phase begins.**

---

## ▶️ How to Run Scripts

### Option A — pgAdmin (GUI)
1. Open pgAdmin → Connect to your `smartcart` DB
2. Click **Query Tool** (top toolbar)
3. Open the script file: File → Open → select the `.sql` file
4. Press **F5** or click ▶ Execute
5. Check the **Messages** tab at the bottom for `RAISE NOTICE` output

### Option B — psql (Terminal)
```bash
# Connect and run all scripts in order
psql -U postgres -d smartcart -f scripts/01_schema.sql
psql -U postgres -d smartcart -f scripts/02_seed_reference_data.sql
psql -U postgres -d smartcart -f scripts/phase1_auth_migration.sql

# Run health check anytime
psql -U postgres -d smartcart -f scripts/verify_schema.sql
```

### Option C — Python (from backend)
```python
import asyncpg, asyncio

async def run_script(filepath: str):
    conn = await asyncpg.connect("postgresql://postgres:password@localhost/smartcart")
    with open(filepath, "r") as f:
        sql = f.read()
    await conn.execute(sql)
    await conn.close()
    print(f"✅ Executed: {filepath}")

asyncio.run(run_script("scripts/02_seed_reference_data.sql"))
```

---

## ✅ Execution Checklist

```
[ ] 01_schema.sql              → Run in pgAdmin or psql
[ ] 02_seed_reference_data.sql → Run immediately after schema
[ ] phase1_auth_migration.sql  → Run before building Auth Module
[ ] verify_schema.sql          → Run to confirm everything is correct
```

After running all 4:
- You should see **23+ tables** in Section 1 of verify_schema output
- All reference table checks should show **✅ OK**
- All Phase 1 module readiness checks should show **✅ Ready**

---

## 📋 What Each Script Adds

### `02_seed_reference_data.sql`
- **3 Roles:** CUSTOMER, SELLER, ADMIN
- **11 Order States:** PENDING → DELIVERED → REFUNDED (full state machine)
- **8 Payment Methods:** UPI, Credit Card, Debit Card, Net Banking, Wallet, COD, EMI, Bank Transfer
- **7 Payment Statuses:** PENDING, AUTHORIZED, PAID, FAILED, REFUND_PENDING, REFUNDED, PARTIALLY_REFUNDED
- **6 Tax Rates:** GST 0%, 5%, 12%, 18%, 28% + Maharashtra specific
- **19 Categories:** 10 top-level + 9 sub-categories (Electronics, Fashion, Home & Kitchen)
- **4 Sample Coupons:** WELCOME10, FLAT100, SAVE20, FIRSTORDER

### `phase1_auth_migration.sql`
- **`refresh_tokens` table** — JWT refresh token storage (hashed, revocable)
- **`coupon_usage` table** — Tracks which user used which coupon (for per-user limits)
- **`user_login_audit` table** — Logs every login attempt (success + failure)
- **`cleanup_expired_tokens()` function** — Purges expired tokens (run periodically)
- **`get_user_with_roles()` function** — Fetches user + roles in one query (used by auth service)

---

## 🔮 Upcoming Scripts (Added Per Phase)

| Script | Phase | What It Does |
|---|---|---|
| `phase2_catalog_migration.sql` | Phase 2 | Full-text search indexes (`tsvector`), product search function |
| `phase3_cart_migration.sql` | Phase 3 | Guest cart session table, cart merge function |
| `phase4_orders_migration.sql` | Phase 4 | Order number generator function, inventory lock procedure |
| `phase5_reviews_migration.sql` | Phase 5 | Review eligibility check function |
| `phase6_admin_migration.sql` | Phase 6 | Admin reporting views (sales summary, top products) |
| `99_sample_data.sql` | Testing | 5 sample users, 20 products, 10 orders for local testing |

---

## ⚠️ Important Rules

1. **Never edit `01_schema.sql`** after running it in production. Use migration scripts instead.
2. **All scripts are idempotent** — `IF NOT EXISTS`, `ON CONFLICT DO NOTHING` used throughout. Safe to re-run.
3. **Run `verify_schema.sql`** after any migration to confirm correctness.
4. **In production (AWS RDS):** Use a migration tool like Flyway or Liquibase to version-control these scripts.
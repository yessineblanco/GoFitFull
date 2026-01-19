-- Remove old admin_audit_log table (singular) 
-- We're using admin_audit_logs (plural) instead
-- 
-- IMPORTANT: Make sure admin_audit_logs table exists before running this!
-- Run create_admin_audit_logs.sql first if you haven't already.

-- Step 1: Migrate any existing data from old table to new table (if any exists)
-- This will only insert records that don't already exist (based on id)
INSERT INTO public.admin_audit_logs (
    id,
    admin_user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent,
    created_at
)
SELECT 
    id,
    admin_user_id,
    action::VARCHAR(100),  -- Cast TEXT to VARCHAR(100)
    resource_type::VARCHAR(50),  -- Cast TEXT to VARCHAR(50)
    resource_id,
    details,
    CASE 
        WHEN LENGTH(ip_address) > 45 THEN LEFT(ip_address, 45)
        ELSE ip_address::VARCHAR(45)
    END as ip_address,  -- Cast and truncate if needed
    user_agent,
    created_at
FROM public.admin_audit_log
WHERE NOT EXISTS (
    SELECT 1 FROM public.admin_audit_logs 
    WHERE admin_audit_logs.id = admin_audit_log.id
);

-- Step 2: Drop the old table and its dependencies
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;

-- Verify the cleanup
-- You can run this query to confirm the old table is gone:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'admin_audit_log';
-- (Should return 0 rows)

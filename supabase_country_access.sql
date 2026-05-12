-- ============================================
-- BlackDrivo — User Country Access
-- Run in Supabase SQL Editor
-- ============================================

-- Add country_access to users table
-- Values: 'PK' | 'US' | 'ALL' (super_admin only)
alter table users add column if not exists country_access text default 'US';

-- Super admins get ALL access
update users set country_access = 'ALL' where role = 'super_admin';

-- Update existing users (set to US as default, admin can change)
update users set country_access = 'US' where country_access is null and role != 'super_admin';

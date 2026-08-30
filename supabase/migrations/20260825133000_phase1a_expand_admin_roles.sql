-- Phase 1A: expand administrative roles without rewriting existing profile rows.
-- OWNER is intentionally not part of public.app_role and must never be assignable
-- through the normal admin role workflow.

alter type public.app_role add value if not exists 'PLATFORM_ADMIN';
alter type public.app_role add value if not exists 'OPERATIONS_MANAGER';
alter type public.app_role add value if not exists 'CONTENT_MANAGER';
alter type public.app_role add value if not exists 'USER_MANAGER';
alter type public.app_role add value if not exists 'SUPPORT_AGENT';
alter type public.app_role add value if not exists 'FINANCE_MANAGER';
alter type public.app_role add value if not exists 'MARKETING_MANAGER';
alter type public.app_role add value if not exists 'SECURITY_AUDITOR';
alter type public.app_role add value if not exists 'ANALYST';

comment on type public.app_role is
'Brand Box application roles. Legacy ADMIN and SUPPORT remain valid for compatibility. OWNER is a protected platform concept and is not stored as an assignable app_role.';

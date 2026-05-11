-- Partial index for the SSO email-domain lookup.
--
-- Only enterprise tenants populate this — for the vast majority of rows
-- both predicates are false, so the index stays small.
--
-- CONCURRENTLY because tenants is a hot read table.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_sso_required_domain
  ON tenants (sso_email_domain)
  WHERE sso_required = true AND sso_email_domain IS NOT NULL;

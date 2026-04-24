-- ============================================================
-- site_content_posts のRLSポリシーを super_admin 限定に強化
-- 加盟店（owner/admin/staff/viewer）はDB直接操作でも変更不可
-- ============================================================

-- 既存ポリシーを削除（冪等性のため新ポリシーも一旦削除）
DROP POLICY IF EXISTS "site_content_posts_select_own_tenant" ON site_content_posts;
DROP POLICY IF EXISTS "site_content_posts_insert_own_tenant" ON site_content_posts;
DROP POLICY IF EXISTS "site_content_posts_update_own_tenant" ON site_content_posts;
DROP POLICY IF EXISTS "site_content_posts_delete_own_tenant" ON site_content_posts;
DROP POLICY IF EXISTS "site_content_posts_select_super_admin" ON site_content_posts;
DROP POLICY IF EXISTS "site_content_posts_insert_super_admin" ON site_content_posts;
DROP POLICY IF EXISTS "site_content_posts_update_super_admin" ON site_content_posts;
DROP POLICY IF EXISTS "site_content_posts_delete_super_admin" ON site_content_posts;

-- super_admin 判定ヘルパー
CREATE OR REPLACE FUNCTION is_super_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  );
$$;

-- 閲覧: 公開済みは誰でも可（既存ポリシー site_content_posts_select_published を継続）
--      ドラフト・アーカイブの閲覧は super_admin のみ
CREATE POLICY "site_content_posts_select_super_admin" ON site_content_posts
  FOR SELECT
  TO authenticated
  USING (is_super_admin_user());

-- 作成・更新・削除: super_admin のみ
CREATE POLICY "site_content_posts_insert_super_admin" ON site_content_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin_user());

CREATE POLICY "site_content_posts_update_super_admin" ON site_content_posts
  FOR UPDATE
  TO authenticated
  USING (is_super_admin_user())
  WITH CHECK (is_super_admin_user());

CREATE POLICY "site_content_posts_delete_super_admin" ON site_content_posts
  FOR DELETE
  TO authenticated
  USING (is_super_admin_user());

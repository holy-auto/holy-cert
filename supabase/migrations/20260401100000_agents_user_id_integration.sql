-- =============================================================================
-- Migration: agents テーブルに user_id を追加（施工店・代理店アカウント統合）
-- 目的: 単一の auth.users ユーザーが施工店と代理店の両ロールを持てるようにする
-- =============================================================================

-- 1. agents テーブルに user_id カラムを追加
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. インデックス作成（代理店チェック用）
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);

-- 3. 既存データのバックフィル: agents.email と auth.users.email を突き合わせて user_id を設定
UPDATE agents a
SET user_id = u.id
FROM auth.users u
WHERE a.email = u.email
  AND a.user_id IS NULL;

-- 4. get_my_agent_status RPC を更新（user_id ベースのルックアップを優先）
CREATE OR REPLACE FUNCTION get_my_agent_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result  json;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'agent_id',   a.id,
    'agent_name', a.company_name,
    'status',     a.status
  )
  INTO v_result
  FROM agents a
  WHERE a.user_id = v_user_id
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- 5. RLS ポリシー更新
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーを削除して再作成（冪等対応）
DROP POLICY IF EXISTS "agents_select_own" ON agents;
DROP POLICY IF EXISTS "agents_update_own" ON agents;

CREATE POLICY "agents_select_own" ON agents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "agents_update_own" ON agents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 管理者（service_role）はすべてのレコードにアクセス可能
-- ※ service_role は RLS をバイパスするため明示不要

-- 6. active_context Cookie 対応用: ユーザーのロール判定ヘルパー関数
--    施工店 / 代理店 / 両方 のどれに属するかを返す
CREATE OR REPLACE FUNCTION get_my_user_contexts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID;
  v_has_shop     BOOLEAN := FALSE;
  v_has_agent    BOOLEAN := FALSE;
  v_tenant_id    UUID;
  v_agent_id     UUID;
  v_agent_name   TEXT;
  v_agent_status TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 施工店メンバーシップ確認
  SELECT tm.tenant_id
  INTO v_tenant_id
  FROM tenant_memberships tm
  WHERE tm.user_id = v_user_id
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    v_has_shop := TRUE;
  END IF;

  -- 代理店確認
  SELECT a.id, a.company_name, a.status
  INTO v_agent_id, v_agent_name, v_agent_status
  FROM agents a
  WHERE a.user_id = v_user_id
  LIMIT 1;

  IF v_agent_id IS NOT NULL THEN
    v_has_agent := TRUE;
  END IF;

  RETURN json_build_object(
    'has_shop',     v_has_shop,
    'has_agent',    v_has_agent,
    'tenant_id',    v_tenant_id,
    'agent_id',     v_agent_id,
    'agent_name',   v_agent_name,
    'agent_status', v_agent_status
  );
END;
$$;

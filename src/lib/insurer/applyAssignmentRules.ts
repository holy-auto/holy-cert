/**
 * 保険案件 自動振り分けルールエンジン (純関数)。
 *
 * 既存の insurer_assignment_rules テーブル (id / condition_type / condition_value /
 * assign_to / is_active) に保存されたルールを、新規 case 作成時に評価して
 * `assigned_to` を返す。マッチが無ければ null。
 *
 * 設計:
 * - 純関数なので DB / API には依存しない (テスト容易性)
 * - is_active は呼び出し側で事前フィルタする想定
 * - 同じ insurer に複数ルールがある場合、配列の先頭から評価し「最初の一致」を採用
 *   (ユーザの ORDER BY を尊重するため、関数内で並べ替えはしない)
 * - condition_type は将来増える可能性があるが、未知のタイプは「マッチしない」
 *   として安全側に倒す (= 振り分け失敗 → 人間が手動でアサイン)
 */

export type AssignmentConditionType = "category" | "tenant" | "priority";

export interface AssignmentRule {
  id: string;
  condition_type: string;
  condition_value: string;
  assign_to: string;
  is_active?: boolean;
  /** UI 上のラベル。マッチログに使う */
  name?: string;
}

export interface CaseInputForAssignment {
  priority?: string | null;
  category?: string | null;
  tenant_id?: string | null;
}

export interface AssignmentMatch {
  ruleId: string;
  ruleName?: string;
  assignedTo: string;
}

/**
 * Evaluate one rule against a case. Pure / synchronous.
 */
function evaluateRule(rule: AssignmentRule, input: CaseInputForAssignment): boolean {
  if (rule.is_active === false) return false;
  const value = (rule.condition_value ?? "").trim();
  if (!value) return false;

  switch (rule.condition_type as AssignmentConditionType) {
    case "category": {
      const cat = (input.category ?? "").trim();
      if (!cat) return false;
      return cat.toLowerCase() === value.toLowerCase();
    }
    case "priority": {
      const p = (input.priority ?? "").trim();
      if (!p) return false;
      return p.toLowerCase() === value.toLowerCase();
    }
    case "tenant": {
      const t = (input.tenant_id ?? "").trim();
      if (!t) return false;
      return t === value;
    }
    default:
      // 未知の condition_type → マッチさせない (= 人間が手動アサイン)
      return false;
  }
}

/**
 * 配列の先頭から評価し、最初にマッチしたルールの assignTo を返す。
 * マッチ無し or 入力空なら null。
 */
export function applyAssignmentRules(rules: AssignmentRule[], input: CaseInputForAssignment): AssignmentMatch | null {
  if (!rules?.length) return null;
  for (const rule of rules) {
    if (!rule.assign_to) continue;
    if (evaluateRule(rule, input)) {
      return { ruleId: rule.id, ruleName: rule.name, assignedTo: rule.assign_to };
    }
  }
  return null;
}

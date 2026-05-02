import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2JobWorkflow: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/reservations.png"
      step="手順 2"
      title="整備案件のワークフロー"
      description="予約を「受付」すると整備案件が自動作成されます。担当スタッフへの割り当て・使用部品の記録・写真の添付が可能です。作業完了後に「完了」にすると証明書発行ボタンが有効になります。"
      subtext="案件のステータス変更は、顧客のスマートフォンにも自動通知されます（SMS連携設定時）。"
    />
  </AbsoluteFill>
);

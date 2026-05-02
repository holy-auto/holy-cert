import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2CustomerList: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/customers-list.png"
      step="確認 1"
      title="お客様一覧"
      description="「顧客」メニューでは登録済みのお客様一覧が表示されます。氏名・連絡先・保有車両数・最終来店日を一覧で確認できます。名前や車両番号で検索・フィルターが可能です。"
      subtext="お客様の来店ポイントや特記事項は顧客詳細ページで管理します。"
    />
  </AbsoluteFill>
);

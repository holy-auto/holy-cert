import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2Settings: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/settings.png"
      step="確認 1"
      title="設定 — 基本情報"
      description="「設定」メニューではショップ名・住所・ロゴ・営業時間・予約受付設定などを変更できます。変更内容は即座にお客様向けページに反映されます。"
      subtext="Supabase連携・Square連携・外部API設定もこのページから行います。"
    />
  </AbsoluteFill>
);

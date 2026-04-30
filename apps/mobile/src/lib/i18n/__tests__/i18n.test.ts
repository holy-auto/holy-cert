import { describe, expect, it, beforeEach } from "vitest";
import { t, setLocale, getLocale } from "../index";

describe("i18n", () => {
  beforeEach(() => setLocale("ja"));

  it("ja でドット区切りキーを解決できる", () => {
    expect(t("common.save")).toBe("保存");
    expect(t("home.today_reservations")).toBe("今日の予約");
    expect(t("nfc.write_start")).toBe("書込み開始");
  });

  it("setLocale('en') 後は英語が返る", () => {
    setLocale("en");
    expect(t("common.save")).toBe("Save");
    expect(t("home.today_reservations")).toBe("Today's Reservations");
  });

  it("getLocale は現在のロケールを返す", () => {
    setLocale("en");
    expect(getLocale()).toBe("en");
    setLocale("ja");
    expect(getLocale()).toBe("ja");
  });

  it("未定義キーは key 自体を返す (壊れない)", () => {
    // 型は MessageKey に縛られているため as any でランタイム動作を検証
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(t("does.not.exist" as any)).toBe("does.not.exist");
  });
});

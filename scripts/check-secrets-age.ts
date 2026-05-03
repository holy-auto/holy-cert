#!/usr/bin/env tsx
/**
 * scripts/check-secrets-age.ts
 *
 * 環境変数で管理される secret の最終ローテーション日を `.secrets-age.json`
 * から読み、閾値超過のものを CI で fail させる。
 *
 * 使い方:
 *   tsx scripts/check-secrets-age.ts            # CI で実行
 *   tsx scripts/check-secrets-age.ts --update SUPABASE_SERVICE_ROLE_KEY
 *
 * `.secrets-age.json` (リポジトリにコミット):
 *   {
 *     "SUPABASE_SERVICE_ROLE_KEY": { "rotated_at": "2026-01-12", "ttl_days": 180 },
 *     "STRIPE_WEBHOOK_SECRET":     { "rotated_at": "2026-04-01", "ttl_days": 365 },
 *     ...
 *   }
 *
 * `--update <NAME>` を実行すると `rotated_at` を今日に更新する。
 * 実際の secret 値は本ファイルでも `.secrets-age.json` でも扱わない。
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

interface Entry {
  rotated_at: string; // YYYY-MM-DD
  ttl_days: number;
  notes?: string;
}

type AgeMap = Record<string, Entry>;

const FILE = resolve(process.cwd(), ".secrets-age.json");

function load(): AgeMap {
  if (!existsSync(FILE)) return {};
  return JSON.parse(readFileSync(FILE, "utf8")) as AgeMap;
}

function save(map: AgeMap): void {
  writeFileSync(FILE, JSON.stringify(map, null, 2) + "\n", "utf8");
}

function daysSince(yyyymmdd: string): number {
  const t = new Date(`${yyyymmdd}T00:00:00Z`).getTime();
  if (Number.isNaN(t)) throw new Error(`invalid date: ${yyyymmdd}`);
  return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--update" && args[1]) {
    const map = load();
    const name = args[1];
    map[name] = { ...(map[name] ?? { ttl_days: 180 }), rotated_at: todayIso() };
    save(map);
    console.log(`updated ${name} → rotated_at=${todayIso()}`);
    return;
  }

  const map = load();
  let warn = 0;
  let fail = 0;

  for (const [name, entry] of Object.entries(map)) {
    const age = daysSince(entry.rotated_at);
    const remaining = entry.ttl_days - age;
    if (remaining < 0) {
      console.error(`✘ ${name}: OVERDUE by ${-remaining} days (TTL ${entry.ttl_days})`);
      fail += 1;
    } else if (remaining < 30) {
      console.warn(`⚠ ${name}: rotation due in ${remaining} days`);
      warn += 1;
    } else {
      console.log(`✓ ${name}: ${remaining} days remaining`);
    }
  }

  if (fail > 0) {
    console.error(`\n${fail} secret(s) overdue for rotation.`);
    process.exit(1);
  }
  if (warn > 0) {
    console.warn(`\n${warn} secret(s) due within 30 days.`);
    process.exitCode = 0;
  }
}

main();

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,tsx}"],
    setupFiles: ["src/lib/__tests__/setup.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**"],
      thresholds: {
        // 現在のカバレッジ実態 (statements 27% / branches 24% / functions 26% / lines 27%) に
        // 合わせ、リグレッション検知用の floor として +2pt 程度のバッファで設定する。
        // 新規テスト追加でゆっくり引き上げていく前提。
        statements: 25,
        branches: 22,
        functions: 25,
        lines: 25,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { escapePostgrestValue, escapeIlike, escapeHtml } from "@/lib/sanitize";
import { sanitizeErrorMessage } from "@/lib/api/response";

// ---------------------------------------------------------------------------
// sanitizeErrorMessage
// ---------------------------------------------------------------------------
describe("sanitizeErrorMessage", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns actual error message in development", () => {
    // Temporarily set NODE_ENV to "development" - sanitizeErrorMessage reads it at call time
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const result = sanitizeErrorMessage(new Error("DB connection failed"));
      expect(result).toBe("DB connection failed");
    } finally {
      process.env.NODE_ENV = orig;
    }
  });

  it("returns fallback for Error objects in non-development mode", () => {
    vi.stubEnv("NODE_ENV", "production");

    const result = sanitizeErrorMessage(new Error("secret internal error detail"));
    expect(result).toBe("処理中にエラーが発生しました。");
  });

  it("returns fallback for string errors in non-development mode", () => {
    vi.stubEnv("NODE_ENV", "production");

    const result = sanitizeErrorMessage("raw error string");
    expect(result).toBe("処理中にエラーが発生しました。");
  });

  it("uses custom fallback text when provided", () => {
    vi.stubEnv("NODE_ENV", "production");

    const result = sanitizeErrorMessage(
      new Error("internal"),
      "カスタムエラーメッセージ",
    );
    expect(result).toBe("カスタムエラーメッセージ");
  });
});

// ---------------------------------------------------------------------------
// escapePostgrestValue
// ---------------------------------------------------------------------------
describe("escapePostgrestValue", () => {
  it("removes commas from value", () => {
    expect(escapePostgrestValue("a,b,c")).toBe("abc");
  });

  it("removes parentheses from value", () => {
    expect(escapePostgrestValue("foo(bar)")).toBe("foobar");
  });

  it("removes mixed PostgREST metacharacters", () => {
    expect(escapePostgrestValue("name.eq(val,1)")).toBe("name.eqval1");
  });

  it("leaves normal strings unchanged", () => {
    expect(escapePostgrestValue("hello world")).toBe("hello world");
    expect(escapePostgrestValue("simple-value_123")).toBe("simple-value_123");
  });

  it("handles empty string", () => {
    expect(escapePostgrestValue("")).toBe("");
  });

  it("handles string with only metacharacters", () => {
    expect(escapePostgrestValue(",()")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// escapeIlike
// ---------------------------------------------------------------------------
describe("escapeIlike", () => {
  it("escapes percent wildcard", () => {
    expect(escapeIlike("100%")).toBe("100\\%");
  });

  it("escapes underscore wildcard", () => {
    expect(escapeIlike("user_name")).toBe("user\\_name");
  });

  it("escapes backslash", () => {
    expect(escapeIlike("path\\to")).toBe("path\\\\to");
  });

  it("escapes multiple special characters", () => {
    expect(escapeIlike("%_\\")).toBe("\\%\\_\\\\");
  });

  it("leaves normal strings unchanged", () => {
    expect(escapeIlike("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeIlike("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------
describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("A&B")).toBe("A&amp;B");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("handles combined special characters", () => {
    expect(escapeHtml('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

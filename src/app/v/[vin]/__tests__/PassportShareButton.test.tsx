// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PassportShareButton from "../PassportShareButton";

const baseProps = {
  vehicleLabel: "Honda NSX 2020",
  vinCodeNormalized: "JH4DC53001S000001",
  anchoredCertCount: 3,
};

function stubLocation(href: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href },
  });
}

function buttonText(): string {
  return screen.getByRole("button").textContent ?? "";
}

describe("PassportShareButton", () => {
  beforeEach(() => {
    stubLocation("https://ledra.example.com/v/JH4DC53001S000001");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // Remove navigator.share between tests so the env stays consistent.
    if ("share" in navigator) {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    }
  });

  it("falls back to clipboard when Web Share is unsupported", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<PassportShareButton {...baseProps} />);

    expect(buttonText()).toContain("URL をコピー");

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("https://ledra.example.com/v/JH4DC53001S000001");
    await waitFor(() => expect(buttonText()).toContain("URL をコピーしました"));
  });

  it("uses Web Share when available and reports 'shared' feedback", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    render(<PassportShareButton {...baseProps} />);

    await waitFor(() => expect(buttonText()).toContain("このパスポートを共有"));

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://ledra.example.com/v/JH4DC53001S000001",
        title: expect.stringContaining("Honda NSX 2020"),
        text: expect.stringContaining("JH4DC53001S000001"),
      }),
    );
    await waitFor(() => expect(buttonText()).toContain("共有しました"));
  });

  it("silently ignores user-cancelled Web Share (AbortError)", async () => {
    const abort = Object.assign(new Error("cancelled"), { name: "AbortError" });
    const share = vi.fn().mockRejectedValue(abort);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<PassportShareButton {...baseProps} />);
    await waitFor(() => expect(buttonText()).toContain("このパスポートを共有"));

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(share).toHaveBeenCalled());
    // Clipboard should NOT be invoked because abort is treated as a no-op.
    expect(writeText).not.toHaveBeenCalled();
    // Label stays in the unshared state (no transient feedback).
    await waitFor(() => expect(buttonText()).toContain("このパスポートを共有"));
  });

  it("falls back to clipboard when Web Share throws a non-abort error", async () => {
    const share = vi.fn().mockRejectedValue(new Error("permission denied"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<PassportShareButton {...baseProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(buttonText()).toContain("URL をコピーしました"));
  });

  it("surfaces an error label when clipboard fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<PassportShareButton {...baseProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(buttonText()).toContain("コピーに失敗しました"));
  });
});

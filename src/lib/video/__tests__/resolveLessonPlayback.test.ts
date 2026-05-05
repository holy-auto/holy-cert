import { describe, it, expect, beforeEach } from "vitest";
import { resolveLessonPlayback, type LessonVideoFields } from "@/lib/video/resolveLessonPlayback";

function lesson(over: Partial<LessonVideoFields> = {}): LessonVideoFields {
  return {
    video_url: null,
    video_provider: null,
    video_asset_id: null,
    video_playback_id: null,
    video_status: null,
    video_duration_sec: null,
    ...over,
  };
}

describe("resolveLessonPlayback", () => {
  beforeEach(() => {
    delete process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;
  });

  it("returns missing when nothing is set", () => {
    const r = resolveLessonPlayback(lesson());
    expect(r.status).toBe("missing");
    expect(r.ready).toBe(false);
    expect(r.playback_url).toBeNull();
  });

  it("returns pending playback URL when status='pending'", () => {
    const r = resolveLessonPlayback(
      lesson({
        video_provider: "cloudflare",
        video_asset_id: "uid-1",
        video_playback_id: "uid-1",
        video_status: "pending",
      }),
    );
    expect(r.status).toBe("pending");
    expect(r.ready).toBe(false);
    expect(r.playback_url).toBeNull();
  });

  it("returns CFS HLS URL when status='ready'", () => {
    const r = resolveLessonPlayback(
      lesson({
        video_provider: "cloudflare",
        video_asset_id: "uid-1",
        video_playback_id: "uid-1",
        video_status: "ready",
        video_duration_sec: 600,
      }),
    );
    expect(r.status).toBe("ready");
    expect(r.ready).toBe(true);
    expect(r.playback_url).toContain("/uid-1/manifest/video.m3u8");
    expect(r.duration_sec).toBe(600);
  });

  it("falls back to legacy YouTube URL → youtube provider", () => {
    const r = resolveLessonPlayback(lesson({ video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }));
    expect(r.provider).toBe("youtube");
    expect(r.playback_url).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("falls back to legacy youtu.be short URL", () => {
    const r = resolveLessonPlayback(lesson({ video_url: "https://youtu.be/abcDEF12345" }));
    expect(r.provider).toBe("youtube");
    expect(r.playback_url).toContain("/embed/abcDEF12345");
  });

  it("treats unknown legacy URL as external pass-through", () => {
    const r = resolveLessonPlayback(lesson({ video_url: "https://cdn.example.com/lesson.mp4" }));
    expect(r.provider).toBe("external");
    expect(r.playback_url).toBe("https://cdn.example.com/lesson.mp4");
    expect(r.ready).toBe(true);
  });

  it("modern provider columns take precedence over legacy video_url", () => {
    const r = resolveLessonPlayback(
      lesson({
        video_url: "https://legacy.example.com/x.mp4",
        video_provider: "cloudflare",
        video_asset_id: "uid-x",
        video_playback_id: "uid-x",
        video_status: "ready",
      }),
    );
    expect(r.provider).toBe("cloudflare");
    expect(r.playback_url).toContain("/uid-x/manifest/video.m3u8");
  });
});

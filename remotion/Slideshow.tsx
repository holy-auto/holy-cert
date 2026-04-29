import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONT } from "./components/shared";

export interface SlideDef {
  component: React.FC;
  /** フレーム数。省略時は durationInFrames / slides.length で均等分割 */
  frames?: number;
}

interface SlideshowProps {
  slides: SlideDef[];
  /** 各スライドのデフォルトフレーム数 (デフォルト 810 = 27s @30fps) */
  defaultFrames?: number;
}

function SlideTransition({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame, fps, config: { damping: 20 }, durationInFrames: 20 });
  const y = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>
      {children}
    </AbsoluteFill>
  );
}

export function Slideshow({ slides, defaultFrames = 810 }: SlideshowProps) {
  let offset = 0;

  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      {slides.map((slide, i) => {
        const frames = slide.frames ?? defaultFrames;
        const from = offset;
        offset += frames;
        const SlideComponent = slide.component;
        return (
          <Sequence key={i} from={from} durationInFrames={frames}>
            <SlideTransition>
              <SlideComponent />
            </SlideTransition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

/** スライド配列から合計フレーム数を計算 */
export function totalFrames(slides: SlideDef[], defaultFrames = 810): number {
  return slides.reduce((sum, s) => sum + (s.frames ?? defaultFrames), 0);
}

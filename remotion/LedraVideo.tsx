import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TitleSlide } from "./slides/TitleSlide";
import { ProblemsSlide } from "./slides/ProblemsSlide";
import { SolutionSlide } from "./slides/SolutionSlide";
import { PortalsSlide } from "./slides/PortalsSlide";
import { CertificateSlide } from "./slides/CertificateSlide";
import { WorkflowSlide } from "./slides/WorkflowSlide";
import { InsurerSlide } from "./slides/InsurerSlide";
import { BtoBSlide } from "./slides/BtoBSlide";
import { TechSlide } from "./slides/TechSlide";
import { CTASlide } from "./slides/CTASlide";

// Each slide is 27s = 810 frames @30fps
const SLIDE_FRAMES = 810;

export const LedraVideo: React.FC = () => {
  const slides = [
    TitleSlide,
    ProblemsSlide,
    SolutionSlide,
    PortalsSlide,
    CertificateSlide,
    WorkflowSlide,
    InsurerSlide,
    BtoBSlide,
    TechSlide,
    CTASlide,
  ];

  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: "sans-serif" }}>
      {slides.map((SlideComponent, i) => (
        <Sequence key={i} from={i * SLIDE_FRAMES} durationInFrames={SLIDE_FRAMES}>
          <SlideTransition>
            <SlideComponent />
          </SlideTransition>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

function SlideTransition({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({ frame, fps, config: { damping: 20 }, durationInFrames: 20 });
  const translateY = interpolate(frame, [0, 20], [24, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

import { registerRoot, Composition } from "remotion";
import { Slideshow, totalFrames, type SlideDef } from "./Slideshow";

// ── 説明会 ────────────────────────────────────────────────────────────
import { LedraVideo } from "./LedraVideo";

// ── Admin オンボーディング ─────────────────────────────────────────────
import { AdminWelcome } from "./slides/admin-onboarding/Welcome";
import { AdminInitialSetup } from "./slides/admin-onboarding/InitialSetup";
import { AdminRegisterData } from "./slides/admin-onboarding/RegisterData";
import { AdminFirstCertificate } from "./slides/admin-onboarding/FirstCertificate";
import { AdminFirstInvoice } from "./slides/admin-onboarding/FirstInvoice";
import { AdminNextSteps } from "./slides/admin-onboarding/NextSteps";

// ── Insurer オンボーディング ───────────────────────────────────────────
import { InsurerWelcome } from "./slides/insurer-onboarding/Welcome";
import { InsurerSearchCertificate } from "./slides/insurer-onboarding/SearchCertificate";
import { InsurerCaseManagement } from "./slides/insurer-onboarding/CaseManagement";
import { InsurerTeamAndAnalytics } from "./slides/insurer-onboarding/TeamAndAnalytics";

// ── Agent オンボーディング ─────────────────────────────────────────────
import { AgentWelcome } from "./slides/agent-onboarding/Welcome";
import { AgentReferralLink } from "./slides/agent-onboarding/ReferralLink";
import { AgentRegisterReferral } from "./slides/agent-onboarding/RegisterReferral";
import { AgentCommissionAndGrowth } from "./slides/agent-onboarding/CommissionAndGrowth";

// ── 証明書 深掘り ──────────────────────────────────────────────────────
import { CertStructure } from "./slides/certificate-deep/Structure";
import { CertOCRAndPhotos } from "./slides/certificate-deep/OCRAndPhotos";
import { CertQRAndURL } from "./slides/certificate-deep/QRAndURL";
import { CertBlockchain } from "./slides/certificate-deep/Blockchain";
import { CertBatchAndExport } from "./slides/certificate-deep/BatchAndExport";

// ── ワークフロー 深掘り ────────────────────────────────────────────────
import { WorkflowOverview } from "./slides/workflow-deep/Overview";
import { WorkflowStatusStepper } from "./slides/workflow-deep/StatusStepper";
import { WorkflowWalkIn } from "./slides/workflow-deep/WalkIn";
import { WorkflowDuplicateGuard } from "./slides/workflow-deep/DuplicateGuard";
import { WorkflowContextCarryover } from "./slides/workflow-deep/ContextCarryover";

// ─────────────────────────────────────────────────────────────────────
// スライド定義
// ─────────────────────────────────────────────────────────────────────

const ADMIN_SLIDES: SlideDef[] = [
  { component: AdminWelcome },
  { component: AdminInitialSetup },
  { component: AdminRegisterData },
  { component: AdminFirstCertificate },
  { component: AdminFirstInvoice },
  { component: AdminNextSteps },
];

const INSURER_SLIDES: SlideDef[] = [
  { component: InsurerWelcome },
  { component: InsurerSearchCertificate },
  { component: InsurerCaseManagement },
  { component: InsurerTeamAndAnalytics },
];

const AGENT_SLIDES: SlideDef[] = [
  { component: AgentWelcome },
  { component: AgentReferralLink },
  { component: AgentRegisterReferral },
  { component: AgentCommissionAndGrowth },
];

const CERT_SLIDES: SlideDef[] = [
  { component: CertStructure },
  { component: CertOCRAndPhotos },
  { component: CertQRAndURL },
  { component: CertBlockchain },
  { component: CertBatchAndExport },
];

const WORKFLOW_SLIDES: SlideDef[] = [
  { component: WorkflowOverview },
  { component: WorkflowStatusStepper },
  { component: WorkflowWalkIn },
  { component: WorkflowDuplicateGuard },
  { component: WorkflowContextCarryover },
];

// ─────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────

const FPS = 30;
const W = 1920;
const H = 1080;
const DEFAULT_FRAMES = 810; // 27s per slide

export const RemotionRoot = () => (
  <>
    {/* 説明会 (10スライド × 27s = 270s = 4.5min) */}
    <Composition
      id="LedraIntro"
      component={LedraVideo}
      durationInFrames={9000}
      fps={FPS} width={W} height={H}
      defaultProps={{}}
    />

    {/* Admin オンボーディング */}
    <Composition
      id="AdminOnboarding"
      component={Slideshow}
      durationInFrames={totalFrames(ADMIN_SLIDES, DEFAULT_FRAMES)}
      fps={FPS} width={W} height={H}
      defaultProps={{ slides: ADMIN_SLIDES, defaultFrames: DEFAULT_FRAMES }}
    />

    {/* Insurer オンボーディング */}
    <Composition
      id="InsurerOnboarding"
      component={Slideshow}
      durationInFrames={totalFrames(INSURER_SLIDES, DEFAULT_FRAMES)}
      fps={FPS} width={W} height={H}
      defaultProps={{ slides: INSURER_SLIDES, defaultFrames: DEFAULT_FRAMES }}
    />

    {/* Agent オンボーディング */}
    <Composition
      id="AgentOnboarding"
      component={Slideshow}
      durationInFrames={totalFrames(AGENT_SLIDES, DEFAULT_FRAMES)}
      fps={FPS} width={W} height={H}
      defaultProps={{ slides: AGENT_SLIDES, defaultFrames: DEFAULT_FRAMES }}
    />

    {/* 証明書 深掘り */}
    <Composition
      id="CertificateDeepDive"
      component={Slideshow}
      durationInFrames={totalFrames(CERT_SLIDES, DEFAULT_FRAMES)}
      fps={FPS} width={W} height={H}
      defaultProps={{ slides: CERT_SLIDES, defaultFrames: DEFAULT_FRAMES }}
    />

    {/* ワークフロー 深掘り */}
    <Composition
      id="WorkflowDeepDive"
      component={Slideshow}
      durationInFrames={totalFrames(WORKFLOW_SLIDES, DEFAULT_FRAMES)}
      fps={FPS} width={W} height={H}
      defaultProps={{ slides: WORKFLOW_SLIDES, defaultFrames: DEFAULT_FRAMES }}
    />
  </>
);

registerRoot(RemotionRoot);

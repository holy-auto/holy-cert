"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./motion-demo.module.css";
import { AdvancedSections } from "./AdvancedSections";

type SectionProps = {
  id: string;
  tag: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function Section({ id, tag, title, description, children }: SectionProps) {
  return (
    <section id={id} className={styles.section}>
      <header className={styles.sectionHeader}>
        <span className="section-tag">{tag}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionDesc}>{description}</p>
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function CountUp({ to, duration = 1600, suffix = "" }: { to: number; duration?: number; suffix?: string }) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible, to, duration]);
  return (
    <span ref={ref} className={styles.countUp}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

function RevealItem({
  children,
  delay = 0,
  variant = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  variant?: "up" | "left" | "right" | "scale" | "blur";
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${styles[`reveal_${variant}`]} ${visible ? styles.revealOn : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--rx", `${-y * 12}deg`);
    el.style.setProperty("--ry", `${x * 12}deg`);
    el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className={styles.tiltCard} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className={styles.tiltGlare} />
      <div className={styles.tiltContent}>{children}</div>
    </div>
  );
}

function Confetti({ run }: { run: number }) {
  if (!run) return null;
  const pieces = Array.from({ length: 28 });
  return (
    <div key={run} className={styles.confettiWrap} aria-hidden>
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 200;
        const dur = 1100 + Math.random() * 700;
        const hue = Math.floor(Math.random() * 360);
        const size = 6 + Math.random() * 8;
        const rot = Math.random() * 360;
        return (
          <span
            key={i}
            className={styles.confettiPiece}
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size * 1.4}px`,
              background: `hsl(${hue} 85% 60%)`,
              animationDelay: `${delay}ms`,
              animationDuration: `${dur}ms`,
              transform: `rotate(${rot}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

function CheckmarkDraw({ play }: { play: number }) {
  return (
    <svg
      key={play}
      className={styles.checkSvg}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        className={styles.checkCircle}
        cx="40"
        cy="40"
        r="36"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        className={styles.checkPath}
        d="M24 41 L36 53 L56 30"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Typewriter({ text, speed = 38 }: { text: string; speed?: number }) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!visible) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [visible, text, speed]);
  return (
    <span ref={ref} className={styles.typewriter}>
      {shown}
      <span className={styles.caret} />
    </span>
  );
}

const listData = [
  { id: "a", label: "証明書 #A-0421", status: "発行済み" },
  { id: "b", label: "証明書 #A-0422", status: "署名待ち" },
  { id: "c", label: "証明書 #A-0423", status: "下書き" },
  { id: "d", label: "証明書 #A-0424", status: "発行済み" },
];

export function MotionDemoClient() {
  const [accordion, setAccordion] = useState<string | null>("a");
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [items, setItems] = useState(listData);
  const [tab, setTab] = useState(0);
  const [liked, setLiked] = useState(false);
  const [checkPlay, setCheckPlay] = useState(0);
  const [confettiRun, setConfettiRun] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 2));
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  const pushToast = (text: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  };

  const shuffle = () => {
    setItems((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  const celebrate = () => {
    setCheckPlay((n) => n + 1);
    setConfettiRun((n) => n + 1);
    pushToast("発行が完了しました");
  };

  const tabs = ["概要", "タイムライン", "添付"];

  return (
    <main className={styles.page}>
      {/* HERO */}
      <header className={styles.hero}>
        <div className={styles.heroBg} aria-hidden>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.blob3} />
        </div>
        <div className={styles.heroInner}>
          <span className={`section-tag ${styles.heroTag}`}>Motion Lab</span>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroWord} style={{ animationDelay: "80ms" }}>
              動きで
            </span>
            <span className={styles.heroWord} style={{ animationDelay: "220ms" }}>
              伝わる
            </span>
            <span className={styles.heroWord} style={{ animationDelay: "360ms" }}>
              Ledra。
            </span>
          </h1>
          <p className={styles.heroLead}>
            <Typewriter text="スクロールしてモーションのカタログを確認してください。" />
          </p>
          <div className={styles.heroCtaRow}>
            <button type="button" className="btn-primary" data-size="lg" onClick={celebrate}>
              発行する
            </button>
            <button type="button" className="btn-secondary" data-size="lg" onClick={() => pushToast("保存しました")}>
              保存
            </button>
          </div>
        </div>
      </header>

      {/* MICRO-INTERACTIONS */}
      <Section
        id="micro"
        tag="01 · Micro"
        title="マイクロインタラクション"
        description="ホバー、押下、状態変化を拾う小さな動き。触れる前から押せるものに見える。"
      >
        <div className={styles.grid3}>
          <RevealItem>
            <div className={styles.card}>
              <p className={styles.cardLabel}>いいね</p>
              <button
                type="button"
                className={`${styles.heartBtn} ${liked ? styles.heartOn : ""}`}
                onClick={() => setLiked((v) => !v)}
                aria-pressed={liked}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 21s-7.5-4.5-10-9.5C0.5 8 2 4 6 4c2 0 3.5 1 4 2 0.5-1 2-2 4-2 4 0 5.5 4 4 7.5C19.5 16.5 12 21 12 21z" />
                </svg>
              </button>
            </div>
          </RevealItem>

          <RevealItem delay={80}>
            <div className={styles.card}>
              <p className={styles.cardLabel}>進捗リング</p>
              <div className={styles.ringWrap}>
                <svg viewBox="0 0 60 60" className={styles.ring}>
                  <circle cx="30" cy="30" r="26" className={styles.ringTrack} />
                  <circle
                    cx="30"
                    cy="30"
                    r="26"
                    className={styles.ringFill}
                    style={{ strokeDashoffset: 163.36 * (1 - progress / 100) }}
                  />
                </svg>
                <span className={styles.ringValue}>{progress}%</span>
              </div>
            </div>
          </RevealItem>

          <RevealItem delay={160}>
            <div className={styles.card}>
              <p className={styles.cardLabel}>トースト</p>
              <button type="button" className="btn-outline" onClick={() => pushToast("通知を送信しました")}>
                通知を表示
              </button>
            </div>
          </RevealItem>
        </div>
      </Section>

      {/* ENTRANCE & STAGGER */}
      <Section
        id="entrance"
        tag="02 · Entrance"
        title="エントランス & スタッガー"
        description="スクロールで順番に現れる。視線を誘導しながらストレスなく情報を渡す。"
      >
        <div className={styles.grid4}>
          {["安全", "透明", "速い", "つながる"].map((t, i) => (
            <RevealItem key={t} delay={i * 90} variant="up">
              <div className={styles.statCard}>
                <span className={styles.statLabel}>{t}</span>
                <CountUp to={[128, 64, 99, 1200][i]} suffix={["件", "%", "%", "社"][i]} />
              </div>
            </RevealItem>
          ))}
        </div>
        <div className={styles.grid3} style={{ marginTop: "1.5rem" }}>
          <RevealItem variant="left">
            <div className={styles.card}>
              <p className={styles.cardLabel}>左からスライド</p>
              <p className={styles.cardText}>`translateX(-24px) → 0`</p>
            </div>
          </RevealItem>
          <RevealItem variant="scale" delay={120}>
            <div className={styles.card}>
              <p className={styles.cardLabel}>スケールイン</p>
              <p className={styles.cardText}>`scale(0.92) → 1`</p>
            </div>
          </RevealItem>
          <RevealItem variant="blur" delay={240}>
            <div className={styles.card}>
              <p className={styles.cardLabel}>ブラーイン</p>
              <p className={styles.cardText}>`blur(8px) → 0`</p>
            </div>
          </RevealItem>
        </div>
      </Section>

      {/* CELEBRATION */}
      <Section
        id="celebration"
        tag="03 · Celebration"
        title="完了の演出"
        description="SVGパス描画 + 紙吹雪。証明書の発行完了・申請承認など、達成を演出する場面で。"
      >
        <div className={styles.celebrateWrap}>
          <Confetti run={confettiRun} />
          <div className={styles.celebrateCard}>
            <div className={styles.checkWrap}>
              <CheckmarkDraw play={checkPlay} />
            </div>
            <p className={styles.celebrateText}>証明書 #A-0421 を発行しました</p>
            <button type="button" className="btn-primary" onClick={celebrate}>
              もう一度見る
            </button>
          </div>
        </div>
      </Section>

      {/* LAYOUT */}
      <Section
        id="layout"
        tag="04 · Layout"
        title="レイアウトアニメーション"
        description="アコーディオン、タブインジケーター、並べ替え。要素自体が動くことで構造変化が伝わる。"
      >
        <div className={styles.grid2}>
          <div className={styles.card}>
            <p className={styles.cardLabel}>アコーディオン</p>
            <div className={styles.accordion}>
              {[
                { id: "a", q: "Ledra とは？", a: "施工証明をデジタル化するSaaSです。" },
                { id: "b", q: "対応書式は？", a: "PDF・PNG・C2PA署名付き画像に対応しています。" },
                { id: "c", q: "料金は？", a: "月額プランと従量課金を組み合わせられます。" },
              ].map((item) => {
                const open = accordion === item.id;
                return (
                  <div key={item.id} className={styles.accordionItem}>
                    <button
                      type="button"
                      className={styles.accordionTrigger}
                      onClick={() => setAccordion(open ? null : item.id)}
                      aria-expanded={open}
                    >
                      <span>{item.q}</span>
                      <span className={`${styles.chev} ${open ? styles.chevOn : ""}`}>›</span>
                    </button>
                    <div className={`${styles.accordionPanel} ${open ? styles.accordionOpen : ""}`}>
                      <p>{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.card}>
            <p className={styles.cardLabel}>タブインジケーター</p>
            <div className={styles.tabs} style={{ "--tab-index": tab } as React.CSSProperties}>
              {tabs.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.tab} ${tab === i ? styles.tabActive : ""}`}
                  onClick={() => setTab(i)}
                >
                  {t}
                </button>
              ))}
              <div className={styles.tabIndicator} aria-hidden />
            </div>
            <div className={styles.tabBody}>
              <div key={tab} className={styles.tabPanel}>
                {tab === 0 && "概要: 発行した証明書の基本情報を表示します。"}
                {tab === 1 && "タイムライン: 発行・署名・送信のイベントを表示します。"}
                {tab === 2 && "添付: 画像・PDF・C2PAアセットを管理します。"}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ marginTop: "1.5rem" }}>
          <div className={styles.listHead}>
            <p className={styles.cardLabel}>並べ替えリスト</p>
            <button type="button" className="btn-secondary" data-size="sm" onClick={shuffle}>
              シャッフル
            </button>
          </div>
          <ul className={styles.list}>
            {items.map((item, i) => (
              <li key={item.id} className={styles.listItem} style={{ transitionDelay: `${i * 30}ms` }}>
                <span className={styles.listDot} />
                <span className={styles.listText}>{item.label}</span>
                <span className={styles.listBadge}>{item.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 3D TILT */}
      <Section
        id="tilt"
        tag="05 · Depth"
        title="3D チルト & グレア"
        description="マウス位置に応じてカードが傾き、ハイライトが追従する。証明書カードを“物”として感じさせる演出。"
      >
        <div className={styles.grid2}>
          <RevealItem variant="scale">
            <TiltCard>
              <div className={styles.certTop}>
                <span className={styles.certBadge}>VERIFIED</span>
                <span className={styles.certNo}>A-0421</span>
              </div>
              <h3 className={styles.certTitle}>施工証明書</h3>
              <p className={styles.certSub}>横浜市 / 外壁塗装 / 2026-04-20</p>
              <div className={styles.certFoot}>
                <span>発行: Ledra Inc.</span>
                <span className={styles.certSign}>署名済み</span>
              </div>
            </TiltCard>
          </RevealItem>
          <RevealItem variant="scale" delay={120}>
            <TiltCard>
              <div className={styles.certTop}>
                <span className={styles.certBadge}>DRAFT</span>
                <span className={styles.certNo}>A-0422</span>
              </div>
              <h3 className={styles.certTitle}>施工証明書</h3>
              <p className={styles.certSub}>川崎市 / 屋根葺き替え / 2026-04-22</p>
              <div className={styles.certFoot}>
                <span>発行: Ledra Inc.</span>
                <span className={styles.certSignMuted}>下書き</span>
              </div>
            </TiltCard>
          </RevealItem>
        </div>
      </Section>

      {/* MODAL / DRAWER */}
      <Section
        id="overlay"
        tag="06 · Overlay"
        title="モーダル & ドロワー"
        description="背景をぼかして前景を浮かせる。開閉のタイミングで空間の層が生まれる。"
      >
        <div className={styles.ctaRow}>
          <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
            モーダルを開く
          </button>
          <button type="button" className="btn-secondary" onClick={() => setDrawerOpen(true)}>
            ドロワーを開く
          </button>
        </div>
      </Section>

      {/* Modal */}
      <div className={`${styles.overlay} ${modalOpen ? styles.overlayOn : ""}`} onClick={() => setModalOpen(false)}>
        <div
          className={`${styles.modal} ${modalOpen ? styles.modalOn : ""}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <h3 className={styles.modalTitle}>発行を確定しますか？</h3>
          <p className={styles.modalText}>この操作は取り消せません。</p>
          <div className={styles.modalActions}>
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>
              キャンセル
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setModalOpen(false);
                celebrate();
              }}
            >
              確定
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <div className={`${styles.overlay} ${drawerOpen ? styles.overlayOn : ""}`} onClick={() => setDrawerOpen(false)}>
        <aside
          className={`${styles.drawer} ${drawerOpen ? styles.drawerOn : ""}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <h3 className={styles.modalTitle}>詳細パネル</h3>
          <p className={styles.modalText}>
            右からスライドインするサイドドロワー。フォームや詳細ビューを開くときに使います。
          </p>
          <button type="button" className="btn-secondary" onClick={() => setDrawerOpen(false)}>
            閉じる
          </button>
        </aside>
      </div>

      {/* Toasts */}
      <div className={styles.toastStack}>
        {toasts.map((t) => (
          <div key={t.id} className={styles.toast}>
            <span className={styles.toastDot} />
            {t.text}
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          Advanced sections (07–15)
          ═══════════════════════════════════════════════ */}
      <AdvancedSections />

      {/* FOOTER */}
      <footer className={styles.footer}>
        <p>Ledra Motion Lab · 依存ライブラリなし (CSS + React)</p>
      </footer>
    </main>
  );
}

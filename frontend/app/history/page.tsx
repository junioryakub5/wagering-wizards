"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, Calendar, CheckCircle2, XCircle, BarChart3,
  Loader2, Trophy, Zap, ChevronDown, ChevronUp, X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getHistoryPredictions } from "@/lib/api";
import { Prediction } from "@/lib/types";

// ── Accent colours per odds category ──────────────────────────────────────────
const ACCENT: Record<string, { bg: string; text: string; glow: string; border: string; gradient: string }> = {
  "2+": {
    bg: "rgba(203,163,61,0.08)",
    text: "#cba33d",
    glow: "rgba(203,163,61,0.22)",
    border: "rgba(203,163,61,0.22)",
    gradient: "linear-gradient(90deg, #cba33d, #a07820)",
  },
  "5+": {
    bg: "rgba(232,192,90,0.08)",
    text: "#e8c05a",
    glow: "rgba(232,192,90,0.2)",
    border: "rgba(232,192,90,0.22)",
    gradient: "linear-gradient(90deg, #e8c05a, #cba33d)",
  },
  "10+": {
    bg: "rgba(232,232,232,0.06)",
    text: "#e8e8e8",
    glow: "rgba(232,232,232,0.12)",
    border: "rgba(232,232,232,0.15)",
    gradient: "linear-gradient(90deg, #e8e8e8, #b0b0b0)",
  },
  "20+": {
    bg: "rgba(239,68,68,0.08)",
    text: "#ef4444",
    glow: "rgba(239,68,68,0.18)",
    border: "rgba(239,68,68,0.2)",
    gradient: "linear-gradient(90deg, #ef4444, #dc2626)",
  },
};

// ── Image lightbox ─────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4"
      style={{ background: "rgba(9,9,11,0.96)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center z-[10000] transition-all duration-200 hover:scale-110"
        style={{ background: "rgba(203,163,61,0.9)", borderRadius: "50%", boxShadow: "0 0 20px rgba(203,163,61,0.45)" }}
      >
        <X size={18} color="#09090b" strokeWidth={2.5} />
      </button>
      <div className="min-h-full flex items-center justify-center py-12" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="shadow-2xl"
          style={{ maxWidth: "92vw", maxHeight: "88vh", width: "auto", height: "auto", borderRadius: "16px", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}

// ── Clickable image thumbnail ──────────────────────────────────────────────────
function ImageThumb({
  src, alt, label, labelColor, accent,
}: {
  src: string; alt: string; label: string; labelColor: string; accent: typeof ACCENT["2+"];
}) {
  const [lightbox, setLightbox] = useState(false);
  return (
    <>
      <div className="flex flex-col overflow-hidden">
        {/* Label row */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ background: accent.bg, borderBottom: `1px solid ${accent.border}` }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: labelColor, fontFamily: "'Sora', sans-serif" }}
          >
            {label}
          </span>
          <span
            className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: accent.bg, color: accent.text, border: `1px solid ${accent.border}`, fontFamily: "'Sora', sans-serif", letterSpacing: "0.06em" }}
          >
            TAP TO EXPAND
          </span>
        </div>

        {/* Image */}
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="relative group overflow-hidden cursor-zoom-in w-full"
          style={{ background: "rgba(9,9,11,0.7)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="w-full object-contain transition-transform duration-500 group-hover:scale-105"
            style={{ maxHeight: "260px", minHeight: "120px" }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "rgba(9,9,11,0.55)", backdropFilter: "blur(2px)" }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
              style={{ background: accent.gradient, color: "#09090b", borderRadius: "8px", fontFamily: "'Sora', sans-serif" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              View Full
            </span>
          </div>
        </button>
      </div>

      {lightbox && <Lightbox src={src} alt={alt} onClose={() => setLightbox(false)} />}
    </>
  );
}

// ── Single result card ─────────────────────────────────────────────────────────
function ResultCard({ prediction, index }: { prediction: Prediction; index: number }) {
  const isWin = prediction.result === "win";
  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];

  const hasBetSlip = !!(prediction.previewImageUrl || prediction.imageUrl);
  const hasProof   = !!prediction.proofImageUrl;
  const hasImages  = hasBetSlip || hasProof;

  const betSlipSrc = prediction.previewImageUrl || prediction.imageUrl || "";
  const proofSrc   = prediction.proofImageUrl || "";

  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="card-glass overflow-hidden"
      style={{
        animationDelay: `${index * 80}ms`,
        animation: "fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) forwards",
        opacity: 0,
        borderColor: isWin ? acc.border : "rgba(239,68,68,0.15)",
        boxShadow: isWin
          ? `0 4px 32px rgba(0,0,0,0.5), 0 0 24px ${acc.glow}`
          : "0 4px 32px rgba(0,0,0,0.5), 0 0 24px rgba(239,68,68,0.08)",
      }}
    >
      {/* ── Accent top strip */}
      <div
        className="h-[2px] w-full"
        style={{ background: isWin ? acc.gradient : "linear-gradient(90deg, #ef4444, #dc2626)" }}
      />

      {/* ── Header row */}
      <div className="flex flex-wrap items-start gap-2 px-4 md:px-5 pt-4 pb-3">
        {/* Match title */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-sm md:text-base leading-snug"
            style={{ color: "#f4f4f5", fontFamily: "'Sora', sans-serif" }}
          >
            {prediction.match}
          </h3>
          {prediction.league && (
            <p className="text-[11px] mt-0.5" style={{ color: "#52525b" }}>
              {prediction.league}
            </p>
          )}
        </div>

        {/* Right badges */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {/* Odds category */}
          <span
            className="text-[10px] font-black px-2.5 py-1 tracking-widest uppercase"
            style={{
              background: acc.bg,
              color: acc.text,
              border: `1px solid ${acc.border}`,
              borderRadius: "8px",
              fontFamily: "'Sora', sans-serif",
              boxShadow: `0 0 10px ${acc.glow}`,
            }}
          >
            {prediction.oddsCategory} ODDS
          </span>

          {/* Win / Loss */}
          {prediction.result && (
            <span
              className="text-[10px] font-black px-3 py-1 flex items-center gap-1 uppercase tracking-wider"
              style={{
                background: isWin ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.12)",
                color: isWin ? "#22c55e" : "#ef4444",
                border: isWin ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
                borderRadius: "8px",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {isWin ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              {isWin ? "WON" : "LOST"}
            </span>
          )}

          {/* Date */}
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "#3f3f46" }}>
            <Calendar size={12} />
            {new Date(prediction.date).toLocaleDateString("en-GB", {
              weekday: "short", day: "numeric", month: "short",
            })}
          </span>

          {/* Odds value */}
          {prediction.odds && (
            <span
              className="text-[11px] font-bold"
              style={{ color: acc.text, fontFamily: "'Sora', sans-serif" }}
            >
              @{prediction.odds}
            </span>
          )}

          {/* Expand / Collapse */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 transition-colors rounded-md"
            style={{ color: "#52525b", background: "rgba(255,255,255,0.04)" }}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* ── Expandable body */}
      {expanded && (
        <>
          {hasImages ? (
            <div
              className={`grid gap-0 ${hasBetSlip && hasProof ? "grid-cols-2" : "grid-cols-1"}`}
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              {hasBetSlip && (
                <div className={hasBetSlip && hasProof ? "border-r" : ""} style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <ImageThumb
                    src={betSlipSrc}
                    alt={`Bet slip — ${prediction.match}`}
                    label="Bet Slip"
                    labelColor="#a1a1aa"
                    accent={acc}
                  />
                </div>
              )}
              {hasProof && (
                <ImageThumb
                  src={proofSrc}
                  alt={`Result proof — ${prediction.match}`}
                  label={isWin ? "Result Proof ✓" : "Result Proof"}
                  labelColor={isWin ? acc.text : "#ef4444"}
                  accent={isWin ? acc : {
                    bg: "rgba(239,68,68,0.08)",
                    text: "#ef4444",
                    glow: "rgba(239,68,68,0.18)",
                    border: "rgba(239,68,68,0.2)",
                    gradient: "linear-gradient(90deg, #ef4444, #dc2626)",
                  }}
                />
              )}
            </div>
          ) : (
            /* No images — result visual */
            <div
              className="mx-4 md:mx-5 mb-4 mt-1 flex flex-col items-center justify-center py-8 px-4 text-center"
              style={{
                background: isWin ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
                border: isWin ? "1px solid rgba(34,197,94,0.12)" : "1px solid rgba(239,68,68,0.12)",
                borderRadius: "12px",
              }}
            >
              {isWin ? (
                <CheckCircle2 size={44} className="mb-3" style={{ color: "#22c55e" }} />
              ) : (
                <XCircle size={44} className="mb-3" style={{ color: "#ef4444" }} />
              )}
              <p
                className="font-black text-xl mb-1"
                style={{ color: isWin ? "#22c55e" : "#ef4444", fontFamily: "'Sora', sans-serif" }}
              >
                {isWin ? "Prediction Won!" : "Better luck next time"}
              </p>
              <p className="text-xs" style={{ color: "#52525b" }}>{prediction.match}</p>
            </div>
          )}
        </>
      )}

      {/* ── Footer */}
      <div
        className="flex items-center justify-between px-4 md:px-5 py-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(9,9,11,0.4)" }}
      >
        <span className="text-[11px]" style={{ color: "#27272a" }}>
          {prediction.league || "—"}
        </span>
        <span
          className="text-[11px] font-semibold flex items-center gap-1"
          style={{ color: isWin ? "#22c55e" : "#ef4444", fontFamily: "'Sora', sans-serif" }}
        >
          {isWin ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          {isWin ? "Prediction correct" : "Prediction missed"}
        </span>
      </div>
    </div>
  );
}

// ── Month group label ──────────────────────────────────────────────────────────
function MonthLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <span
        className="text-xs font-bold uppercase tracking-widest px-3 py-1"
        style={{
          color: "#cba33d",
          background: "rgba(203,163,61,0.07)",
          border: "1px solid rgba(203,163,61,0.18)",
          borderRadius: "8px",
          fontFamily: "'Sora', sans-serif",
        }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getHistoryPredictions();
        setPredictions(data);
      } catch {
        setError("Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = predictions.filter((p) => {
    if (filter === "all") return true;
    return p.result === filter;
  });

  const wins    = predictions.filter((p) => p.result === "win").length;
  const losses  = predictions.filter((p) => p.result === "loss").length;
  const winRate = predictions.length > 0 ? Math.round((wins / predictions.length) * 100) : 0;

  // Group filtered results by month+year
  const grouped: { label: string; items: Prediction[] }[] = [];
  filtered.forEach((pred) => {
    const d = new Date(pred.date);
    const label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) {
      last.items.push(pred);
    } else {
      grouped.push({ label, items: [pred] });
    }
  });

  let cardIdx = 0;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 relative z-10" style={{ background: "#09090b" }}>

        {/* Ambient background orbs */}
        <div
          className="pointer-events-none fixed top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(203,163,61,0.25) 0%, transparent 70%)", zIndex: 0 }}
        />
        <div
          className="pointer-events-none fixed bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(160,120,16,0.15) 0%, transparent 70%)", zIndex: 0, opacity: 0.08 }}
        />

        <div className="page-container relative z-10">

          {/* ── Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{ background: "rgba(203,163,61,0.1)", border: "1px solid rgba(203,163,61,0.22)", borderRadius: "10px" }}
              >
                <Trophy size={16} style={{ color: "#cba33d" }} />
              </div>
              <span
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "#cba33d", fontFamily: "'Sora', sans-serif" }}
              >
                Track Record
              </span>
            </div>
            <h1
              className="font-display text-3xl md:text-4xl font-bold mb-2"
              style={{ color: "#f4f4f5", letterSpacing: "-0.02em" }}
            >
              Past Results
            </h1>
            <p className="text-sm" style={{ color: "#52525b" }}>
              Our verified winning history — transparent, unfiltered, proven.
            </p>
          </div>

          {/* ── Stats banner */}
          {!loading && predictions.length > 0 && (
            <div
              className="p-5 md:p-6 mb-8 flex flex-col md:flex-row items-center gap-5"
              style={{
                background: "rgba(203,163,61,0.05)",
                border: "1px solid rgba(203,163,61,0.14)",
                borderRadius: "18px",
                backdropFilter: "blur(20px)",
                boxShadow: "0 4px 32px rgba(0,0,0,0.5), 0 0 30px rgba(203,163,61,0.06)",
              }}
            >
              {/* Left — badge */}
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
                  style={{ background: "rgba(203,163,61,0.12)", border: "1px solid rgba(203,163,61,0.22)", borderRadius: "14px", boxShadow: "0 0 20px rgba(203,163,61,0.2)" }}
                >
                  <TrendingUp size={22} style={{ color: "#cba33d" }} />
                </div>
                <div>
                  <h2 className="font-bold text-base" style={{ color: "#f4f4f5", fontFamily: "'Sora', sans-serif" }}>
                    Proven Success
                  </h2>
                  <p className="text-xs" style={{ color: "#52525b" }}>
                    Join thousands who trust Wagering Wizards
                  </p>
                </div>
              </div>

              {/* Right — stats */}
              <div className="flex items-center gap-6 md:gap-8 md:ml-auto flex-wrap justify-center">
                {[
                  { label: "Win Rate", value: `${winRate}%`, color: "#cba33d"  },
                  { label: "Wins",     value: wins,           color: "#22c55e"  },
                  { label: "Losses",   value: losses,         color: "#ef4444"  },
                  { label: "Total",    value: predictions.length, color: "#e8c05a" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p
                      className="text-2xl font-black"
                      style={{ color: s.color, fontFamily: "'Sora', sans-serif" }}
                    >
                      {s.value}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: "#3f3f46", fontFamily: "'Sora', sans-serif" }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Filter tabs */}
          <div className="flex gap-2.5 mb-8 flex-wrap">
            {([
              { key: "all",  label: "All Results", icon: null },
              { key: "win",  label: "Wins",        icon: <CheckCircle2 size={12} className="flex-shrink-0" /> },
              { key: "loss", label: "Losses",      icon: <XCircle size={12} className="flex-shrink-0" /> },
            ] as const).map((tab) => {
              const active = filter === tab.key;
              const styles = active
                ? tab.key === "win"
                  ? { background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#09090b", borderColor: "transparent", boxShadow: "0 0 20px rgba(34,197,94,0.3)" }
                  : tab.key === "loss"
                    ? { background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", borderColor: "transparent", boxShadow: "0 0 20px rgba(239,68,68,0.3)" }
                    : { background: "linear-gradient(135deg, #cba33d, #a07820)", color: "#09090b", borderColor: "transparent", boxShadow: "0 0 20px rgba(203,163,61,0.35)" }
                : { background: "rgba(17,17,23,0.7)", color: "#52525b", borderColor: "rgba(255,255,255,0.07)" };

              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className="text-[11px] font-semibold px-5 py-2 border transition-all duration-300 flex items-center gap-1.5"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    borderRadius: "10px",
                    ...styles,
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {!active && (
                    <span
                      className="text-[10px] font-bold ml-1 px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.07)", color: "#52525b" }}
                    >
                      {tab.key === "all" ? predictions.length : tab.key === "win" ? wins : losses}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Content */}
          {loading ? (
            <div className="flex flex-col items-center py-28 gap-4">
              <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  background: "rgba(203,163,61,0.08)",
                  border: "1px solid rgba(203,163,61,0.22)",
                  borderRadius: "18px",
                  boxShadow: "0 0 28px rgba(203,163,61,0.15)",
                }}
              >
                <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
              </div>
              <p className="text-sm" style={{ color: "#52525b" }}>Loading history…</p>
            </div>
          ) : error ? (
            <div className="text-center py-28 text-red-400 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-28">
              <BarChart3 size={52} className="mx-auto mb-5" style={{ color: "#27272a" }} />
              <p className="text-lg font-semibold mb-2" style={{ color: "#52525b", fontFamily: "'Sora', sans-serif" }}>
                No results yet
              </p>
              <p className="text-sm" style={{ color: "#3f3f46" }}>
                Completed predictions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {grouped.map((group) => (
                <div key={group.label}>
                  <MonthLabel label={group.label} />
                  <div className="space-y-4">
                    {group.items.map((pred) => {
                      const idx = cardIdx++;
                      return <ResultCard key={pred._id} prediction={pred} index={idx} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Bottom CTA */}
          {!loading && !error && filtered.length > 0 && (
            <div className="text-center mt-16">
              <div className="flex items-center gap-3 justify-center mb-5">
                <div className="flex-1 max-w-[120px] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(203,163,61,0.3))" }} />
                <Zap size={16} style={{ color: "#cba33d" }} />
                <div className="flex-1 max-w-[120px] h-px" style={{ background: "linear-gradient(90deg, rgba(203,163,61,0.3), transparent)" }} />
              </div>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105"
                style={{
                  background: "rgba(203,163,61,0.08)",
                  border: "1px solid rgba(203,163,61,0.3)",
                  color: "#cba33d",
                  fontFamily: "'Sora', sans-serif",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  boxShadow: "0 0 20px rgba(203,163,61,0.1)",
                }}
              >
                <Trophy size={15} />
                View This Week&apos;s Tips
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

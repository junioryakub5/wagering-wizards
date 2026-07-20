"use client";

import { useState, useEffect } from "react";
import React from "react";
import {
  Calendar, Lock, X, Loader2, Shield, Zap,
  CheckCircle, Copy, Check, Trophy, RefreshCcw, Mail,
} from "lucide-react";
import { Prediction } from "@/lib/types";
import { initiatePayment, verifyPayment, getUnlockedPrediction, restoreAccess } from "@/lib/api";

// ── Bet slip image thumbnail + lightbox ────────────────────────────────────────
function BetSlipImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="px-5 pt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative w-full rounded-2xl overflow-hidden cursor-zoom-in group"
          style={{ height: "130px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <span
              className="text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: "rgba(203,163,61,0.9)", color: "#09090b" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              View Full Slip
            </span>
          </div>
        </button>
        <p className="text-center text-[10px] mt-1.5" style={{ color: "#3f3f46" }}>Tap to view full bet slip</p>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.96)" }}
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="fixed top-4 right-4 text-white rounded-full w-10 h-10 flex items-center justify-center z-[10000]"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <X size={18} />
          </button>
          <div className="min-h-full flex items-center justify-center p-4 py-12" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="rounded-2xl shadow-2xl" style={{ maxWidth: "100%", width: "auto", height: "auto" }} />
          </div>
        </div>
      )}
    </>
  );
}

// Paystack public key — hardcoded fallback so it's always available
const PAYSTACK_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_KEY ||
  "pk_live_149f5deb5a54340e126e111e9819de2c8de870f9";

// Load Paystack v2 inline.js dynamically (browser-only, never SSR)
function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).PaystackPop) return resolve();
    const SCRIPT_URL = "https://js.paystack.co/v2/inline.js";
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(poll); reject(new Error("Paystack timed out")); }, 10000);
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onerror = () => reject(new Error("Could not load Paystack script. Check your internet connection."));
    s.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).PaystackPop) return resolve();
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(poll); reject(new Error("PaystackPop not ready after load")); }, 6000);
    };
    document.head.appendChild(s);
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface UnlockedData {
  content: string;
  bookingCode: string;
  tips: string[];
  imageUrl: string;
  reference: string;
}

interface Props {
  prediction: Prediction;
  animationDelay?: number;
}

// ── Accent colours per odds category ─────────────────────────────────────────
const ACCENT: Record<string, { pill: string; glow: string; color: string; border: string }> = {
  "2+":  { pill: "from-blue-500 to-cyan-400",    glow: "rgba(59,130,246,0.25)",   color: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  "5+":  { pill: "from-amber-400 to-yellow-300",  glow: "rgba(203,163,61,0.25)",   color: "#cba33d", border: "rgba(203,163,61,0.3)"  },
  "10+": { pill: "from-violet-500 to-purple-400", glow: "rgba(139,92,246,0.25)",   color: "#a78bfa", border: "rgba(139,92,246,0.3)"  },
  "20+": { pill: "from-red-500 to-orange-400",    glow: "rgba(239,68,68,0.25)",    color: "#f87171", border: "rgba(239,68,68,0.3)"   },
};

// ── localStorage helpers ──────────────────────────────────────────────────────
const lsKey    = (id: string) => `ww_unlocked_${id}`;
const lsRefKey = (id: string) => `ww_ref_${id}`;

function saveUnlocked(predId: string, data: UnlockedData) {
  try {
    localStorage.setItem(lsRefKey(predId), data.reference);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { imageUrl: _img, ...rest } = data;
    localStorage.setItem(lsKey(predId), JSON.stringify(rest));
  } catch { /* quota exceeded */ }
}

function loadUnlocked(id: string): Omit<UnlockedData, "imageUrl"> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(lsKey(id));
    if (raw) return JSON.parse(raw) as Omit<UnlockedData, "imageUrl">;
    const ref = localStorage.getItem(lsRefKey(id));
    if (ref) return { content: "", bookingCode: "", tips: [], reference: ref };
    return null;
  } catch { return null; }
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
type ModalTab = "pay" | "restore";
type PayStep  = "idle" | "paying" | "verifying";

function PaymentModal({
  prediction,
  onSuccess,
  onClose,
}: {
  prediction: Prediction;
  onSuccess: (data: UnlockedData) => void;
  onClose: () => void;
}) {
  const [tab, setTab]       = useState<ModalTab>("pay");
  const [email, setEmail]   = useState("");
  const [step, setStep]     = useState<PayStep>("idle");
  const [error, setError]   = useState("");

  const [restoreEmail, setRestoreEmail] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];

  const finalizeUnlock = async (reference: string) => {
    setStep("verifying");
    setError("");
    try {
      const unlock = await getUnlockedPrediction(reference);
      const data: UnlockedData = {
        content:     unlock.prediction.content     || "",
        bookingCode: (unlock.prediction as {bookingCode?: string}).bookingCode || "",
        tips:        (unlock.prediction as {tips?: string[]}).tips        || [],
        imageUrl:    unlock.prediction.imageUrl    || "",
        reference,
      };
      saveUnlocked(prediction._id, data);
      onSuccess(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Verification failed. Please contact support.";
      setError(`${msg} (ref: ${reference})`);
      setStep("idle");
    }
  };

  const handlePay = async () => {
    if (!email || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setError("");
    setStep("paying");
    try {
      await loadPaystack();
      const initResult = await initiatePayment(email, prediction._id);
      const ref = initResult.reference;
      const accessCode = initResult.accessCode;
      if (!accessCode) throw new Error("Could not initialize payment. Please try again.");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const popup = new (window as any).PaystackPop();
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) { settled = true; setStep("idle"); setError("Paystack checkout couldn't load. Please check your internet connection and try again."); }
      }, 60000);

      popup.resumeTransaction(accessCode, {
        onSuccess: async (transaction: { reference: string }) => {
          settled = true;
          clearTimeout(timeout);
          try {
            await verifyPayment(ref, prediction._id, email);
            await finalizeUnlock(ref);
          } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Verification failed. Contact support.";
            setError(`${msg} (ref: ${ref})`);
            setStep("idle");
          }
        },
        onCancel: () => { settled = true; clearTimeout(timeout); setStep("idle"); },
      });
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to open payment. Please try again.";
      setError(msg);
      setStep("idle");
    }
  };

  const handleRestore = async () => {
    if (!restoreEmail || !restoreEmail.includes("@")) { setRestoreError("Please enter the email you used when you paid."); return; }
    setRestoreError("");
    setRestoreLoading(true);
    try {
      const unlock = await restoreAccess(restoreEmail, prediction._id);
      const data: UnlockedData = {
        content:     unlock.prediction.content     || "",
        bookingCode: (unlock.prediction as {bookingCode?: string}).bookingCode || "",
        tips:        (unlock.prediction as {tips?: string[]}).tips        || [],
        imageUrl:    unlock.prediction.imageUrl    || "",
        reference:   unlock.payment.reference,
      };
      saveUnlocked(prediction._id, data);
      onSuccess(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "No active payment found. Please complete your payment.";
      setRestoreError(msg);
    } finally {
      setRestoreLoading(false);
    }
  };

  // ── Verifying overlay ──────────────────────────────────────────────────────
  if (step === "verifying") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ overscrollBehavior: "contain" }}>
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" />
        <div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center gap-5 py-14 px-8"
          style={{
            background: "rgba(9,9,11,0.97)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          }}
        >
          {/* Gold top strip */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #cba33d, #e8c05a, #cba33d)" }} />
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(203,163,61,0.1)", border: "1px solid rgba(203,163,61,0.3)", boxShadow: "0 0 20px rgba(203,163,61,0.2)" }}
          >
            <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
          </div>
          <div className="text-center">
            <p style={{ color: "#f4f4f5" }} className="font-semibold text-base mb-1">Verifying Payment…</p>
            <p style={{ color: "#52525b" }} className="text-xs">Confirming with Paystack and unlocking your prediction</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose} style={{ overscrollBehavior: "contain" }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" />

      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "rgba(9,9,11,0.97)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold gradient top strip */}
        <div style={{ height: "2px", background: "linear-gradient(90deg, #cba33d, #e8c05a, #cba33d)" }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${acc.pill} text-white mb-2`}
                style={{ letterSpacing: "0.05em" }}
              >
                {prediction.oddsCategory} ODDS
              </span>
              <h2 style={{ color: "#f4f4f5" }} className="font-bold text-base leading-snug">{prediction.match}</h2>
              <p style={{ color: "#52525b" }} className="text-xs mt-1 flex items-center gap-1.5">
                <Calendar size={11} />
                {new Date(prediction.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                {" · "}{prediction.league}
              </p>
            </div>
            <button
              onClick={onClose}
              className="transition-colors mt-0.5 flex-shrink-0 p-1.5 rounded-lg"
              style={{ color: "#52525b" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#f4f4f5")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {(["pay", "restore"] as ModalTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); setRestoreError(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all"
              style={tab === t
                ? { color: "#cba33d", borderBottom: "2px solid #cba33d" }
                : { color: "#52525b" }
              }
            >
              {t === "pay"
                ? <><Lock size={11} />Pay &amp; Unlock</>
                : <><RefreshCcw size={11} />Already Paid?</>}
            </button>
          ))}
        </div>

        {tab === "pay" ? (
          <>
            {/* Price row */}
            <div
              className="mx-6 my-4 rounded-2xl px-4 py-3 flex items-center justify-between"
              style={{ background: "rgba(203,163,61,0.06)", border: "1px solid rgba(203,163,61,0.15)" }}
            >
              <div>
                <p style={{ color: "#52525b" }} className="text-xs mb-0.5">Access Price</p>
                <p className="text-2xl font-black" style={{ color: "#f4f4f5" }}>
                  GHS <span style={{ color: "#cba33d" }}>{prediction.price}</span>
                </p>
              </div>
              <div className="text-right">
                <p style={{ color: "#52525b" }} className="text-xs mb-0.5">Total Odds</p>
                <p className="font-bold text-lg" style={{ color: "#cba33d" }}>{prediction.odds}</p>
              </div>
            </div>

            {/* Perks */}
            <div className="px-6 mb-4 flex gap-5">
              {[{ icon: <Shield size={12} />, label: "Secure payment" }, { icon: <Zap size={12} />, label: "Instant access" }]
                .map(f => (
                  <div key={f.label} className="flex items-center gap-1.5 text-xs" style={{ color: "#3f3f46" }}>{f.icon}{f.label}</div>
                ))}
            </div>

            {/* Form */}
            <div className="px-6 pb-6 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#52525b" }}>Your email address</label>
                <input
                  type="email" placeholder="you@example.com" value={email} autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePay()}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#f4f4f5",
                    caretColor: "#cba33d",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(203,163,61,0.5)"; e.target.style.boxShadow = "0 0 0 2px rgba(203,163,61,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }}
                  disabled={step === "paying"}
                />
              </div>
              {error && <p className="text-red-400 text-xs leading-relaxed">{error}</p>}
              <button
                onClick={handlePay} disabled={step === "paying"}
                className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: step === "paying" ? "rgba(203,163,61,0.4)" : "linear-gradient(135deg, #cba33d, #e8c05a)",
                  color: "#09090b",
                  boxShadow: step === "paying" ? "none" : "0 4px 24px rgba(203,163,61,0.35)",
                  fontFamily: "'Sora', sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                {step === "paying"
                  ? (<><Loader2 size={16} className="animate-spin" />Opening Paystack…</>)
                  : (<><Lock size={15} />Pay &amp; Unlock — GHS {prediction.price}</>)}
              </button>
              <p className="text-center text-[11px]" style={{ color: "#3f3f46" }}>
                One-time payment · Powered by Paystack
              </p>
            </div>
          </>
        ) : (
          <div className="px-6 py-6 space-y-4">
            <div
              className="rounded-2xl p-4 flex gap-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Mail size={16} style={{ color: "#a1a1aa" }} className="flex-shrink-0 mt-0.5" />
              <p style={{ color: "#a1a1aa" }} className="text-xs leading-relaxed">
                Already paid for this prediction? Enter the email you used and we&apos;ll restore your access instantly — no need to pay again.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#52525b" }}>Email used at payment</label>
              <input
                type="email" placeholder="you@example.com" value={restoreEmail} autoFocus
                onChange={(e) => setRestoreEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRestore()}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#f4f4f5",
                  caretColor: "#cba33d",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(203,163,61,0.5)"; e.target.style.boxShadow = "0 0 0 2px rgba(203,163,61,0.08)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }}
                disabled={restoreLoading}
              />
            </div>
            {restoreError && <p className="text-red-400 text-xs leading-relaxed">{restoreError}</p>}
            <button
              onClick={handleRestore} disabled={restoreLoading}
              className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{
                background: restoreLoading ? "rgba(167,143,255,0.3)" : "linear-gradient(135deg, #a78fff, #7c3aed)",
                color: "#fff",
                boxShadow: restoreLoading ? "none" : "0 4px 20px rgba(124,58,237,0.3)",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {restoreLoading
                ? (<><Loader2 size={16} className="animate-spin" />Checking…</>)
                : (<><RefreshCcw size={15} />Restore My Access</>)}
            </button>
            <p className="text-center text-[11px]" style={{ color: "#3f3f46" }}>
              One-time payment — access never expires
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Unlocked card view ────────────────────────────────────────────────────────
function UnlockedCard({ prediction, unlocked }: { prediction: Prediction; unlocked: UnlockedData }) {
  const [copied, setCopied] = useState(false);
  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];

  const copyCode = () => {
    const text = unlocked.bookingCode || unlocked.content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(17,17,23,0.9)",
        border: "1px solid rgba(34,197,94,0.2)",
        boxShadow: "0 0 0 1px rgba(34,197,94,0.06), 0 16px 48px rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Unlocked green banner */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: "rgba(34,197,94,0.08)", borderBottom: "1px solid rgba(34,197,94,0.15)" }}
      >
        <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
        <span className="text-green-400 text-xs font-semibold">Prediction Unlocked ✓</span>
        <span className={`ml-auto text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${acc.pill} text-white`}>
          {prediction.oddsCategory} ODDS
        </span>
      </div>

      {/* Bet-slip image */}
      {unlocked.imageUrl && (
        <BetSlipImage src={unlocked.imageUrl} alt={`Bet slip – ${prediction.match}`} />
      )}

      {/* Info */}
      <div className="px-5 pt-4">
        <h3 className="font-semibold text-base mb-0.5 line-clamp-1" style={{ color: "#f4f4f5" }}>{prediction.match}</h3>
        <p className="text-xs mb-4 flex items-center gap-1.5" style={{ color: "#52525b" }}>
          <Calendar size={11} />
          {new Date(prediction.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          {" · "}{prediction.league}
        </p>

        {/* Booking code */}
        {(unlocked.bookingCode || unlocked.content) && (
          <div
            className="rounded-2xl p-4 mb-3"
            style={{ background: "rgba(203,163,61,0.06)", border: "1px solid rgba(203,163,61,0.2)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy size={13} style={{ color: "#cba33d" }} />
                <span className="text-xs font-semibold" style={{ color: "#cba33d" }}>
                  {unlocked.bookingCode ? "Booking Code" : "Prediction Tip"}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "#52525b" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#f4f4f5")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
              >
                {copied ? <><Check size={11} className="text-green-400" />Copied!</> : <><Copy size={11} />Copy</>}
              </button>
            </div>
            <p
              className="font-black text-xl tracking-widest text-center py-2"
              style={{ color: "#cba33d", fontFamily: "monospace", letterSpacing: "0.15em" }}
            >
              {unlocked.bookingCode || unlocked.content}
            </p>
          </div>
        )}

        {/* Tips list */}
        {unlocked.tips && unlocked.tips.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <p className="text-xs font-medium mb-2" style={{ color: "#52525b" }}>What to bet:</p>
            {unlocked.tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#a1a1aa" }}
              >
                <CheckCircle size={11} className="text-green-400 flex-shrink-0" />
                {tip}
              </div>
            ))}
          </div>
        )}

        {/* Footer badge */}
        <p className="text-[10px] text-right flex items-center justify-end gap-1 pb-4" style={{ color: "#3f3f46" }}>
          <CheckCircle size={10} className="text-green-500" />
          One-time payment · Access never expires
        </p>
      </div>
    </div>
  );
}

// ── Locked card view ──────────────────────────────────────────────────────────
function LockedCard({
  prediction,
  animationDelay,
  onClickUnlock,
}: {
  prediction: Prediction;
  animationDelay: number;
  onClickUnlock: () => void;
}) {
  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];
  const hasImage = !!prediction.previewImageUrl;

  return (
    <div
      className="overflow-hidden opacity-0 animate-fadeInUp cursor-pointer group rounded-2xl transition-all duration-300"
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: "forwards",
        background: "rgba(17,17,23,0.9)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}
      onClick={onClickUnlock}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = acc.border;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px ${acc.border}`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Image / locked area */}
      <div className="relative h-52 overflow-hidden">
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={prediction.previewImageUrl!}
            alt="Prediction slip preview"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            style={{ filter: "blur(10px) brightness(0.35)", transform: "scale(1.1)" }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(17,17,23,1) 0%, rgba(9,9,11,1) 100%)" }}
          />
        )}

        {/* Overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: hasImage
              ? "linear-gradient(180deg, rgba(9,9,11,0.2) 0%, rgba(9,9,11,0.85) 100%)"
              : "linear-gradient(180deg, transparent 0%, rgba(9,9,11,0.6) 100%)",
          }}
        />

        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{ background: `radial-gradient(circle at 50% 40%, ${acc.glow}, transparent 65%)` }}
        />

        {/* Odds badge — top left */}
        <span
          className={`absolute top-3 left-3 z-10 text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${acc.pill} text-white`}
          style={{ letterSpacing: "0.05em", boxShadow: `0 4px 12px ${acc.glow}` }}
        >
          {prediction.oddsCategory} ODDS
        </span>

        {/* Date badge — top right */}
        <span
          className="absolute top-3 right-3 z-10 text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
          style={{ background: "rgba(9,9,11,0.7)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", backdropFilter: "blur(8px)" }}
        >
          <Calendar size={9} />
          {new Date(prediction.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>

        {/* Lock icon + CTA */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{
              background: "rgba(203,163,61,0.1)",
              border: "1px solid rgba(203,163,61,0.3)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 0 20px rgba(203,163,61,0.2)",
            }}
          >
            <Lock size={22} style={{ color: "#cba33d" }} strokeWidth={2} />
          </div>
          <span
            className="text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-300 group-hover:scale-105"
            style={{
              background: "rgba(203,163,61,0.12)",
              color: "#cba33d",
              border: "1px solid rgba(203,163,61,0.25)",
              backdropFilter: "blur(8px)",
            }}
          >
            Click to unlock
          </span>
        </div>
      </div>

      {/* Card info */}
      <div className="px-5 py-4">
        <h3 className="font-semibold text-base mb-1 line-clamp-1" style={{ color: "#f4f4f5" }}>{prediction.match}</h3>
        <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "#52525b" }}>
          {prediction.league && <><span className="truncate">{prediction.league}</span></>}
        </div>

        {/* Price + odds row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "#3f3f46" }}>Odds:</span>
            <span className="font-bold text-sm gradient-text-gold">{prediction.odds}</span>
          </div>
          <span className="font-black text-lg gradient-text-gold">GHS {prediction.price}</span>
        </div>

        {/* CTA bar */}
        <div
          className="w-full text-center text-xs font-bold py-3 rounded-xl transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(203,163,61,0.12), rgba(232,192,90,0.06))",
            border: "1px solid rgba(203,163,61,0.18)",
            color: "#cba33d",
            fontFamily: "'Sora', sans-serif",
            letterSpacing: "0.03em",
          }}
        >
          🔒 Unlock Prediction — GHS {prediction.price}
        </div>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function PredictionCard({ prediction, animationDelay = 0 }: Props) {
  const [unlocked, setUnlocked] = useState<UnlockedData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const cached = loadUnlocked(prediction._id);
    if (!cached) return;
    setUnlocked({ imageUrl: "", ...cached });
    if (cached.reference) {
      getUnlockedPrediction(cached.reference).then(unlock => {
        const fresh: UnlockedData = {
          content:     unlock.prediction.content     || cached.content     || "",
          bookingCode: (unlock.prediction as {bookingCode?: string}).bookingCode || cached.bookingCode || "",
          tips:        (unlock.prediction as {tips?: string[]}).tips        || cached.tips        || [],
          imageUrl:    unlock.prediction.imageUrl    || "",
          reference:   cached.reference,
        };
        saveUnlocked(prediction._id, fresh);
        setUnlocked(fresh);
      }).catch(() => { /* keep showing cached text data */ });
    }
  }, [prediction._id]);

  const handleSuccess = (data: UnlockedData) => {
    setUnlocked(data);
    setModalOpen(false);
  };

  if (unlocked) {
    return (
      <div
        className="opacity-0 animate-fadeInUp"
        style={{ animationDelay: `${animationDelay}ms`, animationFillMode: "forwards" }}
      >
        <UnlockedCard prediction={prediction} unlocked={unlocked} />
      </div>
    );
  }

  return (
    <>
      <LockedCard
        prediction={prediction}
        animationDelay={animationDelay}
        onClickUnlock={() => setModalOpen(true)}
      />

      {modalOpen && (
        <PaymentModal
          prediction={prediction}
          onSuccess={handleSuccess}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

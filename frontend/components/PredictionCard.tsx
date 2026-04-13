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
          className="relative w-full rounded-xl overflow-hidden group cursor-zoom-in"
          style={{ height: "120px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105" />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.45)" }}
          >
            <span
              className="text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: "rgba(240,180,41,0.85)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              View Full Slip
            </span>
          </div>
        </button>
        <p className="text-center text-[10px] text-gray-500 mt-1.5">Tap to view full bet slip</p>
      </div>

      {/* Lightbox — scrollable, shows full image */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.95)" }}
          onClick={() => setOpen(false)}
        >
          {/* Close button — always visible */}
          <button
            onClick={() => setOpen(false)}
            className="fixed top-4 right-4 text-white rounded-full w-10 h-10 flex items-center justify-center z-[10000]"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <X size={18} />
          </button>

          {/* Full image — scrollable, natural size */}
          <div
            className="min-h-full flex items-center justify-center p-4 py-12"
            onClick={e => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="rounded-xl shadow-2xl"
              style={{ maxWidth: "100%", width: "auto", height: "auto" }}
            />
          </div>
        </div>
      )}

    </>
  );
}

// Paystack public key — hardcoded fallback so it's always available
const PAYSTACK_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_KEY ||
  "pk_test_5ea5e36fe127df1e71403fc3d5a558c326767c01";

// Load Paystack v2 inline.js dynamically (browser-only, never SSR)
function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).PaystackPop) return resolve();

    // Script already injecting — just poll
    const SCRIPT_URL = "https://js.paystack.co/v2/inline.js";
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(poll); reject(new Error("Paystack timed out")); }, 10000);
      return;
    }

    // Inject fresh script tag
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
const ACCENT: Record<string, { pill: string; glow: string }> = {
  "2+":  { pill: "from-blue-500 to-cyan-400",    glow: "rgba(59,130,246,0.35)"  },
  "5+":  { pill: "from-amber-400 to-yellow-300",  glow: "rgba(245,158,11,0.35)"  },
  "10+": { pill: "from-violet-500 to-purple-400", glow: "rgba(139,92,246,0.35)"  },
  "20+": { pill: "from-red-500 to-orange-400",    glow: "rgba(239,68,68,0.35)"   },
};

// ── localStorage helpers ──────────────────────────────────────────────────────
const lsKey    = (id: string) => `ww_unlocked_${id}`;
const lsRefKey = (id: string) => `ww_ref_${id}`;   // lightweight: just the payment reference

// Save only text data + reference — never store base64 imageUrl (can be 5MB, blows quota)
function saveUnlocked(predId: string, data: UnlockedData) {
  try {
    localStorage.setItem(lsRefKey(predId), data.reference);   // always try the lightweight key
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { imageUrl: _img, ...rest } = data;                  // drop the potentially huge blob
    localStorage.setItem(lsKey(predId), JSON.stringify(rest));
  } catch { /* quota exceeded — at least the ref key was saved */ }
}

// Returns cached text data (no imageUrl). If only the ref key exists, return a stub.
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

  // ── Restore tab state ──
  const [restoreEmail, setRestoreEmail] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  // Lock body scroll while modal is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];

  // ── Shared unlock helper ───────────────────────────────────────────────────
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

  // ── Pay tab handler ────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!email || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setError("");
    setStep("paying");
    try {
      await loadPaystack();

      // Always get reference from backend so Paystack can verify it
      const { reference: ref } = await initiatePayment(email, prediction._id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const popup = new (window as any).PaystackPop();

      let settled = false;
      // 60-second safety timeout in case the popup iframe fails to load
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          setStep("idle");
          setError("Paystack checkout couldn't load. Please check your internet connection and try again.");
        }
      }, 60000);

      popup.newTransaction({
        key: PAYSTACK_KEY,
        email,
        amount: prediction.price * 100,
        currency: "GHS",
        ref,
        metadata: { predictionId: prediction._id, match: prediction.match },
        onSuccess: async (transaction: { reference: string }) => {
          settled = true;
          clearTimeout(timeout);
          try {
            // Use the reference from initiate (backend-registered)
            await verifyPayment(ref, prediction._id, email);
            await finalizeUnlock(ref);
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
              "Verification failed. Contact support.";
            setError(`${msg} (ref: ${ref})`);
            setStep("idle");
          }
        },
        onCancel: () => {
          settled = true;
          clearTimeout(timeout);
          setStep("idle");
        },
      });
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to open payment. Please try again.";
      setError(msg);
      setStep("idle");
    }
  };

  // ── Restore tab handler ────────────────────────────────────────────────────
  const handleRestore = async () => {
    if (!restoreEmail || !restoreEmail.includes("@")) {
      setRestoreError("Please enter the email you used when you paid.");
      return;
    }
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
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
        <div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center gap-5 py-14 px-8"
          style={{ background: "rgba(18,14,42,0.98)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className={`h-1 w-full absolute top-0 left-0 bg-gradient-to-r ${acc.pill}`} />
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(240,180,41,0.1)", border: "1px solid rgba(240,180,41,0.25)" }}
          >
            <Loader2 size={28} style={{ color: "var(--accent)" }} className="animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-base mb-1">Verifying Payment…</p>
            <p className="text-gray-500 text-xs">Confirming with Paystack and unlocking your prediction</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose} style={{ overscrollBehavior: "contain" }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "rgba(18,14,42,0.98)", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* accent strip */}
        <div className={`h-1 w-full bg-gradient-to-r ${acc.pill}`} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r ${acc.pill} text-white mb-1.5`}>
                {prediction.oddsCategory} ODDS
              </span>
              <h2 className="font-bold text-white text-base leading-snug">{prediction.match}</h2>
              <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1.5">
                <Calendar size={11} />
                {new Date(prediction.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                {" · "}{prediction.league}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors mt-0.5 flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/5">
          {(["pay", "restore"] as ModalTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); setRestoreError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
                tab === t ? "text-white border-b-2" : "text-gray-500 hover:text-gray-300"
              }`}
              style={tab === t ? { borderColor: "var(--accent)" } : {}}
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
              className="mx-6 my-4 rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: "rgba(240,180,41,0.06)", border: "1px solid rgba(240,180,41,0.15)" }}
            >
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Access Price</p>
                <p className="text-2xl font-black text-white">
                  GHS <span style={{ color: "var(--accent)" }}>{prediction.price}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs mb-0.5">Total Odds</p>
                <p className="font-bold text-lg" style={{ color: "var(--accent)" }}>{prediction.odds}</p>
              </div>
            </div>

            {/* Perks */}
            <div className="px-6 mb-4 flex gap-5">
              {[{ icon: <Shield size={12} />, label: "Secure payment" }, { icon: <Zap size={12} />, label: "Instant access" }]
                .map(f => (
                  <div key={f.label} className="flex items-center gap-1.5 text-gray-500 text-xs">{f.icon}{f.label}</div>
                ))}
            </div>

            {/* Form */}
            <div className="px-6 pb-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Your email address</label>
                <input
                  type="email" placeholder="you@example.com" value={email} autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePay()}
                  className="input-field"
                  disabled={step === "paying"}
                />
              </div>
              {error && <p className="text-red-400 text-xs leading-relaxed">{error}</p>}
              <button
                onClick={handlePay} disabled={step === "paying"}
                className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: step === "paying" ? "rgba(240,180,41,0.4)" : "linear-gradient(135deg, #f0b429, #f59e0b)",
                  color: "#0d1117",
                  boxShadow: step === "paying" ? "none" : "0 4px 20px rgba(240,180,41,0.3)",
                }}
              >
                {step === "paying"
                  ? (<><Loader2 size={16} className="animate-spin" />Opening Paystack…</>)
                  : (<><Lock size={15} />Pay &amp; Unlock — GHS {prediction.price}</>)}
              </button>
              <p className="text-center text-gray-600 text-[11px]">
                One-time payment · Powered by Paystack
              </p>
            </div>
          </>
        ) : (
          /* Restore Access tab */
          <div className="px-6 py-6 space-y-4">
            <div
              className="rounded-xl p-4 flex gap-3"
              style={{ background: "rgba(167,143,255,0.06)", border: "1px solid rgba(167,143,255,0.15)" }}
            >
              <Mail size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-400 text-xs leading-relaxed">
                Already paid for this prediction? Enter the email you used and we&apos;ll restore your access instantly — no need to pay again.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email used at payment</label>
              <input
                type="email" placeholder="you@example.com" value={restoreEmail} autoFocus
                onChange={(e) => setRestoreEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRestore()}
                className="input-field"
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
              }}
            >
              {restoreLoading
                ? (<><Loader2 size={16} className="animate-spin" />Checking…</>)
                : (<><RefreshCcw size={15} />Restore My Access</>)}
            </button>
            <p className="text-center text-gray-600 text-[11px]">
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
    <div className="card-glass overflow-hidden">
      {/* Unlocked banner */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: "rgba(34,197,94,0.1)", borderBottom: "1px solid rgba(34,197,94,0.2)" }}
      >
        <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
        <span className="text-green-400 text-xs font-semibold">Prediction Unlocked ✓</span>
        <span
          className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r ${acc.pill} text-white`}
        >
          {prediction.oddsCategory} ODDS
        </span>
      </div>

      {/* Bet-slip image — compact thumbnail, tap to view full */}
      {unlocked.imageUrl && (
        <BetSlipImage src={unlocked.imageUrl} alt={`Bet slip – ${prediction.match}`} />
      )}




      {/* Info */}
      <div className="px-5 pt-4">
        <h3 className="font-semibold text-base text-white mb-0.5 line-clamp-1">{prediction.match}</h3>
        <p className="text-gray-500 text-xs mb-4 flex items-center gap-1.5">
          <Calendar size={11} />
          {new Date(prediction.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          {" · "}{prediction.league}
        </p>

        {/* Booking code — primary unlock element */}
        {(unlocked.bookingCode || unlocked.content) && (
          <div
            className="rounded-xl p-4 mb-3"
            style={{ background: "rgba(240,180,41,0.06)", border: "1px solid rgba(240,180,41,0.25)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy size={13} style={{ color: "var(--accent)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                  {unlocked.bookingCode ? "Booking Code" : "Prediction Tip"}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copied ? <><Check size={11} className="text-green-400" />Copied!</> : <><Copy size={11} />Copy</>}
              </button>
            </div>
            <p
              className="font-black text-xl tracking-widest text-center py-2"
              style={{ color: "var(--accent)", fontFamily: "monospace", letterSpacing: "0.15em" }}
            >
              {unlocked.bookingCode || unlocked.content}
            </p>
          </div>
        )}

        {/* Tips list */}
        {unlocked.tips && unlocked.tips.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <p className="text-xs text-gray-500 font-medium mb-2">What to bet:</p>
            {unlocked.tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-300"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <CheckCircle size={11} className="text-green-400 flex-shrink-0" />
                {tip}
              </div>
            ))}
          </div>
        )}

        {/* Permanent access badge */}
        <p className="text-gray-600 text-[10px] text-right flex items-center justify-end gap-1 pb-4">
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
      className="card-glass overflow-hidden opacity-0 animate-fadeInUp cursor-pointer group"
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: "forwards" }}
      onClick={onClickUnlock}
    >
      {/* Image / locked area */}
      <div className="relative h-52 overflow-hidden">
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={prediction.previewImageUrl!}
            alt="Prediction slip preview"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ filter: "blur(10px) brightness(0.4)", transform: "scale(1.1)" }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(20,15,50,1) 0%, rgba(10,8,30,1) 100%)" }}
          />
        )}

        {/* Overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: hasImage
              ? "linear-gradient(180deg, rgba(10,8,30,0.25) 0%, rgba(10,8,30,0.8) 100%)"
              : "linear-gradient(180deg, rgba(124,58,237,0.1) 0%, rgba(10,8,30,0.5) 100%)",
          }}
        />

        {/* Radial glow */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 40%, ${acc.glow}, transparent 65%)` }}
        />

        {/* Odds badge */}
        <span
          className={`absolute top-3 left-3 z-10 text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${acc.pill} text-white shadow-lg`}
        >
          {prediction.oddsCategory} ODDS
        </span>

        {/* Lock icon + CTA */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            style={{
              background: "rgba(240,180,41,0.12)",
              border: "1px solid rgba(240,180,41,0.3)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Lock size={22} style={{ color: "var(--accent)" }} strokeWidth={2} />
          </div>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
            style={{
              background: "rgba(240,180,41,0.15)",
              color: "var(--accent)",
              border: "1px solid rgba(240,180,41,0.2)",
            }}
          >
            Click to unlock
          </span>
        </div>
      </div>

      {/* Card info row */}
      <div className="px-5 py-4">
        <h3 className="font-semibold text-base text-white mb-1 line-clamp-1">{prediction.match}</h3>
        <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
          <Calendar size={12} />
          <span>
            {new Date(prediction.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </span>
          {prediction.league && (<><span className="mx-0.5">·</span><span className="truncate">{prediction.league}</span></>)}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Odds:</span>
            <span className="font-bold text-sm gradient-text-gold">{prediction.odds}</span>
          </div>
          <span className="font-black text-lg gradient-text-gold">GHS {prediction.price}</span>
        </div>

        {/* CTA bar */}
        <div
          className="mt-3 w-full text-center text-xs font-semibold py-2.5 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity"
          style={{
            background: "linear-gradient(135deg, rgba(240,180,41,0.12), rgba(245,158,11,0.08))",
            border: "1px solid rgba(240,180,41,0.2)",
            color: "var(--accent)",
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

  // Hydrate from localStorage on mount; re-fetch from API to get imageUrl
  useEffect(() => {
    const cached = loadUnlocked(prediction._id);
    if (!cached) return;

    // We have a cached entry — show the text immediately (fast)
    setUnlocked({ imageUrl: "", ...cached });

    // Then silently re-fetch from API to get fresh imageUrl (and any updated content)
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

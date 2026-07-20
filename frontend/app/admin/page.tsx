"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, BookOpen, CreditCard, LogOut, Plus, Pencil, Trash2,
  Eye, EyeOff, Loader2, CheckCircle, XCircle, TrendingUp, DollarSign,
  FileText, Activity, ChevronLeft, ChevronRight, X, Upload, Search,
  Wand2, Globe2, BarChart2, Inbox, Menu,
} from "lucide-react";
import {
  adminGetPredictions, adminCreatePrediction, adminUpdatePrediction,
  adminDeletePrediction, adminGetStats, adminGetPayments, adminUploadImage,
} from "@/lib/api";
import { Prediction, RecentActivity, PaymentRecord } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const ODDS_CATEGORIES = ["2+ ODDS", "5+ ODDS", "10+ ODDS", "20+ ODDS"] as const;
const ODDS_VALUES: Record<string, string> = {
  "2+ ODDS": "2+", "5+ ODDS": "5+", "10+ ODDS": "10+", "20+ ODDS": "20+",
};
const PAGE_SIZE = 10;

const EMPTY_FORM = {
  match: "", league: "", odds: "", oddsCategory: "2+",
  price: 25, content: "", bookingCode: "", tips: "", imageUrl: "", proofImageUrl: "",
  date: new Date().toISOString().split("T")[0],
  status: "active" as "active" | "completed", result: null as "win" | "loss" | null,
  startDay: "", endDay: "",
};

type Section = "overview" | "slips" | "payments";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    completed: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    win: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    loss: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colors[status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
      {status}
    </span>
  );
}

function OddsBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    "2+": "text-amber-400", "5+": "text-amber-400",
    "10+": "text-orange-400", "20+": "text-red-400",
  };
  return <span className={`font-bold ${colors[cat] ?? "text-amber-400"}`}>{cat}</span>;
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1}
        className="admin-btn-ghost flex items-center gap-1 disabled:opacity-40">
        <ChevronLeft size={15} /> Previous
      </button>
      <span className="text-sm text-slate-400">Page {page} of {pages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages}
        className="admin-btn-ghost flex items-center gap-1 disabled:opacity-40">
        Next <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) { setError("Please enter the admin token."); return; }
    setLoading(true); setError("");
    try {
      await adminGetPredictions(token.trim());
      sessionStorage.setItem("ww_admin_token", token.trim());
      onLogin(token.trim());
    } catch {
      setError("Invalid admin token. Access denied.");
    } finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#09090b" }}
    >
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(203,163,61,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-10%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,192,90,0.07) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(203,163,61,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(203,163,61,0.025) 1px, transparent 1px)", backgroundSize: "80px 80px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)" }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(203,163,61,0.1)",
                border: "1px solid rgba(203,163,61,0.3)",
                boxShadow: "0 0 24px rgba(203,163,61,0.2)",
              }}
            >
              <Wand2 size={28} style={{ color: "#cba33d" }} strokeWidth={1.5} />
            </div>
          </div>
          <h1
            className="mb-1"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 900,
              fontSize: "2rem",
              textTransform: "uppercase",
              letterSpacing: "-0.03em",
              color: "#f4f4f5",
            }}
          >
            Admin{" "}
            <span style={{ background: "linear-gradient(135deg, #cba33d, #e8c05a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Access
            </span>
          </h1>
          <p style={{ color: "#52525b" }} className="text-sm">Enter your admin token to continue</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-6 rounded-2xl"
          style={{
            background: "rgba(17,17,23,0.92)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(203,163,61,0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "rgba(203,163,61,0.7)", fontFamily: "'Sora', sans-serif", letterSpacing: "0.08em" }}
            >
              Admin Token
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Enter admin token..."
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all duration-200 pr-10"
                style={{
                  background: "rgba(9,9,11,0.8)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  caretColor: "#cba33d",
                  color: "#f4f4f5",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(203,163,61,0.5)"; e.target.style.boxShadow = "0 0 0 2px rgba(203,163,61,0.08)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#52525b" }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = "#cba33d")}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = "#52525b")}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-1.5">
              <XCircle size={14} /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
            style={{
              background: loading ? "rgba(203,163,61,0.5)" : "linear-gradient(135deg, #cba33d, #e8c05a)",
              color: "#09090b",
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              boxShadow: loading ? "none" : "0 4px 20px rgba(203,163,61,0.35)",
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Verifying..." : "Access Dashboard"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#3f3f46" }}>
          Wagering Wizards · Admin Portal
        </p>
      </div>
    </div>
  );
}

// ─── Overview Section ─────────────────────────────────────────────────────────
function OverviewSection({ token }: { token: string }) {
  const [stats, setStats] = useState<{
    totalSlips: number; activeSlips: number; completedSlips: number;
    totalRevenue: number; totalSales: number; recentActivity: RecentActivity[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetStats(token).then(setStats).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(203,163,61,0.08)", border: "1px solid rgba(203,163,61,0.18)" }}>
        <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
      </div>
    </div>
  );
  if (!stats) return <div className="text-slate-400 py-24 text-center">Failed to load stats.</div>;

  return (
    <div className="space-y-4">

      {/* ── Top revenue cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Revenue — hero card */}
        <div
          className="md:col-span-1 rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: "rgba(17,17,23,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#52525b", fontFamily: "'Sora', sans-serif", letterSpacing: "0.1em" }}>Total Revenue</p>
            <p className="font-black" style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", color: "#22c55e", letterSpacing: "-0.02em", lineHeight: 1 }}>
              GHS {stats.totalRevenue.toFixed(2)}
            </p>
            <p className="text-xs mt-2" style={{ color: "#52525b" }}>{stats.totalSales} total sales</p>
          </div>
          <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "rgba(34,197,94,0.15)" }}>
            <div className="h-full rounded-full" style={{ width: "100%", background: "linear-gradient(90deg, #22c55e, #4ade80)" }} />
          </div>
        </div>

        {/* Active Slips */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: "rgba(17,17,23,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#52525b", fontFamily: "'Sora', sans-serif", letterSpacing: "0.1em" }}>Active Slips</p>
            <p className="font-black" style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", color: "#cba33d", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {stats.activeSlips}
            </p>
            <p className="text-xs mt-2" style={{ color: "#52525b" }}>Currently live</p>
          </div>
          <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "rgba(203,163,61,0.15)" }}>
            <div className="h-full rounded-full" style={{ width: stats.totalSlips > 0 ? `${(stats.activeSlips / stats.totalSlips) * 100}%` : "0%", background: "linear-gradient(90deg, #cba33d, #e8c05a)" }} />
          </div>
        </div>

        {/* Completed Slips */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: "rgba(17,17,23,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#52525b", fontFamily: "'Sora', sans-serif", letterSpacing: "0.1em" }}>Completed</p>
            <p className="font-black" style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", color: "#a78bfa", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {stats.completedSlips}
            </p>
            <p className="text-xs mt-2" style={{ color: "#52525b" }}>All time</p>
          </div>
          <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "rgba(167,139,250,0.15)" }}>
            <div className="h-full rounded-full" style={{ width: stats.totalSlips > 0 ? `${(stats.completedSlips / stats.totalSlips) * 100}%` : "0%", background: "linear-gradient(90deg, #a78bfa, #c4b5fd)" }} />
          </div>
        </div>
      </div>

      {/* ── Compact stat row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Slips",   value: stats.totalSlips,   color: "#f4f4f5",  icon: FileText  },
          { label: "Total Sales",   value: stats.totalSales,   color: "#22c55e",  icon: TrendingUp },
          { label: "Win Rate",      value: "N/A",              color: "#cba33d",  icon: Activity  },
          { label: "Avg Sale",      value: stats.totalSales > 0 ? `GHS ${(stats.totalRevenue / stats.totalSales).toFixed(0)}` : "GHS 0", color: "#60a5fa", icon: DollarSign },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{ background: "rgba(17,17,23,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#3f3f46", fontFamily: "'Sora', sans-serif", letterSpacing: "0.08em" }}>{s.label}</p>
              <p className="font-black text-lg" style={{ color: s.color, fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>{String(s.value)}</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <s.icon size={16} style={{ color: s.color, opacity: 0.7 }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Country breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,23,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇬🇭</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#52525b", fontFamily: "'Sora', sans-serif" }}>Ghana (Paystack)</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <DollarSign size={14} style={{ color: "#22c55e" }} />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span style={{ color: "#52525b" }}>All time</span>
              <span className="font-black" style={{ color: "#22c55e", fontFamily: "'Sora', sans-serif" }}>GHS {stats.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#52525b" }}>Total sales</span>
              <span className="font-semibold" style={{ color: "#a1a1aa" }}>{stats.totalSales}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,23,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#52525b", fontFamily: "'Sora', sans-serif" }}>Slip Overview</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(203,163,61,0.1)", border: "1px solid rgba(203,163,61,0.2)" }}>
              <BarChart2 size={14} style={{ color: "#cba33d" }} />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span style={{ color: "#52525b" }}>Active</span>
              <span className="font-black" style={{ color: "#cba33d", fontFamily: "'Sora', sans-serif" }}>{stats.activeSlips}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#52525b" }}>Completed</span>
              <span className="font-semibold" style={{ color: "#a1a1aa" }}>{stats.completedSlips}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Payments ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(17,17,23,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="font-bold text-sm" style={{ color: "#f4f4f5", fontFamily: "'Sora', sans-serif" }}>Recent Payments</p>
          <span className="text-xs" style={{ color: "#3f3f46" }}>{stats.recentActivity.length} shown</span>
        </div>
        {stats.recentActivity.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "#52525b" }}>No payment activity yet.</div>
        ) : (
          <div>
            {stats.recentActivity.map((act, i) => (
              <div
                key={act._id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors"
                style={{
                  borderBottom: i < stats.recentActivity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: "rgba(203,163,61,0.12)", border: "1px solid rgba(203,163,61,0.2)", color: "#cba33d", fontFamily: "'Sora', sans-serif" }}
                  >
                    {act.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#f4f4f5" }}>{act.email}</p>
                    <p className="text-xs" style={{ color: "#52525b" }}>{act.predictionTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: act.status === "success" ? "#22c55e" : "#f59e0b", fontFamily: "'Sora', sans-serif" }}>
                    {act.currency} {act.amount}
                  </p>
                  <p className="text-xs" style={{ color: "#3f3f46" }}>{act.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Slip Form Modal ──────────────────────────────────────────────────────────
function SlipModal({
  editing, initial, onSave, onClose, saving, token,
}: {
  editing: Prediction | null;
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => void;
  onClose: () => void;
  saving: boolean;
  token: string;
}) {
  const [form, setForm] = useState(initial);
  const [imgPreview, setImgPreview]       = useState(initial.imageUrl || "");
  const [proofPreview, setProofPreview]   = useState(initial.proofImageUrl || "");
  const [uploading, setUploading]         = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileRef      = useRef<HTMLInputElement>(null);
  const proofFileRef = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "price" ? Number(value) : value }));
  };

  const [imgUploadError, setImgUploadError]     = useState("");
  const [proofUploadError, setProofUploadError] = useState("");

  // Upload slip image to Supabase storage
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploadError("");
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImgPreview(localUrl);
    setUploading(true);
    try {
      const cdnUrl = await adminUploadImage(token, file);
      setImgPreview(cdnUrl);
      setForm(prev => ({ ...prev, imageUrl: cdnUrl }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err as Error)?.message || "Upload failed";
      setImgUploadError(msg);
      setImgPreview("");
      setForm(prev => ({ ...prev, imageUrl: "" }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Upload proof image to Supabase storage
  const onProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofUploadError("");
    const localUrl = URL.createObjectURL(file);
    setProofPreview(localUrl);
    setUploadingProof(true);
    try {
      const cdnUrl = await adminUploadImage(token, file);
      setProofPreview(cdnUrl);
      setForm(prev => ({ ...prev, proofImageUrl: cdnUrl }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err as Error)?.message || "Upload failed";
      setProofUploadError(msg);
      setProofPreview("");
      setForm(prev => ({ ...prev, proofImageUrl: "" }));
    } finally {
      setUploadingProof(false);
      if (proofFileRef.current) proofFileRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ background: "#0d0d11", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gold top strip */}
        <div style={{ height: "2px", background: "linear-gradient(90deg, #cba33d, #e8c05a, #cba33d)" }} />
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "#f4f4f5" }}>
            {editing ? "Edit Slip" : "Add New Slip"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "#52525b" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#f4f4f5")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#52525b")}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="admin-label">Title *</label>
            <input name="match" value={form.match} onChange={onChange}
              placeholder="e.g. Arsenal vs Chelsea" className="admin-input" required />
          </div>

          {/* Odds Category */}
          <div>
            <label className="admin-label">Odds Category</label>
            <select name="oddsCategory" value={
              ODDS_CATEGORIES.find(c => ODDS_VALUES[c] === form.oddsCategory) || "2+ ODDS"
            }
              onChange={e => setForm(prev => ({ ...prev, oddsCategory: ODDS_VALUES[e.target.value] }))}
              className="admin-select">
              {ODDS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="admin-label">Price (GHS)</label>
            <input name="price" type="number" value={form.price} onChange={onChange}
              min={1} className="admin-input" required />
          </div>

          {/* League + Odds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">League</label>
              <input name="league" value={form.league} onChange={onChange}
                placeholder="Premier League" className="admin-input" />
            </div>
            <div>
              <label className="admin-label">Odds (display)</label>
              <input name="odds" value={form.odds} onChange={onChange}
                placeholder="7.50" className="admin-input" />
            </div>
          </div>

          {/* Start / End Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Start Day</label>
              <input name="startDay" value={form.startDay} onChange={onChange}
                placeholder="e.g. Saturday" className="admin-input" />
            </div>
            <div>
              <label className="admin-label">End Day</label>
              <input name="endDay" value={form.endDay} onChange={onChange}
                placeholder="e.g. Sunday" className="admin-input" />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="admin-label">Date *</label>
            <input name="date" type="date" value={form.date} onChange={onChange}
              className="admin-input" required />
          </div>

          {/* Status + Result */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Status</label>
              <select name="status" value={form.status} onChange={onChange} className="admin-select">
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {form.status === "completed" && (
              <div>
                <label className="admin-label">Result</label>
                <select name="result" value={form.result ?? ""} onChange={e => setForm(prev => ({ ...prev, result: e.target.value as "win" | "loss" | null || null }))} className="admin-select">
                  <option value="">— Not set —</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                </select>
              </div>
            )}
          </div>

          {/* Booking content */}
          <div>
            <label className="admin-label">Prediction / Booking Code</label>
            <textarea name="content" value={form.content} onChange={onChange}
              rows={2} placeholder="Short summary: Arsenal to Win & Over 2.5 Goals"
              className="admin-input resize-y min-h-[60px]" />
          </div>

          {/* Booking code */}
          <div>
            <label className="admin-label">Betting Code (shown prominently when unlocked)</label>
            <input name="bookingCode" value={form.bookingCode} onChange={onChange}
              placeholder="e.g. ARS-CHE-8821" className="admin-input font-mono" />
          </div>

          {/* Tips list */}
          <div>
            <label className="admin-label">Tips (one per line)</label>
            <textarea name="tips" value={form.tips} onChange={onChange}
              rows={3} placeholder={"Arsenal to win\nBoth teams to score\nOver 2.5 goals total"}
              className="admin-input resize-y min-h-[80px] text-xs" />
          </div>

          {/* Bet Slip Image (before) */}
          <div>
            <label className="admin-label">Bet Slip Image <span className="text-slate-500 font-normal">(shown blurred before payment)</span></label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="admin-btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
                <Upload size={14} /> {uploading ? "Uploading…" : "Choose Image"}
              </button>
              <span className="text-slate-400 text-sm">
                {uploading ? "Uploading to storage…" : imgPreview && !imgUploadError ? "✅ Uploaded" : "No image chosen"}
              </span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onFile} />
            </div>
            {imgUploadError && (
              <p className="mt-2 text-red-400 text-xs">❌ Upload failed: {imgUploadError}</p>
            )}
            {imgPreview && !imgUploadError && (
              <div className="mt-3 relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgPreview} alt="Slip preview" className="h-28 rounded-xl object-cover border border-slate-700" />
                <button type="button" onClick={() => { setImgPreview(""); setImgUploadError(""); setForm(p => ({ ...p, imageUrl: "" })); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Proof Image — only shown when marking completed */}
          {form.status === "completed" && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <label className="admin-label text-emerald-400 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                Proof Image <span className="text-slate-400 font-normal">(result screenshot shown in History)</span>
              </label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => proofFileRef.current?.click()} disabled={uploadingProof}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}>
                  <Upload size={14} /> {uploadingProof ? "Uploading…" : "Upload Proof Image"}
                </button>
                <span className="text-slate-400 text-sm">
                  {uploadingProof ? "Uploading…" : proofPreview && !proofUploadError ? "✅ Uploaded" : "No proof yet"}
                </span>
                <input ref={proofFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onProofFile} />
              </div>
              {proofUploadError && (
                <p className="text-red-400 text-xs">❌ Upload failed: {proofUploadError}</p>
              )}
              {proofPreview && !proofUploadError && (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofPreview} alt="Proof preview" className="h-28 rounded-xl object-cover border border-emerald-700/50" />
                  <button type="button" onClick={() => { setProofPreview(""); setProofUploadError(""); setForm(p => ({ ...p, proofImageUrl: "" })); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="admin-btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? "Saving..." : editing ? "Update Slip" : "Create Slip"}
            </button>
            <button type="button" onClick={onClose} className="admin-btn-ghost flex-none px-6">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Manage Slips Section ─────────────────────────────────────────────────────
function ManageSlipsSection({ token }: { token: string }) {
  const [slips, setSlips] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setSlips(await adminGetPredictions(token)); }
    catch { showToast("err", "Failed to load slips."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = slips.filter(s =>
    s.match.toLowerCase().includes(search.toLowerCase()) ||
    (s.league || "").toLowerCase().includes(search.toLowerCase())
  );
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (form: typeof EMPTY_FORM) => {
    setSaving(true);
    try {
      const payload: Partial<Prediction> = {
        match: form.match, league: form.league, odds: form.odds,
        oddsCategory: form.oddsCategory as "2+" | "5+" | "10+" | "20+",
        price: form.price,
        content: form.content,
        bookingCode: form.bookingCode,
        tips: form.tips ? (form.tips as string).split("\n").map((t: string) => t.trim()).filter(Boolean) : [],
        imageUrl: form.imageUrl,
        proofImageUrl: form.proofImageUrl,
        date: form.date,
        status: form.status, result: form.result,
        startDay: form.startDay, endDay: form.endDay,
      };
      if (editing) { await adminUpdatePrediction(token, editing._id, payload); showToast("ok", "Slip updated!"); }
      else { await adminCreatePrediction(token, payload); showToast("ok", "Slip created!"); }
      setShowModal(false); setEditing(null);
      await load();
    } catch (err: unknown) {
      const serverMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showToast("err", serverMsg || "Failed to save. Check console for details.");
      console.error("Save prediction error:", err);
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await adminDeletePrediction(token, id);
      showToast("ok", "Slip deleted.");
      setDeleteId(null);
      await load();
    } catch { showToast("err", "Failed to delete."); }
    finally { setSaving(false); }
  };

  const openEdit = (slip: Prediction) => {
    setEditing(slip);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === "ok" ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300" : "bg-red-500/20 border border-red-500/40 text-red-300"}`}>
          {toast.type === "ok" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search slips..." className="admin-input pl-9 text-sm" />
        </div>
        <button onClick={openCreate} className="admin-btn-primary flex items-center gap-2">
          <Plus size={16} /> Add New Slip
        </button>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(203,163,61,0.08)", border: "1px solid rgba(203,163,61,0.18)" }}>
              <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
            </div>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Inbox size={22} className="text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">No slips found.</p>
            <button onClick={openCreate} className="admin-btn-primary mt-4">Create First Slip</button>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-700/30">
              {paginated.map(slip => (
                <div key={slip._id} className="px-4 py-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{slip.match}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <OddsBadge cat={slip.oddsCategory} />
                      <span className="text-slate-400 text-xs">GHS {slip.price}</span>
                      <StatusBadge status={slip.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(slip)} title="Edit"
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                      <Pencil size={15} />
                    </button>
                    {deleteId === slip._id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(slip._id)} disabled={saving}
                          className="text-xs text-red-400 border border-red-500/40 px-2 py-1 rounded-lg">
                          {saving ? "..." : "Del"}
                        </button>
                        <button onClick={() => setDeleteId(null)} className="p-1.5 text-slate-500 rounded-lg"><X size={13} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(slip._id)} title="Delete"
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/60">
                    {["Title", "Odds", "Price", "Status", "Purchases", "Actions"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {paginated.map(slip => (
                    <tr key={slip._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 text-white text-sm font-medium max-w-[220px] truncate">{slip.match}</td>
                      <td className="px-5 py-4"><OddsBadge cat={slip.oddsCategory} /></td>
                      <td className="px-5 py-4 text-slate-300 text-sm">GHS {slip.price}</td>
                      <td className="px-5 py-4"><StatusBadge status={slip.status} /></td>
                      <td className="px-5 py-4 text-slate-400 text-sm">0</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(slip)} title="Edit"
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                            <Pencil size={15} />
                          </button>
                          {deleteId === slip._id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(slip._id)} disabled={saving}
                                className="text-xs text-red-400 border border-red-500/40 px-2 py-1 rounded-lg hover:bg-red-500/10">
                                {saving ? "..." : "Confirm"}
                              </button>
                              <button onClick={() => setDeleteId(null)} className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg"><X size={13} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteId(slip._id)} title="Delete"
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 md:px-5 py-3 border-t border-slate-700/40 text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} slips
            </div>
          </>
        )}
      </div>

      <Pagination page={page} pages={pages} onPage={setPage} />

      {/* Modal */}
      {showModal && (
        <SlipModal
          editing={editing}
          initial={editing ? {
            match: editing.match, league: editing.league || "", odds: editing.odds,
            oddsCategory: editing.oddsCategory, price: editing.price,
            content: editing.content || "", bookingCode: (editing as {bookingCode?: string}).bookingCode || "",
            tips: ((editing as {tips?: string[]}).tips || []).join("\n"),
            imageUrl: editing.imageUrl || "",
            proofImageUrl: editing.proofImageUrl || "",
            date: new Date(editing.date).toISOString().split("T")[0],
            status: editing.status, result: editing.result,
            startDay: "", endDay: "",
          } : EMPTY_FORM}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
          saving={saving}
          token={token}
        />
      )}
    </>
  );
}

// ─── Payments Section ─────────────────────────────────────────────────────────
function PaymentsSection({ token }: { token: string }) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await adminGetPayments(token, p);
      setPayments(res.data); setTotal(res.total); setPages(res.pages);
    } catch { console.error("Failed to load payments"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(page); }, [load, page]);

  const filtered = payments.filter(p =>
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.reference.toLowerCase().includes(search.toLowerCase()) ||
    p.predictionTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#52525b" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search payments..." className="admin-input pl-9 text-sm" />
        </div>
        <div className="text-sm" style={{ color: "#52525b" }}>{total} total transactions</div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(17,17,23,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(203,163,61,0.08)", border: "1px solid rgba(203,163,61,0.18)" }}>
              <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "#52525b" }}>No payments found.</div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="md:hidden">
              {filtered.map((pmt, i) => (
                <div key={pmt._id} className="px-4 py-4"
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={{ background: "rgba(203,163,61,0.12)", border: "1px solid rgba(203,163,61,0.2)", color: "#cba33d", fontFamily: "'Sora', sans-serif" }}>
                        {pmt.email[0].toUpperCase()}
                      </div>
                      <span className="text-sm truncate max-w-[160px]" style={{ color: "#f4f4f5" }}>{pmt.email}</span>
                    </div>
                    <span className="font-black text-sm" style={{ color: pmt.status === "success" ? "#22c55e" : "#f59e0b", fontFamily: "'Sora', sans-serif" }}>
                      {pmt.currency} {pmt.amount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 ml-9">
                    <StatusBadge status={pmt.status} />
                    <span className="text-xs truncate" style={{ color: "#52525b" }}>{pmt.predictionTitle}</span>
                    <span className="text-xs ml-auto" style={{ color: "#3f3f46" }}>{new Date(pmt.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Customer", "Slip", "Reference", "Amount", "Status", "Date"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left"
                        style={{ fontSize: "0.65rem", fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Sora', sans-serif" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pmt, i) => (
                    <tr key={pmt._id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                            style={{ background: "rgba(203,163,61,0.12)", border: "1px solid rgba(203,163,61,0.2)", color: "#cba33d", fontFamily: "'Sora', sans-serif" }}>
                            {pmt.email[0].toUpperCase()}
                          </div>
                          <span className="text-sm" style={{ color: "#f4f4f5" }}>{pmt.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm max-w-[160px] truncate" style={{ color: "#a1a1aa" }}>{pmt.predictionTitle}</td>
                      <td className="px-5 py-4 text-xs font-mono" style={{ color: "#3f3f46" }}>{pmt.reference}</td>
                      <td className="px-5 py-4">
                        <span className="font-black text-sm" style={{ color: pmt.status === "success" ? "#22c55e" : "#f59e0b", fontFamily: "'Sora', sans-serif" }}>
                          {pmt.currency} {pmt.amount}
                        </span>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={pmt.status} /></td>
                      <td className="px-5 py-4 text-xs" style={{ color: "#52525b" }}>
                        {new Date(pmt.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: "0.7rem", color: "#3f3f46" }}>
              {total} total payments
            </div>
          </>
        )}
      </div>

      <Pagination page={page} pages={pages} onPage={p => { setPage(p); load(p); }} />
    </div>
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────
function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [section, setSection] = useState<Section>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { id: "overview" as Section, label: "Overview", icon: LayoutDashboard },
    { id: "slips"    as Section, label: "Manage Slips", icon: BookOpen },
    { id: "payments" as Section, label: "Payments", icon: CreditCard },
  ];

  const sectionTitle: Record<Section, string> = {
    overview: "Dashboard Overview",
    slips: "Manage Slips",
    payments: "Payments",
  };

  const goTo = (id: Section) => { setSection(id); setDrawerOpen(false); };

  // Sidebar nav content — shared between desktop sidebar and mobile drawer
  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: "1.05rem", textTransform: "uppercase", letterSpacing: "-0.02em", color: "#f4f4f5" }}>
            Wagering{" "}<span style={{ background: "linear-gradient(135deg,#cba33d,#e8c05a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Wizards</span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: "rgba(203,163,61,0.5)", fontFamily: "'Sora', sans-serif", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Admin Panel</div>
        </div>
        {/* Close button — only visible in drawer */}
        <button
          className="md:hidden p-1.5 transition-colors"
          style={{ color: "#52525b" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#f4f4f5")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
          onClick={() => setDrawerOpen(false)}
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => goTo(item.id)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-150"
            style={section === item.id ? {
              background: "rgba(203,163,61,0.1)",
              color: "#cba33d",
              border: "1px solid rgba(203,163,61,0.2)",
              fontFamily: "'Sora', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.01em",
            } : {
              color: "#52525b",
              border: "1px solid transparent",
              fontFamily: "'Sora', sans-serif",
              fontWeight: 500,
            }}
            onMouseEnter={e => { if (section !== item.id) { (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; } }}
            onMouseLeave={e => { if (section !== item.id) { (e.currentTarget as HTMLElement).style.color = "#52525b"; } }}
          >
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "#52525b", fontFamily: "'Sora', sans-serif", fontWeight: 500, border: "1px solid transparent" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.15)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#52525b"; (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "#09090b" }}>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed top-0 left-0 h-full z-50 flex flex-col w-72 transition-transform duration-300 md:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#0d0d11", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <SidebarContent />
      </div>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex w-60 flex-shrink-0 flex-col"
        style={{ background: "#0d0d11", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <SidebarContent />
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top header */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{ background: "rgba(9,9,11,0.92)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "saturate(180%) blur(20px)" }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "#a1a1aa", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Menu size={20} />
          </button>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "-0.02em", color: "#f4f4f5" }}>
            Wagering <span style={{ background: "linear-gradient(135deg,#cba33d,#e8c05a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Wizards</span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "#a1a1aa", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="px-4 md:px-8 py-5 md:py-7 max-w-6xl">
            <h1
              style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: "clamp(1.3rem,4vw,1.8rem)", textTransform: "uppercase", letterSpacing: "-0.02em", color: "#f4f4f5", marginBottom: "1.5rem" }}
            >
              {sectionTitle[section]}
            </h1>
            {section === "overview"  && <OverviewSection token={token} />}
            {section === "slips"     && <ManageSlipsSection token={token} />}
            {section === "payments"  && <PaymentsSection token={token} />}
          </div>
        </main>

        {/* ── Mobile bottom tab bar ── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex"
          style={{ background: "rgba(9,9,11,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)", backdropFilter: "saturate(180%) blur(20px)" }}
        >
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => goTo(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-colors"
              style={{ color: section === item.id ? "#cba33d" : "#52525b" }}
            >
              <item.icon size={20} />
              <span style={{ fontSize: "10px", fontFamily: "'Sora', sans-serif", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {item.label === "Manage Slips" ? "Slips" : item.label}
              </span>
              {section === item.id && (
                <div className="absolute bottom-0 h-0.5 w-8 rounded-full" style={{ background: "linear-gradient(90deg, #cba33d, #e8c05a)" }} />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}


// ─── Page Root ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("ww_admin_token");
    if (saved) setToken(saved);
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-screen bg-admin-bg" />;

  const handleLogin = (t: string) => setToken(t);
  const handleLogout = () => {
    setToken("");
    sessionStorage.removeItem("ww_admin_token");
    window.location.href = "/";
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}

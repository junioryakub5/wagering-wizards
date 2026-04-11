"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Calendar, CheckCircle2, XCircle, BarChart3, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getHistoryPredictions } from "@/lib/api";
import { Prediction } from "@/lib/types";

export default function HistoryPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getHistoryPredictions();
        setPredictions(data);
      } catch {
        setError("Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = predictions.filter((p) => {
    if (filter === "all") return true;
    return p.result === filter;
  });

  const wins = predictions.filter((p) => p.result === "win").length;
  const losses = predictions.filter((p) => p.result === "loss").length;
  const winRate = predictions.length > 0 ? Math.round((wins / predictions.length) * 100) : 0;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 relative z-10">
        <div className="page-container">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-brand text-3xl font-bold mb-2">Past Results</h1>
            <p className="text-gray-400">Our winning history and proven track record</p>
          </div>

          {/* Stats Banner */}
          {!loading && predictions.length > 0 && (
            <div
              className="rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center gap-6"
              style={{
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.2) 100%)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.2)" }}
                >
                  <TrendingUp size={22} className="text-emerald" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Proven Success</h2>
                  <p className="text-gray-400 text-sm">
                    Join thousands who trust Wagering Wizards
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8 md:ml-auto">
                <div className="text-center">
                  <p className="text-2xl font-black text-emerald">{winRate}%</p>
                  <p className="text-xs text-gray-400">Win Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-emerald">{wins}</p>
                  <p className="text-xs text-gray-400">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-red-400">{losses}</p>
                  <p className="text-xs text-gray-400">Losses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-gold">{predictions.length}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-3 mb-8">
            {(["all", "win", "loss"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-sm font-semibold px-5 py-2 rounded-full border capitalize transition-all duration-200 ${
                  filter === f
                    ? f === "win"
                      ? "bg-emerald text-white border-transparent"
                      : f === "loss"
                      ? "bg-red-500 text-white border-transparent"
                      : "bg-gradient-to-r from-gold to-amber text-bg-primary border-transparent"
                    : "border-white/10 text-gray-400 hover:border-white/20"
                }`}
                style={filter === f ? {} : { background: "rgba(25,20,60,0.6)" }}
              >
              {f === "all"
                ? "All Results"
                : f === "win"
                ? <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="flex-shrink-0" />Wins</span>
                : <span className="flex items-center gap-1.5"><XCircle size={13} className="flex-shrink-0" />Losses</span>}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(203,163,61,0.08)", border: "1px solid rgba(203,163,61,0.15)" }}>
                <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
              </div>
              <p className="text-gray-400 text-sm">Loading history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-24 text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <BarChart3 size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No results yet</p>
              <p className="text-gray-600 text-sm">
                Completed predictions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((pred) => (
                <ResultCard key={pred._id} prediction={pred} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ResultCard({ prediction }: { prediction: Prediction }) {
  const isWin    = prediction.result === "win";
  const hasBefore = !!prediction.imageUrl;
  const hasProof  = !!prediction.proofImageUrl;
  const hasImages = hasBefore || hasProof;

  return (
    <div className="card-glass overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 pt-4 md:pt-5 pb-4">
        <h3 className="font-bold text-base md:text-lg">{prediction.match}</h3>
        <span className="text-xs font-bold px-3 py-1 rounded-full text-gold border border-gold/30 bg-gold/10">
          {prediction.oddsCategory} ODDS
        </span>
        {prediction.result && (
          <span className={isWin ? "badge-win" : "badge-loss"}>
            {isWin
              ? <span className="flex items-center gap-1"><CheckCircle2 size={11} />WON</span>
              : <span className="flex items-center gap-1"><XCircle size={11} />LOST</span>}
          </span>
        )}
        <span className="text-gray-500 text-sm ml-auto flex items-center gap-1">
          <Calendar size={13} />
          {new Date(prediction.date).toLocaleDateString("en-GB", {
            weekday: "short", day: "numeric", month: "short",
          })}
        </span>
      </div>

      {/* ── Image evidence (primary content) ── */}
      {hasImages ? (
        <div className={`grid gap-0 ${hasBefore && hasProof ? "grid-cols-2" : "grid-cols-1"}`}
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>

          {/* Bet Slip — BEFORE */}
          {hasBefore && (
            <div className={`flex flex-col ${hasBefore && hasProof ? "border-r border-white/5" : ""}`}>
              <div className="flex items-center justify-between px-3 py-2"
                style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Bet Slip</span>
                <span className="text-[10px] text-gray-600 uppercase tracking-widest">Before</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prediction.imageUrl!}
                alt={`Bet slip — ${prediction.match}`}
                className="w-full object-contain"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  maxHeight: hasBefore && hasProof ? "280px" : "360px",
                  minHeight: "140px",
                }}
              />
            </div>
          )}

          {/* Result Proof — AFTER */}
          {hasProof && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-3 py-2"
                style={{
                  background: isWin ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                  borderBottom: `1px solid ${isWin ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`,
                }}>
                <span className={`text-[11px] font-bold uppercase tracking-wide ${isWin ? "text-emerald" : "text-red-400"}`}>Result Proof</span>
                <span className="text-[10px] text-gray-600 uppercase tracking-widest">After</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prediction.proofImageUrl!}
                alt={`Result proof — ${prediction.match}`}
                className="w-full object-contain"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  maxHeight: hasBefore && hasProof ? "280px" : "360px",
                  minHeight: "140px",
                }}
              />
            </div>
          )}
        </div>
      ) : (
        /* ── Fallback: no images — keep the old text/icon layout ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4 md:px-6 pb-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1.25rem" }}>
          <div>
            <p className="text-xs font-semibold text-gray-400 text-center mb-3">Our Prediction</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="bg-gradient-to-r from-red-700 to-red-600 px-4 py-3 flex justify-between items-center">
                <span className="font-black text-sm tracking-wider">SportyBet</span>
                <div className="text-right text-xs opacity-90">
                  <div>Betslip</div>
                  <div>{new Date(prediction.date).toLocaleDateString("en-GB")}</div>
                </div>
              </div>
              <div className="p-4" style={{ background: "#0a0818" }}>
                <p className="text-center text-xs text-gray-500 mb-1">Booking Code</p>
                <p className="text-center font-black text-xl text-wizard-purple-light tracking-widest mb-4">
                  {prediction.content || "—"}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Odds</span>
                    <span className="font-bold text-gold">{prediction.odds}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">League</span>
                    <span className="font-medium">{prediction.league}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className={`text-xs font-semibold text-center mb-3 ${isWin ? "text-emerald" : "text-red-400"}`}>
              Actual Result: <span className="font-black">{isWin ? "WON" : "LOST"}</span>
            </p>
            <div className="rounded-xl h-full flex flex-col items-center justify-center py-8 px-4 text-center"
              style={{
                background: isWin ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${isWin ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
              {isWin ? <CheckCircle2 size={48} className="text-emerald mb-3" /> : <XCircle size={48} className="text-red-400 mb-3" />}
              <p className={`font-black text-2xl mb-2 ${isWin ? "text-emerald" : "text-red-400"}`}>
                {isWin ? "Big Win!" : "Better luck next time"}
              </p>
              <p className="text-gray-500 text-sm">{prediction.match}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
        <span className="text-gray-600 text-xs">{prediction.league}</span>
        <span className={`text-xs font-semibold flex items-center gap-1 ${isWin ? "text-emerald" : "text-red-400"}`}>
          {isWin ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {isWin ? "Prediction correct" : "Prediction missed"}
        </span>
      </div>
    </div>
  );
}


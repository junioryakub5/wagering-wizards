"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, Calendar, Trophy, Clock, Copy, Check, XCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getUnlockedPrediction } from "@/lib/api";
import { UnlockData } from "@/lib/types";

export default function UnlockPage() {
  const params = useParams();
  const router = useRouter();
  const reference = params.reference as string;

  const [data, setData] = useState<UnlockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reference) return;
    const fetchData = async () => {
      try {
        const result = await getUnlockedPrediction(reference);
        setData(result);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "Access denied. Payment reference not found or expired.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reference]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 relative z-10">
        <div className="page-container max-w-2xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(203,163,61,0.08)", border: "1px solid rgba(203,163,61,0.15)" }}>
                <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
              </div>
              <p className="text-gray-400">Unlocking your prediction...</p>
            </div>
          ) : error ? (
            <div className="text-center py-32">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <XCircle size={40} className="text-red-400" />
              </div>
              <h1 className="font-brand text-2xl font-bold mb-3 text-red-400">
                Access Denied
              </h1>
              <p className="text-gray-400 mb-8 max-w-sm mx-auto">{error}</p>
              <button onClick={() => router.push("/")} className="btn-gold">
                Go Back Home
              </button>
            </div>
          ) : data ? (
            <div className="animate-fadeInUp">
              {/* Success Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 relative">
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: "linear-gradient(135deg, #d4af37, #f59e0b)" }}
                  />
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #d4af37, #f59e0b)" }}
                  >
                    <CheckCircle size={36} className="text-bg-primary" />
                  </div>
                </div>
                <h1 className="font-brand text-3xl font-bold mb-2">
                  Prediction{" "}
                  <span className="gradient-text-gold">Unlocked!</span>
                </h1>
                <p className="text-gray-400 text-sm">
                  Payment verified — Your prediction is ready below
                </p>
              </div>

              {/* Access Info */}
              <div
                className="card-glass p-5 mb-6 flex items-center gap-4"
              >
                <Clock size={18} className="text-gold flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-300">
                    Access valid until{" "}
                    <strong className="text-gold">
                      {new Date(data.payment.expiresAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Purchased by {data.payment.email}
                  </p>
                </div>
              </div>

              {/* Main Prediction Card */}
              <div className="card-glass overflow-hidden mb-6">
                {/* Card Header */}
                <div
                  className="px-6 py-4 border-b border-gold/10"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(124,58,237,0.1) 100%)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-xl mb-1">{data.prediction.match}</h2>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {new Date(data.prediction.date).toLocaleDateString("en-GB", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                        <span>·</span>
                        <span>{data.prediction.league}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs font-black px-3 py-1 rounded-full block text-center mb-1"
                        style={{ background: "linear-gradient(135deg,#d4af37,#f59e0b)", color: "#0c0a1d" }}>
                        {data.prediction.oddsCategory} ODDS
                      </span>
                      <p className="text-center text-xs text-gray-400">
                        Total: <strong className="text-gold">{data.prediction.odds}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prediction Content */}
                <div className="px-6 py-6">
                  <div
                    className="rounded-xl p-5 mb-4"
                    style={{
                      background: "rgba(212,175,55,0.05)",
                      border: "1px solid rgba(212,175,55,0.15)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy size={16} className="text-gold" />
                        <span className="text-sm font-semibold text-gold">
                          Prediction Content
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(data.prediction.content || "")}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gold transition-colors"
                      >
                        {copied ? (
                          <><Check size={12} className="text-emerald" /> Copied!</>
                        ) : (
                          <><Copy size={12} /> Copy</>
                        )}
                      </button>
                    </div>
                    <p className="text-white leading-relaxed whitespace-pre-wrap text-sm">
                      {data.prediction.content || "No content provided."}
                    </p>
                  </div>

                  {/* Image if available */}
                  {data.prediction.imageUrl && (
                    <div className="rounded-xl overflow-hidden mt-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.prediction.imageUrl}
                        alt={`Bet slip for ${data.prediction.match}`}
                        className="w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Reference Footer */}
                <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Reference: <code className="text-gray-400">{reference}</code>
                  </span>
                  <span className="text-xs text-gray-500">
                    GHS {data.payment.amount} paid
                  </span>
                </div>
              </div>

              {/* Share / Back */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push("/")}
                  className="btn-outline-gold flex-1"
                >
                  View More Tips
                </button>
                <button
                  onClick={() => router.push("/history")}
                  className="btn-outline-gold flex-1"
                >
                  Past Results
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

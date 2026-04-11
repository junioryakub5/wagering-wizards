"use client";

import { useState, useEffect } from "react";
import { Filter, Star, TrendingUp, Shield, Loader2, CalendarX2, BarChart2, ShieldCheck, Zap, Wand2, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PredictionCard from "@/components/PredictionCard";
import { getActivePredictions } from "@/lib/api";
import { Prediction } from "@/lib/types";

const FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "2+ ODDS", value: "2+" },
  { label: "5+ ODDS", value: "5+" },
  { label: "10+ ODDS", value: "10+" },
  { label: "20+ ODDS", value: "20+" },
];

const STATS = [
  { icon: <Star size={20} />, label: "Win Rate", value: "87%" },
  { icon: <TrendingUp size={20} />, label: "Predictions", value: "500+" },
  { icon: <Shield size={20} />, label: "Verified Tips", value: "100%" },
];

export default function HomePage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPredictions("all");
  }, []);

  const fetchPredictions = async (category: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await getActivePredictions(category === "all" ? undefined : category);
      setPredictions(data);
    } catch {
      setError("Failed to load predictions. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (value: string) => {
    setActiveFilter(value);
    fetchPredictions(value);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen">
        {/* ── Hero ── */}
        <section className="pt-24 pb-10 relative z-10">
          <div className="page-container text-center">
            {/* Brand Icon */}
            <div className="flex justify-center mb-5">
              <div
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(203,163,61,0.15), rgba(232,192,90,0.08))",
                  border: "1px solid rgba(203,163,61,0.25)",
                  boxShadow: "0 0 40px rgba(203,163,61,0.15)",
                }}
              >
                <Wand2 size={36} style={{ color: "#cba33d" }} strokeWidth={1.5} />
                <Sparkles
                  size={16}
                  className="absolute -top-2 -right-2 animate-bounce"
                  style={{ color: "#e8c05a" }}
                />
              </div>
            </div>

            {/* Headline — Alukyi heavy condensed style */}
            <h1 className="section-title mb-3">
              This Week&apos;s{" "}
              <span
                className="bg-clip-text text-transparent animate-shimmer"
                style={{
                  backgroundImage: "linear-gradient(90deg, #cba33d, #e8c05a, #cba33d, #e8c05a)",
                  backgroundSize: "300% 100%",
                }}
              >
                Featured Tips
              </span>
            </h1>
            <p className="text-gray-500 text-base max-w-md mx-auto mb-10">
              Unlock premium predictions with guaranteed odds. Expert analysis for every match.
            </p>

            {/* Stats Row — Alukyi large coloured numbers */}
            <div className="flex items-center justify-center gap-10 md:gap-20 mb-10">
              {[
                { label: "WIN RATE",        value: "87%",  color: "#cba33d" },
                { label: "PREDICTIONS",     value: "500+", color: "#a78fff" },
                { label: "VERIFIED TIPS",   value: "100%", color: "#cba33d" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <span
                    className="block font-display font-black leading-none mb-1"
                    style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", color: stat.color }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Filter Bar */}
            {/* Label row — always visible */}
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-3">
              <Filter size={15} />
              <span>Filter by odds</span>
            </div>

            {/* Pills — scroll on mobile, centered wrap on desktop */}
            <div className="relative">
              {/* Fade-out hint on the right (mobile only) */}
              <div className="pointer-events-none absolute right-0 top-0 h-full w-8 z-10 md:hidden"
                style={{ background: "linear-gradient(to right, transparent, #0c0a1d)" }} />
              <div className="flex items-center gap-2.5 overflow-x-auto md:flex-wrap md:justify-center md:overflow-visible
                px-1 pb-1 scroll-smooth
                scrollbar-none [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleFilter(tab.value)}
                    className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-full border transition-all duration-200 ${
                      activeFilter === tab.value
                        ? "bg-gradient-to-r from-gold to-amber text-bg-primary border-transparent shadow-button"
                        : "border-gold/15 text-gray-400 hover:border-gold/30 hover:text-gold/80"
                    }`}
                    style={
                      activeFilter === tab.value
                        ? { backgroundColor: undefined }
                        : { background: "rgba(25,20,60,0.6)" }
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Cards Grid ── */}
        <section className="pb-16 relative z-10">
          <div className="page-container">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(203,163,61,0.08)", border: "1px solid rgba(203,163,61,0.15)" }}>
                  <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
                </div>
                <p className="text-gray-400 text-sm">Loading predictions...</p>
              </div>
            ) : error ? (
              <div className="text-center py-24">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={() => fetchPredictions(activeFilter)}
                  className="btn-outline-gold"
                >
                  Try Again
                </button>
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <CalendarX2 size={30} className="text-gray-600" />
                </div>
                <p className="text-gray-400 text-lg mb-2">No predictions available</p>
                <p className="text-gray-600 text-sm">Check back soon — new tips are being prepared.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {predictions.map((pred, idx) => (
                    <PredictionCard
                      key={pred._id}
                      prediction={pred}
                      animationDelay={idx * 100}
                    />
                  ))}
                </div>

                {/* View History CTA */}
                <div className="text-center mt-12">
                  <a href="/history" className="btn-outline-gold inline-block">
                    View Past Results
                  </a>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Trust Section ── */}
        <section className="py-16 relative z-10">
          <div className="page-container"><hr className="section-divider mb-16" /></div>
          <div className="page-container text-center">
            <h2
              className="font-display font-black uppercase mb-3"
              style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", letterSpacing: "-0.01em" }}
            >
              Why Trust{" "}
              <span className="gradient-text-gold">Wagering Wizards?</span>
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-10">
              Every prediction is verified by expert analysts. Secure payments via Paystack.
              Access your slip instantly after payment.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
              {[
                { icon: <BarChart2 size={28} style={{ color: "#cba33d" }} />, title: "Expert Analysis", desc: "Deep match research and statistic-driven predictions" },
                { icon: <ShieldCheck size={28} style={{ color: "#cba33d" }} />, title: "Secure Payments", desc: "Paystack-powered payments — safe and instant" },
                { icon: <Zap size={28} style={{ color: "#cba33d" }} />, title: "Instant Access",  desc: "Unlock your prediction immediately after payment" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl p-5 text-center transition-all duration-200 hover:-translate-y-1"
                  style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(203,163,61,0.12)" }}
                >
                  <div className="flex justify-center mb-2.5">{item.icon}</div>
                  <h3 className="font-display font-bold uppercase text-sm tracking-wider text-white mb-1">{item.title}</h3>
                  <p className="hidden md:block text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

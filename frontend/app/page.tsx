"use client";

import { useState, useEffect } from "react";
import { Filter, BarChart2, ShieldCheck, Zap, Loader2, CalendarX2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PredictionCard from "@/components/PredictionCard";
import { getActivePredictions } from "@/lib/api";
import { Prediction } from "@/lib/types";

const FILTER_TABS = [
  { label: "All",      value: "all" },
  { label: "2+ ODDS",  value: "2+" },
  { label: "5+ ODDS",  value: "5+" },
  { label: "10+ ODDS", value: "10+" },
  { label: "20+ ODDS", value: "20+" },
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

      <main className="min-h-screen" style={{ background: "var(--bg-primary)" }}>

        {/* ── Hero Section ── */}
        <section
          className="pt-20 pb-6 relative overflow-hidden"
          style={{ background: "#09090b", display: "flex", flexDirection: "column", justifyContent: "center" }}
        >
          {/* Ambient glows + grid */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="hero-glow-1" />
            <div className="hero-glow-2" />
            <div className="hero-glow-3" />
            <div className="hero-grid" />
          </div>

          <div className="page-container relative z-10 text-center flex flex-col items-center">

            {/* Badge */}
            <div className="flex justify-center mb-5 animate-fadeInUp">
              <div className="hero-badge">
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#cba33d",
                    boxShadow: "0 0 8px #cba33d",
                    display: "inline-block",
                    animation: "pulse 2s infinite",
                  }}
                />
                Premium Football Predictions
              </div>
            </div>

            {/* Headline */}
            <h1
              className="animate-fadeInUp"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 900,
                fontSize: "clamp(2.2rem, 7vw, 5.5rem)",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: "#f4f4f5",
                maxWidth: "900px",
                marginBottom: "1.5rem",
                textTransform: "uppercase",
              }}
            >
              YOU CAN&apos;T BE{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #cba33d 0%, #e8c05a 50%, #f5d37a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 30px rgba(203,163,61,0.5))",
                  display: "inline-block",
                }}
              >
                UNLUCKY
              </span>
              <br />
              <span
                style={{
                  fontSize: "clamp(1.6rem, 5.5vw, 4.2rem)",
                  color: "#a1a1aa",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                FOR{" "}
                <span style={{ color: "#f4f4f5", fontWeight: 900, fontSize: "clamp(2.2rem, 7vw, 5.5rem)" }}>
                  365
                </span>{" "}
                DAYS
              </span>
            </h1>

            <p
              className="animate-fadeInUp"
              style={{
                color: "#52525b",
                fontSize: "clamp(0.85rem, 2vw, 1.05rem)",
                maxWidth: "420px",
                lineHeight: 1.65,
                marginBottom: "3rem",
                fontWeight: 500,
              }}
            >
              Expert-verified football tips. Unlock the slip, place the bet,{" "}
              <span style={{ color: "#cba33d", fontWeight: 700 }}>collect the money.</span>
            </p>

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-2 mb-6 animate-fadeInUp w-full">
              {[
                { label: "Win Rate",    value: "87%",  color: "#cba33d" },
                { label: "Predictions", value: "500+", color: "#e8c05a" },
                { label: "Verified",    value: "100%", color: "#cba33d" },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <span
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontWeight: 900,
                      fontSize: "clamp(1.2rem, 4vw, 1.8rem)",
                      color: stat.color,
                      lineHeight: 1,
                      filter: `drop-shadow(0 0 12px ${stat.color}66)`,
                    }}
                  >
                    {stat.value}
                  </span>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#3f3f46",
                      marginTop: "4px",
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Filter label */}
            <div
              className="flex items-center justify-center gap-2 text-xs mb-3 animate-fadeInUp"
              style={{
                color: "#3f3f46",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              <Filter size={12} />
              <span>Filter by odds</span>
            </div>

            {/* Filter Pills */}
            <div className="relative w-full animate-fadeInUp">
              {/* Fade hint on mobile */}
              <div
                className="pointer-events-none absolute right-0 top-0 h-full w-12 z-10 md:hidden"
                style={{ background: "linear-gradient(to right, transparent, #09090b)" }}
                aria-hidden="true"
              />
              <div
                className="flex items-center gap-2 overflow-x-auto md:flex-wrap md:justify-center md:overflow-visible px-1 pb-1 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleFilter(tab.value)}
                    className={`filter-tab ${activeFilter === tab.value ? "active" : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ── Cards Grid ── */}
        <section className="pb-16 relative z-10" style={{ background: "#09090b" }}>
          <div className="page-container pt-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(203,163,61,0.08)",
                    border: "1px solid rgba(203,163,61,0.18)",
                  }}
                >
                  <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
                </div>
                <p style={{ color: "#52525b" }} className="text-sm">
                  Loading predictions...
                </p>
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
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <CalendarX2 size={30} className="text-gray-600" />
                </div>
                <p style={{ color: "#a1a1aa" }} className="text-lg mb-2">
                  No predictions available
                </p>
                <p style={{ color: "#52525b" }} className="text-sm">
                  Check back soon — new tips are being prepared.
                </p>
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
        <section className="py-12 md:py-20 relative z-10" style={{ background: "#09090b" }}>
          <div className="glow-line mb-10 md:mb-16" aria-hidden="true" />
          <div className="page-container text-center">
            <h2
              className="font-display font-bold mb-2 md:mb-3"
              style={{
                fontSize: "clamp(1.4rem, 5vw, 2.8rem)",
                letterSpacing: "-0.03em",
                color: "#f4f4f5",
              }}
            >
              Why Trust{" "}
              <span className="gradient-text-gold">Wagering Wizards?</span>
            </h2>
            <p
              className="text-xs md:text-sm max-w-md mx-auto mb-6 md:mb-14 leading-relaxed"
              style={{ color: "#a1a1aa" }}
            >
              Expert-verified predictions. Secure payments via Paystack. Instant access.
            </p>

            <div className="grid grid-cols-3 gap-2 md:gap-5 max-w-4xl mx-auto">
              {[
                {
                  icon: <BarChart2 size={22} />,
                  iconBg: "rgba(203,163,61,0.1)",
                  iconBorder: "rgba(203,163,61,0.2)",
                  iconColor: "#cba33d",
                  title: "Expert Analysis",
                  desc: "Statistic-driven predictions backed by deep match research",
                },
                {
                  icon: <ShieldCheck size={22} />,
                  iconBg: "rgba(34,197,94,0.1)",
                  iconBorder: "rgba(34,197,94,0.18)",
                  iconColor: "#22c55e",
                  title: "Secure Payments",
                  desc: "Paystack-powered payments — safe and instant",
                },
                {
                  icon: <Zap size={22} />,
                  iconBg: "rgba(232,192,90,0.1)",
                  iconBorder: "rgba(232,192,90,0.18)",
                  iconColor: "#e8c05a",
                  title: "Instant Access",
                  desc: "Unlock your prediction immediately after payment",
                },
              ].map((item) => (
                <div key={item.title} className="feature-card">
                  <div
                    className="feature-icon"
                    style={{
                      background: item.iconBg,
                      border: `1px solid ${item.iconBorder}`,
                      color: item.iconColor,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="font-display font-bold text-[11px] md:text-sm mb-0.5 md:mb-2 tracking-wide"
                      style={{ color: "#f4f4f5" }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-[10px] md:text-xs leading-relaxed hidden md:block"
                      style={{ color: "#a1a1aa" }}
                    >
                      {item.desc}
                    </p>
                  </div>
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

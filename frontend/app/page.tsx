"use client";

import { useState, useEffect } from "react";
import { Filter, BarChart2, ShieldCheck, Zap, Loader2, CalendarX2, Trophy, TrendingUp, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PredictionCard from "@/components/PredictionCard";

import { getActivePredictions } from "@/lib/api";
import { Prediction } from "@/lib/types";

const FILTER_TABS = [
  { label: "All",      value: "all" },
  { label: "2+ ODDS",  value: "2+"  },
  { label: "5+ ODDS",  value: "5+"  },
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

      <main className="min-h-screen" style={{ background: "#09090b" }}>

        {/* ── Hero ── */}
        <section className="pt-28 pb-16 relative overflow-hidden" style={{ background: "#09090b" }}>

          {/* Background atmosphere */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {/* Large gold orb top-right */}
            <div style={{
              position: "absolute", top: "-10%", right: "-5%",
              width: "700px", height: "700px", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(203,163,61,0.12) 0%, rgba(203,163,61,0.04) 50%, transparent 70%)",
              filter: "blur(60px)",
            }} />
            {/* Smaller gold orb bottom-left */}
            <div style={{
              position: "absolute", bottom: "0%", left: "-8%",
              width: "400px", height: "400px", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(160,120,16,0.1) 0%, transparent 70%)",
              filter: "blur(50px)",
            }} />
            {/* Subtle grid overlay */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "linear-gradient(rgba(203,163,61,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(203,163,61,0.02) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 100%)",
            }} />
          </div>

          <div className="page-container text-center relative z-10">

            {/* Hero badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase mb-6 animate-fadeInUp"
              style={{
                background: "rgba(203,163,61,0.08)",
                border: "1px solid rgba(203,163,61,0.28)",
                color: "#cba33d",
              }}
            >
              <span style={{
                width: "5px", height: "5px", borderRadius: "50%",
                background: "#cba33d", boxShadow: "0 0 8px #cba33d",
                display: "inline-block",
              }} />
              Premium Football Predictions
            </div>


            {/* Headline */}
            <h1
              className="animate-fadeInUp"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(2.4rem, 7vw, 5rem)",
                lineHeight: 1.0,
                letterSpacing: "-0.03em",
                color: "#f4f4f5",
                marginBottom: "1rem",
              }}
            >
              This Week&apos;s{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #cba33d 0%, #e8c05a 50%, #a07820 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 24px rgba(203,163,61,0.4))",
                  display: "inline-block",
                }}
              >
                Featured Tips
              </span>
            </h1>

            <p
              className="animate-fadeInUp"
              style={{
                color: "#52525b",
                fontSize: "clamp(0.9rem, 2.2vw, 1.05rem)",
                maxWidth: "500px",
                margin: "0 auto 3rem",
                lineHeight: 1.7,
              }}
            >
              Unlock premium predictions with guaranteed odds. Expert analysis, verified results, instant access.
            </p>

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-3 md:gap-5 mb-14 animate-fadeInUp">
              {[
                { icon: <Trophy size={18} />,    label: "Win Rate",    value: "87%",  color: "#cba33d", glow: "rgba(203,163,61,0.35)"  },
                { icon: <TrendingUp size={18} />, label: "Predictions", value: "500+", color: "#e8e8e8", glow: "rgba(232,232,232,0.15)" },
                { icon: <Shield size={18} />,     label: "Verified",    value: "100%", color: "#e8c05a", glow: "rgba(232,192,90,0.30)"  },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-1 px-5 py-4 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                  style={{
                    background: "rgba(17,17,23,0.85)",
                    border: "1px solid rgba(203,163,61,0.12)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)",
                    backdropFilter: "blur(16px)",
                    minWidth: "100px",
                    borderRadius: "16px",
                  }}
                >
                  <div style={{ color: stat.color }}>{stat.icon}</div>
                  <span
                    className="font-display font-bold"
                    style={{
                      fontSize: "1.6rem",
                      color: stat.color,
                      filter: `drop-shadow(0 0 12px ${stat.glow})`,
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </span>
                  <span
                    className="text-[10px] font-semibold tracking-wider uppercase"
                    style={{ color: "#3f3f46", fontFamily: "'Sora', sans-serif" }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Filter label */}
            <div className="flex items-center justify-center gap-2 text-sm mb-3" style={{ color: "#3f3f46" }}>
              <Filter size={14} />
              <span className="font-medium uppercase text-xs tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>Filter by odds</span>
            </div>

            {/* Filter pills */}
            <div className="relative">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-8 z-10 md:hidden"
                style={{ background: "linear-gradient(to right, transparent, #09090b)" }} />
              <div
                className="flex items-center gap-2 overflow-x-auto md:flex-wrap md:justify-center md:overflow-visible px-1 pb-1 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleFilter(tab.value)}
                    className="flex-shrink-0 text-xs font-semibold px-5 py-2 border transition-all duration-300"
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      borderRadius: "10px",
                      ...(activeFilter === tab.value
                        ? {
                          background: "linear-gradient(135deg, #cba33d, #a07820)",
                          color: "#09090b",
                          borderColor: "transparent",
                          boxShadow: "0 0 20px rgba(203,163,61,0.4)",
                        }
                        : {
                          background: "rgba(17,17,23,0.8)",
                          color: "#52525b",
                          borderColor: "rgba(255,255,255,0.07)",
                        }),
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Cards Grid ── */}
        <section className="pb-20 relative z-10" style={{ background: "#09090b" }}>
          <div className="page-container pt-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div
                  className="w-16 h-16 flex items-center justify-center"
                  style={{
                    background: "rgba(203,163,61,0.08)",
                    border: "1px solid rgba(203,163,61,0.2)",
                    borderRadius: "16px",
                    boxShadow: "0 0 24px rgba(203,163,61,0.15)",
                  }}
                >
                  <Loader2 size={28} style={{ color: "#cba33d" }} className="animate-spin" />
                </div>
                <p style={{ color: "#52525b" }} className="text-sm">Loading predictions...</p>
              </div>
            ) : error ? (
              <div className="text-center py-24">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={() => fetchPredictions(activeFilter)} className="btn-outline-gold">
                  Try Again
                </button>
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-24">
                <div
                  className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
                  style={{
                    background: "rgba(17,17,23,0.8)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "16px",
                  }}
                >
                  <CalendarX2 size={28} style={{ color: "#3f3f46" }} />
                </div>
                <p className="text-lg mb-2 font-display font-semibold" style={{ color: "#f4f4f5" }}>No predictions available</p>
                <p className="text-sm" style={{ color: "#52525b" }}>Check back soon — new tips are being prepared.</p>
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
                <div className="text-center mt-14">
                  <a href="/history" className="btn-outline-gold">
                    View Past Results
                  </a>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Trust Section ── */}
        <section className="py-12 md:py-20 relative z-10" style={{ background: "#0f0f11" }}>
          {/* Gold top divider */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(203,163,61,0.3), rgba(232,192,90,0.3), transparent)" }}
          />

          <div className="page-container text-center">
            <p
              className="text-xs font-bold tracking-widest uppercase mb-4"
              style={{ color: "#cba33d", letterSpacing: "0.12em", fontFamily: "'Sora', sans-serif" }}
            >
              Why Us
            </p>
            <h2
              className="font-display font-bold mb-2 md:mb-3"
              style={{ fontSize: "clamp(1.4rem,5vw,2.8rem)", letterSpacing: "-0.02em", color: "#f4f4f5" }}
            >
              Why Trust{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #cba33d, #e8c05a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Wagering Wizards?
              </span>
            </h2>
            <p className="text-xs md:text-sm max-w-md mx-auto mb-8 md:mb-14 leading-relaxed" style={{ color: "#52525b" }}>
              Expert-verified predictions. Secure payments via Paystack. Instant access.
            </p>

            {/* 3-col grid */}
            <div className="grid grid-cols-3 gap-2 md:gap-5 max-w-4xl mx-auto">
              {[
                {
                  icon: <BarChart2 size={20} />,
                  title: "Expert Analysis",
                  desc: "Statistic-driven predictions backed by deep match research and form data",
                  color: "#cba33d",
                  bg: "rgba(203,163,61,0.08)",
                  borderColor: "rgba(203,163,61,0.2)",
                  glow: "rgba(203,163,61,0.08)",
                },
                {
                  icon: <ShieldCheck size={20} />,
                  title: "Secure Payments",
                  desc: "Paystack-powered payments — bank-grade security, instant confirmation",
                  color: "#e8e8e8",
                  bg: "rgba(232,232,232,0.04)",
                  borderColor: "rgba(232,232,232,0.1)",
                  glow: "rgba(232,232,232,0.04)",
                },
                {
                  icon: <Zap size={20} />,
                  title: "Instant Access",
                  desc: "Unlock your prediction immediately after payment — no delays",
                  color: "#e8c05a",
                  bg: "rgba(232,192,90,0.08)",
                  borderColor: "rgba(232,192,90,0.2)",
                  glow: "rgba(232,192,90,0.06)",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-center text-center p-3 md:p-7 transition-all duration-300 hover:-translate-y-1 md:hover:-translate-y-2 group"
                  style={{
                    background: "rgba(17,17,23,0.7)",
                    border: `1px solid ${item.borderColor}`,
                    boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 20px ${item.glow}`,
                    backdropFilter: "blur(16px)",
                    borderRadius: "16px",
                  }}
                >
                  <div
                    className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center mb-2 md:mb-4 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: item.bg,
                      color: item.color,
                      borderRadius: "12px",
                      border: `1px solid ${item.borderColor}`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-[11px] md:text-sm mb-0.5 md:mb-2 tracking-wide uppercase" style={{ color: "#f4f4f5" }}>{item.title}</h3>
                    <p className="text-[10px] md:text-xs leading-relaxed hidden md:block" style={{ color: "#52525b" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="py-16 relative overflow-hidden" style={{ background: "#09090b" }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(203,163,61,0.06) 0%, transparent 70%)",
            }}
          />
          <div className="page-container text-center relative z-10">
            <p
              className="text-xs font-bold tracking-widest uppercase mb-4"
              style={{ color: "#cba33d", letterSpacing: "0.12em", fontFamily: "'Sora', sans-serif" }}
            >
              Get Started
            </p>
            <h2
              className="font-display font-bold mb-4"
              style={{ fontSize: "clamp(1.6rem,5vw,3rem)", letterSpacing: "-0.02em", color: "#f4f4f5" }}
            >
              Ready to Bet With Confidence?
            </h2>
            <p className="text-sm max-w-md mx-auto mb-8" style={{ color: "#52525b" }}>
              Join thousands of bettors winning consistently with expert Wagering Wizards tips.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href="/about" className="btn-gold" style={{ borderRadius: "12px" }}>
                Learn More
              </a>
              <a href="/history" className="btn-outline-gold" style={{ borderRadius: "12px" }}>
                View Track Record
              </a>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

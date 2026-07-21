import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Wand2, Trophy, ShieldCheck, TrendingUp, Star, Users } from "lucide-react";

export const metadata = {
  title: "About – Wagering Wizards",
  description: "Learn about Wagering Wizards – Ghana's most trusted premium football prediction platform with verified tips and expert analysis.",
};

const stats = [
  { icon: Trophy,    value: "87%",  label: "Win Rate"       },
  { icon: TrendingUp, value: "500+", label: "Predictions"   },
  { icon: Users,     value: "5K+",  label: "Happy Bettors"  },
  { icon: ShieldCheck, value: "100%", label: "Verified Tips" },
];

const values = [
  {
    icon: "🎯",
    title: "Precision Analysis",
    desc: "Every tip is backed by deep statistical research, team form, head-to-head records, and live injury reports — so you always bet informed.",
  },
  {
    icon: "🔐",
    title: "Transparent Results",
    desc: "We publish every result, win or loss. Our track record is public and verifiable — no cherry-picking, just honest performance.",
  },
  {
    icon: "⚡",
    title: "Premium Access",
    desc: "Booking codes are released only to subscribers who unlock a slip, giving you a real edge before the market moves.",
  },
  {
    icon: "🌍",
    title: "Built for Ghana",
    desc: "Seamlessly integrated with Paystack for fast, secure GHS payments — designed around the needs of Ghanaian bettors.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen" style={{ background: "#09090b" }}>

        {/* ── Hero ── */}
        <section className="pt-28 pb-16 relative overflow-hidden" style={{ background: "#09090b" }}>
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="hero-glow-1" />
            <div className="hero-glow-2" />
            <div className="hero-grid" />
          </div>

          <div className="page-container relative z-10 text-center flex flex-col items-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 animate-fadeInUp"
              style={{
                background: "linear-gradient(135deg, rgba(203,163,61,0.15), rgba(232,192,90,0.08))",
                border: "1px solid rgba(203,163,61,0.28)",
                boxShadow: "0 0 40px rgba(203,163,61,0.12)",
              }}
            >
              <Wand2 size={36} style={{ color: "#cba33d" }} strokeWidth={1.5} />
            </div>

            <h1
              className="section-title mb-4 animate-fadeInUp"
              style={{ maxWidth: 600 }}
            >
              About{" "}
              <span
                className="bg-clip-text text-transparent animate-shimmer"
                style={{
                  backgroundImage: "linear-gradient(90deg, #cba33d, #e8c05a, #cba33d, #e8c05a)",
                  backgroundSize: "300% 100%",
                }}
              >
                Wagering Wizards
              </span>
            </h1>

            <p
              className="animate-fadeInUp"
              style={{
                color: "#52525b",
                fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
                maxWidth: 520,
                lineHeight: 1.75,
                marginBottom: "3rem",
              }}
            >
              Ghana&apos;s premier football prediction platform — built for smart bettors who demand accuracy, transparency, and expert insight.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-3 animate-fadeInUp">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center gap-1 px-6 py-4 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                  style={{
                    background: "rgba(17,17,23,0.85)",
                    border: "1px solid rgba(203,163,61,0.12)",
                    borderRadius: 16,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    backdropFilter: "blur(16px)",
                    minWidth: 100,
                  }}
                >
                  <s.icon size={18} style={{ color: "#cba33d" }} />
                  <span
                    className="font-display font-bold"
                    style={{ fontSize: "1.55rem", color: "#cba33d", lineHeight: 1, filter: "drop-shadow(0 0 12px rgba(203,163,61,0.35))" }}
                  >
                    {s.value}
                  </span>
                  <span
                    className="text-[10px] font-semibold tracking-wider uppercase"
                    style={{ color: "#3f3f46" }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Our Story ── */}
        <section className="py-16" style={{ background: "#09090b" }}>
          <div className="page-container">
            <div
              className="rounded-3xl p-8 md:p-12"
              style={{
                background: "rgba(17,17,23,0.8)",
                border: "1px solid rgba(203,163,61,0.1)",
                boxShadow: "0 4px 60px rgba(0,0,0,0.4)",
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📖</span>
                <h2
                  className="font-display font-bold"
                  style={{ fontSize: "clamp(1.3rem, 3vw, 1.8rem)", color: "#f4f4f5" }}
                >
                  Our Story
                </h2>
              </div>
              <div className="space-y-4" style={{ color: "#a1a1aa", lineHeight: 1.85, fontSize: "0.97rem" }}>
                <p>
                  Wagering Wizards was founded with one mission: to give Ghanaian football fans access to the same level of professional analysis that professional tipsters use — packaged simply, priced fairly, and delivered with integrity.
                </p>
                <p>
                  We noticed that most prediction services either flooded bettors with low-quality tips or hid their track records entirely. We built something different — a platform where every slip is researched rigorously, every result is published openly, and every customer gets genuine value.
                </p>
                <p>
                  Today, thousands of bettors across Ghana trust Wagering Wizards to help them make smarter, more profitable decisions. We&apos;re proud of our{" "}
                  <span style={{ color: "#cba33d", fontWeight: 700 }}>87% verified win rate</span> and even prouder of the community we&apos;ve built around honest, expert predictions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="py-10 pb-20" style={{ background: "#09090b" }}>
          <div className="page-container">
            <h2
              className="font-display font-bold text-center mb-10"
              style={{ fontSize: "clamp(1.2rem, 3vw, 1.7rem)", color: "#f4f4f5" }}
            >
              What Sets Us{" "}
              <span style={{ color: "#cba33d" }}>Apart</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {values.map((v) => (
                <div
                  key={v.title}
                  className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "rgba(17,17,23,0.9)",
                    border: "1px solid rgba(203,163,61,0.08)",
                    boxShadow: "0 2px 24px rgba(0,0,0,0.3)",
                  }}
                >
                  <span className="text-3xl mb-4 block">{v.icon}</span>
                  <h3
                    className="font-bold mb-2"
                    style={{ color: "#f4f4f5", fontSize: "1rem", fontFamily: "'Sora', sans-serif" }}
                  >
                    {v.title}
                  </h3>
                  <p style={{ color: "#52525b", fontSize: "0.88rem", lineHeight: 1.75 }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-14" style={{ background: "#09090b", borderTop: "1px solid rgba(203,163,61,0.08)" }}>
          <div className="page-container text-center">
            <Star size={28} style={{ color: "#cba33d", margin: "0 auto 12px" }} />
            <h2
              className="font-display font-bold mb-3"
              style={{ fontSize: "clamp(1.2rem, 3vw, 1.7rem)", color: "#f4f4f5" }}
            >
              Ready to bet smarter?
            </h2>
            <p className="mb-6 text-sm" style={{ color: "#52525b" }}>
              Browse this week&apos;s expert picks and unlock your first slip today.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #cba33d, #e8c05a)",
                color: "#09090b",
                fontFamily: "'Sora', sans-serif",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                boxShadow: "0 4px 24px rgba(203,163,61,0.35)",
              }}
            >
              View This Week&apos;s Tips
            </a>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

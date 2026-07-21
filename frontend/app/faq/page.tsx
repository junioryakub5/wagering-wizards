"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "What is Wagering Wizards?",
    a: "Wagering Wizards is a premium football prediction platform. We provide expert betting tips with verified odds for every major league and competition — backed by rigorous statistical research and a transparent win/loss record.",
  },
  {
    q: "How do I unlock a prediction slip?",
    a: "Browse the available slips on the homepage. Click on a slip to view the teaser info (match, league, odds category), then tap 'Unlock Slip' and complete a secure payment via Paystack. Your full booking code and detailed analysis are revealed instantly after payment.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We currently accept all major Ghanaian payment methods through Paystack — including mobile money (MTN, Vodafone, AirtelTigo) and debit/credit cards. All transactions are secured and encrypted.",
  },
  {
    q: "Are the predictions guaranteed to win?",
    a: "No prediction service can guarantee a 100% win rate — and anyone who claims otherwise is not being honest with you. What we guarantee is rigorous expert analysis, transparent results, and our 87% verified historical win rate. Betting always carries risk; please bet responsibly.",
  },
  {
    q: "How often are new slips posted?",
    a: "New prediction slips are published regularly throughout the week, aligned with the major European and African football schedules. We focus on quality over quantity — only slips with strong analytical backing make it to the platform.",
  },
  {
    q: "Can I get a refund if the prediction loses?",
    a: "Due to the nature of sports predictions, we do not offer refunds on purchased slips — the payment covers access to expert analysis, not a guaranteed outcome. Please review the preview information carefully before purchasing.",
  },
  {
    q: "How do I know your win rate is real?",
    a: "Every completed slip on the platform shows its result (win/loss) publicly in the History section. We never delete or hide losing slips. Our win rate is calculated from all published predictions.",
  },
  {
    q: "What leagues do you cover?",
    a: "We cover all major leagues including the English Premier League, La Liga, Bundesliga, Serie A, Ligue 1, UEFA Champions League, Europa League, and selected African competitions. Coverage may vary by fixture schedule.",
  },
];

function FAQItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: open ? "rgba(203,163,61,0.05)" : "rgba(17,17,23,0.85)",
        border: open ? "1px solid rgba(203,163,61,0.22)" : "1px solid rgba(255,255,255,0.05)",
        boxShadow: open ? "0 4px 28px rgba(203,163,61,0.08)" : "none",
      }}
    >
      <button
        className="w-full flex items-center justify-between px-6 py-5 text-left gap-4 transition-all"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span
          className="font-semibold text-sm md:text-base"
          style={{ color: open ? "#cba33d" : "#f4f4f5", fontFamily: "'Sora', sans-serif", lineHeight: 1.5 }}
        >
          {q}
        </span>
        <ChevronDown
          size={18}
          style={{
            color: "#cba33d",
            flexShrink: 0,
            transition: "transform 0.3s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <div
        style={{
          maxHeight: open ? "300px" : "0",
          overflow: "hidden",
          transition: "max-height 0.4s ease",
        }}
      >
        <p
          className="px-6 pb-5 text-sm leading-relaxed"
          style={{ color: "#52525b", lineHeight: 1.8 }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <Navbar />

      <main className="min-h-screen" style={{ background: "#09090b" }}>

        {/* ── Hero ── */}
        <section className="pt-28 pb-14 relative overflow-hidden" style={{ background: "#09090b" }}>
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="hero-glow-1" />
            <div className="hero-glow-3" />
            <div className="hero-grid" />
          </div>

          <div className="page-container relative z-10 text-center flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 animate-fadeInUp"
              style={{
                background: "linear-gradient(135deg, rgba(203,163,61,0.15), rgba(232,192,90,0.06))",
                border: "1px solid rgba(203,163,61,0.25)",
                boxShadow: "0 0 36px rgba(203,163,61,0.1)",
              }}
            >
              <HelpCircle size={30} style={{ color: "#cba33d" }} strokeWidth={1.5} />
            </div>

            <h1 className="section-title mb-4 animate-fadeInUp">
              Frequently Asked{" "}
              <span
                className="bg-clip-text text-transparent animate-shimmer"
                style={{
                  backgroundImage: "linear-gradient(90deg, #cba33d, #e8c05a, #cba33d, #e8c05a)",
                  backgroundSize: "300% 100%",
                }}
              >
                Questions
              </span>
            </h1>

            <p
              className="animate-fadeInUp"
              style={{
                color: "#52525b",
                fontSize: "clamp(0.9rem, 2vw, 1rem)",
                maxWidth: 480,
                lineHeight: 1.75,
              }}
            >
              Everything you need to know about using Wagering Wizards.
            </p>
          </div>
        </section>

        {/* ── FAQ Accordion ── */}
        <section className="pb-24 pt-4" style={{ background: "#09090b" }}>
          <div className="page-container" style={{ maxWidth: 760 }}>
            <div className="flex flex-col gap-3">
              {FAQ_ITEMS.map((item, i) => (
                <FAQItem
                  key={i}
                  q={item.q}
                  a={item.a}
                  open={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                />
              ))}
            </div>

            {/* Still have questions */}
            <div
              className="mt-10 rounded-2xl p-8 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(203,163,61,0.08), rgba(203,163,61,0.04))",
                border: "1px solid rgba(203,163,61,0.14)",
              }}
            >
              <p className="font-bold mb-2" style={{ color: "#f4f4f5", fontFamily: "'Sora', sans-serif" }}>
                Still have questions?
              </p>
              <p className="text-sm mb-5" style={{ color: "#52525b" }}>
                Reach out to us and we&apos;ll get back to you as soon as possible.
              </p>
              <a
                href="mailto:support@wageringwizards.com"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{
                  background: "rgba(203,163,61,0.1)",
                  border: "1px solid rgba(203,163,61,0.3)",
                  color: "#cba33d",
                  fontFamily: "'Sora', sans-serif",
                  letterSpacing: "0.04em",
                }}
              >
                Contact Support
              </a>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

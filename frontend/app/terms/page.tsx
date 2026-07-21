import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ScrollText } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions – Wagering Wizards",
  description: "Read the terms and conditions governing your use of Wagering Wizards – Ghana's premium football prediction platform.",
};

const lastUpdated = "July 2025";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using Wagering Wizards ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Platform. We reserve the right to update these terms at any time, and continued use of the Platform constitutes acceptance of the updated terms.`,
  },
  {
    title: "2. Nature of the Service",
    content: `Wagering Wizards provides premium football prediction tips for entertainment and informational purposes only. Our predictions are based on statistical analysis and expert research, but they do not constitute financial, investment, or legal advice. Betting and gambling involve significant financial risk, and past win rates are not a guarantee of future results.`,
  },
  {
    title: "3. Age Restriction",
    content: `You must be at least 18 years old (or the legal gambling age in your jurisdiction, whichever is higher) to use this Platform. By using Wagering Wizards, you confirm that you meet this age requirement. We reserve the right to suspend accounts that we have reason to believe are operated by minors.`,
  },
  {
    title: "4. Payments & Refunds",
    content: `All payments for prediction slips are processed securely via Paystack. Prices are listed in Ghana Cedis (GHS). Payments are non-refundable once a slip has been unlocked and the booking code revealed, as the service (expert analysis and prediction) is delivered immediately upon payment. In the event of a technical error where a slip is not delivered after payment, please contact our support team within 24 hours for resolution.`,
  },
  {
    title: "5. Responsible Betting",
    content: `Wagering Wizards strongly encourages responsible betting. Never bet more than you can afford to lose. If you believe you may have a gambling problem, please contact the appropriate support organisation in your country. We do not accept liability for any financial losses incurred as a result of acting on our predictions.`,
  },
  {
    title: "6. Intellectual Property",
    content: `All content on the Platform — including predictions, analyses, layouts, graphics, and branding — is the intellectual property of Wagering Wizards. You may not reproduce, distribute, or use our content for commercial purposes without prior written permission. Unlocked slips are for your personal use only and must not be resold or redistributed.`,
  },
  {
    title: "7. Limitation of Liability",
    content: `To the fullest extent permitted by law, Wagering Wizards shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the Platform or your reliance on any prediction. The Platform is provided on an "as is" basis without warranties of any kind.`,
  },
  {
    title: "8. Privacy",
    content: `We collect minimal personal data (email address, payment reference) solely for the purpose of delivering our service and processing payments. We do not sell your personal data to third parties. Payment data is handled exclusively by Paystack and is subject to their privacy policy. By using the Platform, you consent to these data practices.`,
  },
  {
    title: "9. Governing Law",
    content: `These Terms and Conditions are governed by and construed in accordance with the laws of the Republic of Ghana. Any disputes arising from the use of this Platform shall be subject to the exclusive jurisdiction of the courts of Ghana.`,
  },
  {
    title: "10. Contact",
    content: `If you have any questions about these Terms and Conditions, please contact us at support@wageringwizards.com. We aim to respond to all queries within 48 business hours.`,
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen" style={{ background: "#09090b" }}>

        {/* ── Hero ── */}
        <section className="pt-28 pb-14 relative overflow-hidden" style={{ background: "#09090b" }}>
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="hero-glow-2" />
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
              <ScrollText size={30} style={{ color: "#cba33d" }} strokeWidth={1.5} />
            </div>

            <h1 className="section-title mb-4 animate-fadeInUp">
              Terms &amp;{" "}
              <span
                className="bg-clip-text text-transparent animate-shimmer"
                style={{
                  backgroundImage: "linear-gradient(90deg, #cba33d, #e8c05a, #cba33d, #e8c05a)",
                  backgroundSize: "300% 100%",
                }}
              >
                Conditions
              </span>
            </h1>

            <p
              className="animate-fadeInUp"
              style={{
                color: "#52525b",
                fontSize: "0.9rem",
                maxWidth: 480,
                lineHeight: 1.75,
              }}
            >
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        {/* ── Terms Content ── */}
        <section className="pb-24 pt-4" style={{ background: "#09090b" }}>
          <div className="page-container" style={{ maxWidth: 760 }}>

            {/* Disclaimer banner */}
            <div
              className="rounded-2xl px-6 py-5 mb-8 flex items-start gap-4"
              style={{
                background: "rgba(203,163,61,0.07)",
                border: "1px solid rgba(203,163,61,0.2)",
              }}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm" style={{ color: "#a1a1aa", lineHeight: 1.75 }}>
                Please read these Terms and Conditions carefully before using Wagering Wizards. Predictions are for informational purposes only. Always bet responsibly and within your means.{" "}
                <span style={{ color: "#cba33d", fontWeight: 700 }}>18+ only.</span>
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {sections.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl p-6"
                  style={{
                    background: "rgba(17,17,23,0.85)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <h2
                    className="font-bold mb-3"
                    style={{
                      color: "#f4f4f5",
                      fontSize: "0.95rem",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    <span style={{ color: "#cba33d" }}>{s.title.split(".")[0]}.</span>
                    {s.title.substring(s.title.indexOf(" "))}
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#52525b", lineHeight: 1.85 }}
                  >
                    {s.content}
                  </p>
                </div>
              ))}
            </div>

            <p
              className="text-center text-xs mt-10"
              style={{ color: "#3f3f46" }}
            >
              © {new Date().getFullYear()} Wagering Wizards. All rights reserved. · Bet responsibly. 18+ only.
            </p>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

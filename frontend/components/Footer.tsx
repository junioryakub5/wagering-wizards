import { Wand2 } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="relative py-12 text-center overflow-hidden"
      style={{
        background: "#09090b",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Ambient glow top */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-40"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(203,163,61,0.06), transparent)",
        }}
        aria-hidden="true"
      />
      {/* Gold glow line */}
      <div className="glow-line absolute top-0 left-0 right-0" aria-hidden="true" />

      <div className="page-container relative z-10">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              background: "rgba(203,163,61,0.1)",
              border: "1px solid rgba(203,163,61,0.25)",
              boxShadow: "0 0 10px rgba(203,163,61,0.12)",
            }}
          >
            <Wand2 size={15} style={{ color: "#cba33d" }} strokeWidth={1.5} />
          </div>
          <span
            className="font-display font-bold tracking-tight leading-none"
            style={{ fontSize: "1.1rem", letterSpacing: "-0.02em", color: "#f4f4f5" }}
          >
            Wagering<span style={{ color: "#cba33d" }}> Wizards</span>
          </span>
        </div>

        <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>
          Premium football predictions for smart bettors
        </p>

        {/* Nav links */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
          {[
            { href: "/", label: "Home" },
            { href: "/history", label: "History" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-medium transition-colors duration-200"
              style={{ color: "#52525b" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#cba33d")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#52525b")}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div
          className="mx-auto mb-5"
          style={{ width: "60px", height: "1px", background: "rgba(255,255,255,0.06)" }}
          aria-hidden="true"
        />

        <p className="text-xs mb-1.5" style={{ color: "#52525b" }}>
          © {new Date().getFullYear()} Wagering Wizards. All rights reserved.
        </p>
        <p className="text-xs" style={{ color: "#52525b" }}>
          Bet responsibly.{" "}
          <span style={{ color: "#a1a1aa" }}>18+ only.</span>
        </p>
      </div>
    </footer>
  );
}

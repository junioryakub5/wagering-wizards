import { Wand2 } from "lucide-react";
import Link from "next/link";

const footerLinks = [
  { href: "/",        label: "Home"    },
  { href: "/about",   label: "About"   },
  { href: "/history", label: "History" },
  { href: "/faq",     label: "FAQ"     },
  { href: "/terms",   label: "Terms"   },
];

export default function Footer() {
  return (
    <footer
      className="relative py-14 text-center overflow-hidden"
      style={{
        background: "#09090b",
        borderTop: "1px solid rgba(203,163,61,0.1)",
      }}
    >
      {/* Gold glow line at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(203,163,61,0.5), rgba(232,192,90,0.5), transparent)",
        }}
        aria-hidden="true"
      />
      {/* Subtle radial glow behind brand */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(203,163,61,0.3) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
        aria-hidden="true"
      />

      <div className="page-container relative z-10">

        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              background: "rgba(203,163,61,0.1)",
              border: "1.5px solid rgba(203,163,61,0.3)",
              boxShadow: "0 0 20px rgba(203,163,61,0.2)",
            }}
          >
            <Wand2 size={20} style={{ color: "#cba33d" }} strokeWidth={1.5} />
          </div>
          <div className="flex flex-col text-left">
            <span
              className="font-display font-bold"
              style={{ fontSize: "1.15rem", letterSpacing: "-0.02em", color: "#f4f4f5" }}
            >
              Wagering<span style={{ color: "#cba33d" }}> Wizards</span>
            </span>
            <span
              className="text-[9px] tracking-widest uppercase"
              style={{ color: "#cba33d", opacity: 0.65, fontFamily: "'Sora', sans-serif" }}
            >
              Bet With Confidence
            </span>
          </div>
        </div>

        <p className="text-sm mb-8" style={{ color: "#a1a1aa" }}>
          Premium football predictions for smart bettors
        </p>

        {/* Nav links with dot separators */}
        <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
          {footerLinks.map((link, i, arr) => (
            <span key={link.href} className="flex items-center gap-4">
              <Link
                href={link.href}
                className="text-xs font-medium transition-colors duration-200 hover:text-[#cba33d]"
                style={{
                  color: "#52525b",
                  fontFamily: "'Sora', sans-serif",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {link.label}
              </Link>
              {i < arr.length - 1 && (
                <span style={{ color: "#3f3f46" }}>·</span>
              )}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div
          className="mx-auto mb-6"
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

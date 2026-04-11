"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Wand2 } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/portal", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(13,13,14,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(203,163,61,0.18), rgba(232,192,90,0.08))",
                border: "1px solid rgba(203,163,61,0.3)",
              }}
            >
              <Wand2 size={16} style={{ color: "#cba33d" }} strokeWidth={2} />
            </div>
            <span
              className="font-display font-black uppercase leading-none tracking-tight"
              style={{ fontSize: "1.25rem", letterSpacing: "-0.01em" }}
            >
              <span className="text-white">Wagering</span>{" "}
              <span className="gradient-text-gold">Wizards</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${pathname === link.href ? "active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-gold transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden border-t border-gold/8 transition-all duration-300 overflow-hidden ${
          mobileOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{ background: "rgba(12,10,29,0.95)" }}
      >
        <div className="page-container py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link text-base ${pathname === link.href ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

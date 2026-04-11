import { Star } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="border-t border-gold/6 py-10 text-center relative z-10"
      style={{ background: "#0a0818" }}
    >
      <div className="page-container">
        <div className="font-brand text-xl font-bold mb-2">
          <span className="text-white">Wagering</span>{" "}
          <span className="gradient-text-gold">Wizards</span>
        </div>
        <p className="text-gray-500 text-sm mb-4 flex items-center justify-center gap-1.5">
          Premium football predictions for smart bettors
          <Star size={12} style={{ color: "#cba33d" }} />
        </p>
        <p className="text-gray-600 text-xs">
          © {new Date().getFullYear()} Wagering Wizards. All rights reserved.
        </p>
        <p className="text-gray-700 text-xs mt-2">
          Bet responsibly. 18+ only.
        </p>
      </div>
    </footer>
  );
}

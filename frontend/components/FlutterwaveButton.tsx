"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Prediction } from "@/lib/types";

const FLW_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY ||
  "FLWPUBK-2733229abd28fd35643c221ef77b8940-X";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function loadFlutterwave(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).FlutterwaveCheckout) return resolve();
    const SCRIPT_URL = "https://checkout.flutterwave.com/v3.js";
    // Script already injected — poll until global is ready
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).FlutterwaveCheckout) { clearInterval(poll); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(poll); resolve(); }, 15000); // resolve anyway after 15s
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onerror = () => reject(new Error("Could not load Flutterwave script. Check your internet connection."));
    s.onload = () => {
      // FLW v3.js initialises asynchronously — resolve immediately and let
      // FlutterwaveCheckout() itself handle any remaining setup.
      resolve();
    };
    document.head.appendChild(s);
  });
}

interface Props {
  prediction: Prediction;
  email: string;
  onSuccess: (reference: string, transactionId: number, amount: number, currency: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export default function FlutterwaveButton({ prediction, email, onSuccess, onCancel, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Get reference + NGN amount from backend
      const res = await fetch(`${API_URL}/payment/flw/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, predictionId: prediction._id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to initiate payment");

      const { reference, amount } = data; // amount is in NGN

      await loadFlutterwave();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).FlutterwaveCheckout({
        public_key: FLW_PUBLIC_KEY,
        tx_ref: reference,
        amount,
        currency: "NGN",
        payment_options: "card,banktransfer,ussd",
        customer: {
          email,
          name: email.split("@")[0],
        },
        customizations: {
          title: "Wagering Wizards",
          description: prediction.match,
          logo: "",
        },
        meta: { predictionId: prediction._id },
        callback: (response: { status: string; tx_ref: string; transaction_id: number; amount: number; currency: string }) => {
          setLoading(false);
          if (response.status === "successful") {
            onSuccess(response.tx_ref, response.transaction_id, response.amount, response.currency);
          } else {
            setError("Payment was not successful. Please try again.");
          }
        },
        onclose: () => {
          setLoading(false);
          onCancel();
        },
      });
    } catch (err) {
      setError((err as Error)?.message || "Failed to open payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading || disabled}
        className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
        style={{
          background: loading ? "rgba(0,176,116,0.4)" : "linear-gradient(135deg, #00b074, #00d68f)",
          color: "#fff",
          boxShadow: loading ? "none" : "0 4px 20px rgba(0,176,116,0.35)",
          fontFamily: "'Sora', sans-serif",
          letterSpacing: "0.02em",
        }}
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" />Opening Flutterwave…</>
        ) : (
          <>🇳🇬 Pay with Flutterwave (NGN)</>
        )}
      </button>
      <p className="text-center text-[11px]" style={{ color: "#3f3f46" }}>
        Nigerian Naira · Card, Bank Transfer, USSD
      </p>
    </div>
  );
}

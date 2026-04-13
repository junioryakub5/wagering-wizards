import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wagering Wizards — Premium Football Predictions",
  description:
    "Expert football predictions with guaranteed odds. Unlock premium betting slips with 2+, 5+, 10+ odds. Wagering Wizards — bet smarter.",
  keywords:
    "football predictions, betting tips, soccer predictions, betting odds, premium tips, sports betting",
  openGraph: {
    title: "Wagering Wizards — Premium Football Predictions",
    description: "Expert football predictions with guaranteed odds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700&family=Anton&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0d0d0e" />
      </head>
      <body>{children}</body>
    </html>
  );
}

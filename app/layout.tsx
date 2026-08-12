import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://stellar-mini-wallet-vn.model-potions-0vna2x.chatgpt.site",
  ),
  title: {
    default: "Stellar Mini Wallet",
    template: "%s · Stellar Mini Wallet",
  },
  description:
    "Mini Wallet DApp dùng Rust, Soroban và Freighter trên Stellar Testnet.",
  openGraph: {
    title: "Stellar Mini Wallet",
    description:
      "Một mini DApp gọn, minh bạch để học và thử smart contract Soroban.",
    type: "website",
    locale: "vi_VN",
    images: [
      {
        url: "/og.png",
        width: 1733,
        height: 908,
        alt: "Stellar Mini Wallet — ledger tối giản trên Soroban",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stellar Mini Wallet",
    description: "Mini DApp Rust và Soroban trên Stellar Testnet.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

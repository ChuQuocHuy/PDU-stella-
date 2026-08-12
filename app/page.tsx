import type { Metadata } from "next";
import { WalletApp } from "./wallet-app";

export const metadata: Metadata = {
  title: { absolute: "Stellar Mini Wallet" },
  description:
    "Ví ledger tối giản trên Soroban: nạp, rút và chuyển số dư nội bộ với Freighter trên Stellar Testnet.",
};

export default function Home() {
  return <WalletApp />;
}

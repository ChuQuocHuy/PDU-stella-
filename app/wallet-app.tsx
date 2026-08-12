"use client";

import {
  getAddress,
  getNetworkDetails,
  isConnected,
  setAllowed,
  signTransaction,
} from "@stellar/freighter-api";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clipboard,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  Info,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { Client, StrKey } from "mini-wallet-client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL?.trim() ||
  "https://soroban-testnet.stellar.org";
const CONTRACT_ID =
  process.env.NEXT_PUBLIC_MINI_WALLET_CONTRACT_ID?.trim() ||
  "CDVPU65FF3G7ZRSURELKUITCBQ2ZTES3NH5CO4W5V6N5U2NBURXJ6CXC";
const DEMO_BALANCE_KEY = "stellar-mini-wallet:demo-balance";
const DEMO_ACTIVITY_KEY = "stellar-mini-wallet:demo-activity";
const INITIAL_DEMO_BALANCE = 1_250n;

type Mode = "demo" | "testnet";
type Action = "deposit" | "withdraw" | "transfer";
type ActivityStatus = "success" | "failed";

type Activity = {
  id: string;
  action: Action;
  amount: string;
  status: ActivityStatus;
  timestamp: number;
  counterpart?: string;
  hash?: string;
};

const actionCopy: Record<
  Action,
  { label: string; shortLabel: string; helper: string }
> = {
  deposit: {
    label: "Nạp vào ví nội bộ",
    shortLabel: "Nạp",
    helper: "Ghi tăng số dư ledger của chính địa chỉ đang kết nối.",
  },
  withdraw: {
    label: "Rút khỏi ví nội bộ",
    shortLabel: "Rút",
    helper: "Ghi giảm số dư ledger; không chuyển XLM ra ngoài.",
  },
  transfer: {
    label: "Chuyển số dư nội bộ",
    shortLabel: "Chuyển",
    helper: "Chuyển đơn vị ledger sang một địa chỉ Stellar khác.",
  },
};

function shorten(value: string, head = 7, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function formatUnits(value: bigint) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(timestamp);
}

function toMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Đã có lỗi không xác định. Vui lòng thử lại.";
}

function mapContractError(message: string) {
  if (message.includes("InvalidAmount")) return "Số lượng phải lớn hơn 0.";
  if (message.includes("InsufficientBalance")) return "Số dư không đủ.";
  if (message.includes("SameAddress"))
    return "Không thể chuyển cho chính địa chỉ đang gửi.";
  if (message.includes("Overflow")) return "Số lượng vượt giới hạn contract.";
  if (message.toLowerCase().includes("user declined"))
    return "Bạn đã từ chối ký giao dịch trong Freighter.";
  return message;
}

function makeActivity(
  action: Action,
  amount: bigint,
  status: ActivityStatus,
  extra: Pick<Activity, "counterpart" | "hash"> = {},
): Activity {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    amount: amount.toString(),
    status,
    timestamp: Date.now(),
    ...extra,
  };
}

export function WalletApp() {
  const [mode, setMode] = useState<Mode>("demo");
  const [action, setAction] = useState<Action>("deposit");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [balance, setBalance] = useState(INITIAL_DEMO_BALANCE);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [address, setAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("");
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  const configured = Boolean(CONTRACT_ID);
  const isTestnetWallet = walletNetwork
    ? walletNetwork.toUpperCase().includes("TESTNET")
    : false;
  const currentIdentity = mode === "demo" ? "demo:alice" : address;

  useEffect(() => {
    let hydrateTimer: number | undefined;
    try {
      const savedBalance = window.localStorage.getItem(DEMO_BALANCE_KEY);
      const savedActivity = window.localStorage.getItem(DEMO_ACTIVITY_KEY);
      hydrateTimer = window.setTimeout(() => {
        if (savedBalance && /^\d+$/.test(savedBalance)) {
          setBalance(BigInt(savedBalance));
        }
        if (savedActivity) {
          const parsed = JSON.parse(savedActivity) as Activity[];
          if (Array.isArray(parsed)) setActivities(parsed.slice(0, 20));
        }
      }, 0);
    } catch {
      window.localStorage.removeItem(DEMO_BALANCE_KEY);
      window.localStorage.removeItem(DEMO_ACTIVITY_KEY);
    }

    let active = true;
    void isConnected()
      .then((result) => {
        if (active) setFreighterInstalled(Boolean(result.isConnected));
      })
      .catch(() => {
        if (active) setFreighterInstalled(false);
      });
    return () => {
      active = false;
      if (hydrateTimer !== undefined) window.clearTimeout(hydrateTimer);
    };
  }, []);

  useEffect(() => {
    if (mode !== "demo") return;
    window.localStorage.setItem(DEMO_BALANCE_KEY, balance.toString());
    window.localStorage.setItem(
      DEMO_ACTIVITY_KEY,
      JSON.stringify(activities.slice(0, 20)),
    );
  }, [activities, balance, mode]);

  const contractClient = useMemo(() => {
    if (!configured) return null;
    return new Client({
      contractId: CONTRACT_ID,
      networkPassphrase: TESTNET_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: address || undefined,
      signTransaction,
    });
  }, [address, configured]);

  const refreshBalance = useCallback(async () => {
    if (!contractClient || !address) return;
    setRefreshing(true);
    try {
      const transaction = await contractClient.get_balance({ user: address });
      setBalance(transaction.result);
    } catch (error) {
      setNotice({ type: "error", text: mapContractError(toMessage(error)) });
    } finally {
      setRefreshing(false);
    }
  }, [address, contractClient]);

  useEffect(() => {
    if (mode === "testnet" && address && configured) {
      const refreshTimer = window.setTimeout(() => {
        void refreshBalance();
      }, 0);
      return () => window.clearTimeout(refreshTimer);
    }
  }, [address, configured, mode, refreshBalance]);

  async function connectWallet() {
    setBusy(true);
    setNotice(null);
    try {
      const connection = await isConnected();
      if (connection.error || !connection.isConnected) {
        setFreighterInstalled(false);
        throw new Error(
          "Chưa tìm thấy Freighter. Hãy cài tiện ích rồi tải lại trang.",
        );
      }
      setFreighterInstalled(true);

      const permission = await setAllowed();
      if (permission.error || !permission.isAllowed) {
        throw new Error("Freighter chưa cấp quyền truy cập cho trang này.");
      }

      const account = await getAddress();
      if (account.error || !account.address) {
        throw new Error("Không đọc được địa chỉ đang chọn trong Freighter.");
      }

      const network = await getNetworkDetails();
      if (network.error) throw new Error(network.error.message);

      setAddress(account.address);
      setWalletNetwork(network.network);
      setMode("testnet");
      setNotice({
        type: "success",
        text: network.network.toUpperCase().includes("TESTNET")
          ? "Đã kết nối Freighter trên Testnet."
          : "Đã kết nối ví, nhưng hãy đổi mạng Freighter sang Testnet.",
      });
    } catch (error) {
      setNotice({ type: "error", text: mapContractError(toMessage(error)) });
    } finally {
      setBusy(false);
    }
  }

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    setNotice(
      nextMode === "demo"
        ? {
            type: "info",
            text: "Demo chạy trên thiết bị này, không tạo giao dịch blockchain.",
          }
        : !configured
          ? {
              type: "info",
              text: "Cần deploy contract và cấu hình Contract ID trước khi gửi giao dịch Testnet.",
            }
          : null,
    );
    if (nextMode === "demo") {
      const stored = window.localStorage.getItem(DEMO_BALANCE_KEY);
      setBalance(stored && /^\d+$/.test(stored) ? BigInt(stored) : INITIAL_DEMO_BALANCE);
    } else if (!address) {
      setBalance(0n);
    }
  }

  function parseAmount() {
    const normalized = amount.trim();
    if (!/^\d+$/.test(normalized)) {
      throw new Error("Nhập một số nguyên dương, không dùng phần thập phân.");
    }
    const parsed = BigInt(normalized);
    if (parsed <= 0n) throw new Error("Số lượng phải lớn hơn 0.");
    return parsed;
  }

  function validateRecipient(value: string) {
    if (!value) throw new Error("Nhập địa chỉ người nhận.");
    if (mode === "demo") {
      if (value.toLowerCase() === "demo:alice") {
        throw new Error("Không thể chuyển cho chính địa chỉ đang gửi.");
      }
      return;
    }
    if (
      !StrKey.isValidEd25519PublicKey(value) &&
      !StrKey.isValidContract(value)
    ) {
      throw new Error("Địa chỉ nhận không đúng định dạng Stellar (G… hoặc C…).");
    }
    if (value === address) {
      throw new Error("Không thể chuyển cho chính địa chỉ đang gửi.");
    }
  }

  function addActivity(item: Activity) {
    setActivities((current) => [item, ...current].slice(0, 20));
  }

  async function runDemo(selectedAmount: bigint) {
    if (action === "transfer") validateRecipient(recipient.trim());
    if (action !== "deposit" && selectedAmount > balance) {
      throw new Error("Số dư không đủ.");
    }

    const nextBalance =
      action === "deposit"
        ? balance + selectedAmount
        : balance - selectedAmount;
    setBalance(nextBalance);
    addActivity(
      makeActivity(action, selectedAmount, "success", {
        counterpart:
          action === "transfer" ? recipient.trim() : "demo:alice",
      }),
    );
    return nextBalance;
  }

  async function runTestnet(selectedAmount: bigint) {
    if (!configured || !contractClient) {
      throw new Error(
        "Contract Testnet chưa được cấu hình. Hãy dùng Demo hoặc thêm Contract ID.",
      );
    }
    if (!address) throw new Error("Kết nối Freighter trước khi giao dịch.");
    if (!isTestnetWallet) {
      throw new Error("Hãy chuyển Freighter sang mạng Testnet trước.");
    }
    if (action === "transfer") validateRecipient(recipient.trim());

    const assembled =
      action === "deposit"
        ? await contractClient.deposit({ user: address, amount: selectedAmount })
        : action === "withdraw"
          ? await contractClient.withdraw({
              user: address,
              amount: selectedAmount,
            })
          : await contractClient.transfer({
              from: address,
              to: recipient.trim(),
              amount: selectedAmount,
            });

    if (assembled.result.isErr()) {
      throw new Error(assembled.result.unwrapErr().message);
    }

    const sent = await assembled.signAndSend();
    if (sent.result.isErr()) {
      throw new Error(sent.result.unwrapErr().message);
    }

    const hash = sent.sendTransactionResponse?.hash;
    const nextBalance = sent.result.unwrap();
    setBalance(nextBalance);
    addActivity(
      makeActivity(action, selectedAmount, "success", {
        counterpart: action === "transfer" ? recipient.trim() : address,
        hash,
      }),
    );
    return nextBalance;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    let selectedAmount: bigint | null = null;
    try {
      selectedAmount = parseAmount();
      const nextBalance =
        mode === "demo"
          ? await runDemo(selectedAmount)
          : await runTestnet(selectedAmount);
      setAmount("");
      if (action === "transfer") setRecipient("");
      setNotice({
        type: "success",
        text: `${actionCopy[action].shortLabel} thành công. Số dư mới: ${formatUnits(nextBalance)} đơn vị.`,
      });
    } catch (error) {
      const message = mapContractError(toMessage(error));
      if (selectedAmount) {
        addActivity(
          makeActivity(action, selectedAmount, "failed", {
            counterpart:
              action === "transfer" ? recipient.trim() : currentIdentity,
          }),
        );
      }
      setNotice({ type: "error", text: message });
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    if (!currentIdentity) return;
    await navigator.clipboard.writeText(currentIdentity);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  function resetDemo() {
    setBalance(INITIAL_DEMO_BALANCE);
    setActivities([]);
    setAmount("");
    setRecipient("");
    window.localStorage.removeItem(DEMO_BALANCE_KEY);
    window.localStorage.removeItem(DEMO_ACTIVITY_KEY);
    setNotice({ type: "success", text: "Đã đặt lại dữ liệu Demo." });
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Stellar Mini Wallet">
          <span className="brand-mark">
            <Sparkles size={20} strokeWidth={2.25} />
          </span>
          <span>
            <strong>Stellar</strong>
            <span>Mini Wallet</span>
          </span>
        </a>

        <nav className="header-nav" aria-label="Điều hướng chính">
          <a href="#wallet-workspace">Ví của bạn</a>
          <a
            href={`https://lab.stellar.org/r/testnet/contract/${CONTRACT_ID}`}
            target="_blank"
            rel="noreferrer"
          >
            Contract
          </a>
          <a
            href="https://github.com/ChuQuocHuy/PDU-stella-"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>

        <div className="header-actions">
          <span className="network-pill">
            <span className="status-dot" /> Testnet live
          </span>
          <button
            className="wallet-button"
            type="button"
            onClick={connectWallet}
            disabled={busy}
          >
            <WalletCards size={17} />
            {address ? shorten(address, 5, 4) : "Kết nối Freighter"}
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <ShieldCheck size={15} /> Non-custodial · Powered by Soroban
          </div>
          <h1>
            Ví Stellar rõ từng giao dịch.
            <span> Gọn trong một màn hình.</span>
          </h1>
          <p>
            Theo dõi và điều khiển ledger số dư nội bộ trên Stellar Testnet.
            Mọi thao tác ghi đều được mô phỏng trước và chỉ thực thi khi chính
            bạn ký bằng Freighter.
          </p>
          <div className="hero-actions">
            <a className="hero-primary" href="#wallet-workspace">
              Mở workspace <ChevronRight size={17} />
            </a>
            <a
              className="hero-secondary"
              href={`https://lab.stellar.org/r/testnet/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
            >
              Xem trên Stellar Lab <ExternalLink size={15} />
            </a>
          </div>
          <div className="proof-row" aria-label="Thông tin dự án">
            <div>
              <strong>5</strong>
              <span>Contract methods</span>
            </div>
            <div>
              <strong>10/10</strong>
              <span>Rust tests đạt</span>
            </div>
            <div>
              <strong>0</strong>
              <span>Secret key được lưu</span>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-dot dot-one" />
          <div className="orbit-dot dot-two" />
          <div className="preview-card">
            <div className="preview-top">
              <span className="preview-mark">
                <Sparkles size={18} />
              </span>
              <span className="preview-live">
                <span /> CONTRACT LIVE
              </span>
            </div>
            <span className="preview-label">INTERNAL LEDGER</span>
            <strong className="preview-balance">
              12,500 <small>units</small>
            </strong>
            <div className="preview-flow">
              <span className="flow-source">GCRK…22CK</span>
              <span className="flow-line" />
              <span className="flow-node">S</span>
              <span className="flow-line active" />
              <span className="flow-source">GCQ3…9R2A</span>
            </div>
            <div className="preview-bottom">
              <span>
                <CheckCircle2 size={14} /> require_auth()
              </span>
              <strong>+1,000</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="mode-bar" aria-label="Chọn môi trường">
        <div className="mode-switch">
          <button
            type="button"
            className={mode === "demo" ? "active" : ""}
            onClick={() => selectMode("demo")}
          >
            <Sparkles size={15} /> Demo cục bộ
          </button>
          <button
            type="button"
            className={mode === "testnet" ? "active" : ""}
            onClick={() => selectMode("testnet")}
          >
            <Code2 size={15} /> Stellar Testnet
          </button>
        </div>
        <div className="mode-note">
          {mode === "demo" ? (
            <>
              <Info size={15} /> Không dùng blockchain hoặc tài sản thật
            </>
          ) : configured ? (
            <>
              <CheckCircle2 size={15} /> Contract đã được cấu hình
            </>
          ) : (
            <>
              <CircleAlert size={15} /> Chưa có Contract ID
            </>
          )}
        </div>
      </section>

      {notice && (
        <div className={`notice ${notice.type}`} role="status" aria-live="polite">
          {notice.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : notice.type === "error" ? (
            <CircleAlert size={18} />
          ) : (
            <Info size={18} />
          )}
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="wallet-grid" id="wallet-workspace">
        <article className="balance-card">
          <div className="balance-glow" />
          <div className="balance-topline">
            <span>{mode === "demo" ? "DEMO BALANCE" : "CONTRACT BALANCE"}</span>
            <button
              type="button"
              onClick={() => setShowBalance((value) => !value)}
              aria-label={showBalance ? "Ẩn số dư" : "Hiện số dư"}
            >
              {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          <div className="balance-value" aria-label={`${balance} đơn vị`}>
            {showBalance ? formatUnits(balance) : "••••••"}
            <span>đơn vị</span>
          </div>

          <div className="identity-row">
            <div>
              <span>Địa chỉ đang dùng</span>
              <strong>
                {currentIdentity
                  ? shorten(currentIdentity, 10, 8)
                  : "Chưa kết nối ví"}
              </strong>
            </div>
            {currentIdentity && (
              <button type="button" onClick={copyAddress} aria-label="Sao chép địa chỉ">
                {copied ? <Check size={17} /> : <Clipboard size={17} />}
              </button>
            )}
          </div>

          <div className="balance-footer">
            <span>
              <LockKeyhole size={15} /> require_auth()
            </span>
            <a
              href={`https://lab.stellar.org/r/testnet/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
            >
              {mode === "demo" ? "Demo local" : walletNetwork || "Testnet"}
              <ExternalLink size={12} />
            </a>
          </div>
        </article>

        <article className="action-card">
          <div className="action-tabs" role="tablist" aria-label="Thao tác ví">
            {(["deposit", "withdraw", "transfer"] as const).map((item) => {
              const Icon =
                item === "deposit"
                  ? ArrowDownToLine
                  : item === "withdraw"
                    ? ArrowUpFromLine
                    : Send;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={action === item}
                  className={action === item ? "active" : ""}
                  onClick={() => {
                    setAction(item);
                    setNotice(null);
                  }}
                  key={item}
                >
                  <Icon size={17} /> {actionCopy[item].shortLabel}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit}>
            <div className="form-heading">
              <div>
                <span>THAO TÁC</span>
                <h2>{actionCopy[action].label}</h2>
              </div>
              <span className="method-chip">{action}()</span>
            </div>
            <p className="form-helper">{actionCopy[action].helper}</p>

            {action === "transfer" && (
              <label className="field">
                <span>Địa chỉ người nhận</span>
                <input
                  type="text"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value.trim())}
                  placeholder={mode === "demo" ? "demo:bob" : "G… hoặc C…"}
                  spellCheck={false}
                  autoComplete="off"
                  disabled={busy}
                />
              </label>
            )}

            <label className="field amount-field">
              <span>Số lượng</span>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="0"
                  autoComplete="off"
                  disabled={busy}
                />
                <span>đơn vị</span>
              </div>
            </label>

            <div className="quick-amounts" aria-label="Chọn nhanh số lượng">
              {[100, 500, 1000].map((value) => (
                <button
                  type="button"
                  onClick={() => setAmount(String(value))}
                  key={value}
                  disabled={busy}
                >
                  +{new Intl.NumberFormat("vi-VN").format(value)}
                </button>
              ))}
              {action !== "deposit" && (
                <button
                  type="button"
                  onClick={() => setAmount(balance.toString())}
                  disabled={busy || balance === 0n}
                >
                  Tối đa
                </button>
              )}
            </div>

            <div className="transaction-hint">
              <span>Phí mạng</span>
              <strong>
                {mode === "demo" ? "0 · Chế độ Demo" : "Tính khi mô phỏng"}
              </strong>
            </div>

            <button className="primary-action" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={18} /> Đang xử lý…
                </>
              ) : (
                <>
                  {actionCopy[action].shortLabel} {amount || "0"} đơn vị
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>
        </article>
      </section>

      <section className="lower-grid">
        <article className="activity-card">
          <div className="section-heading">
            <div>
              <History size={19} />
              <h2>Hoạt động gần đây</h2>
            </div>
            <div className="heading-actions">
              {mode === "testnet" && configured && address && (
                <button
                  type="button"
                  onClick={refreshBalance}
                  disabled={refreshing}
                  aria-label="Làm mới số dư"
                >
                  <RefreshCw className={refreshing ? "spin" : ""} size={16} />
                  Làm mới
                </button>
              )}
              {mode === "demo" && (
                <button type="button" onClick={resetDemo}>
                  <RotateCcw size={15} /> Đặt lại Demo
                </button>
              )}
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="empty-state">
              <span>
                <History size={22} />
              </span>
              <div>
                <strong>Chưa có giao dịch</strong>
                <p>Thử nạp, rút hoặc chuyển để xem lịch sử tại đây.</p>
              </div>
            </div>
          ) : (
            <div className="activity-list">
              {activities.map((item) => {
                const Icon =
                  item.action === "deposit"
                    ? ArrowDownToLine
                    : item.action === "withdraw"
                      ? ArrowUpFromLine
                      : Send;
                const positive = item.action === "deposit";
                return (
                  <div className="activity-item" key={item.id}>
                    <span className={`activity-icon ${item.action}`}>
                      <Icon size={17} />
                    </span>
                    <div className="activity-main">
                      <strong>{actionCopy[item.action].shortLabel}</strong>
                      <span>
                        {item.counterpart
                          ? shorten(item.counterpart, 7, 5)
                          : mode === "demo"
                            ? "demo:alice"
                            : "Contract"}
                        {item.hash && (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${item.hash}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Mở giao dịch trên Stellar Expert"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </span>
                    </div>
                    <div className="activity-meta">
                      <strong className={positive ? "positive" : "negative"}>
                        {positive ? "+" : "−"}
                        {formatUnits(BigInt(item.amount))}
                      </strong>
                      <span>
                        <span className={`activity-status ${item.status}`}>
                          {item.status === "success" ? "Thành công" : "Thất bại"}
                        </span>
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <aside className="trust-card">
          <div className="trust-icon">
            <ShieldCheck size={22} />
          </div>
          <span>MINH BẠCH TỪ CONTRACT</span>
          <h2>Không bao giờ hỏi secret key.</h2>
          <p>
            Freighter giữ khóa trên thiết bị của bạn. DApp chỉ gửi yêu cầu ký;
            contract tự kiểm tra đúng địa chỉ bằng <code>require_auth()</code>.
          </p>
          <ul>
            <li>
              <Check size={15} /> Mạng thử nghiệm Testnet
            </li>
            <li>
              <Check size={15} /> 4 lỗi contract có kiểu rõ ràng
            </li>
            <li>
              <Check size={15} /> Event cho mọi thao tác thành công
            </li>
          </ul>
          <a
            href="https://github.com/ChuQuocHuy/PDU-stella-"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={16} /> Xem mã nguồn dự án
          </a>
        </aside>
      </section>

      {mode === "testnet" && !configured && (
        <section className="setup-banner">
          <div>
            <Code2 size={22} />
            <div>
              <strong>Frontend đã sẵn sàng cho Testnet</strong>
              <p>
                Deploy file WASM rồi đặt <code>NEXT_PUBLIC_MINI_WALLET_CONTRACT_ID</code>
                {" "}để mở giao dịch thật.
              </p>
            </div>
          </div>
          <span>mini_wallet.wasm · 3.293 bytes</span>
        </section>
      )}

      <footer>
        <span>Stellar Mini Wallet · Bản học tập trên Testnet</span>
        <span>Rust · Soroban SDK 26 · TypeScript · Freighter</span>
      </footer>

      {freighterInstalled === false && mode === "testnet" && (
        <div className="freighter-hint">
          <CircleAlert size={17} />
          <span>Cần cài Freighter để kết nối ví.</span>
          <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
            Tải Freighter <ExternalLink size={13} />
          </a>
        </div>
      )}
    </main>
  );
}

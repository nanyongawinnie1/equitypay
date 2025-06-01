"use client";
import { useEffect, useState } from "react";

// Shared Circle Arc App Kit panel: chain-abstracted Unified USDC balance, Deposit, and Send.
// Self-contained (uses window.ethereum) so it works alongside the wagmi-based contract UI.

const fmt = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const ARC_HEX = "0x4cef52";
const ARC_PARAMS = {
  chainId: ARC_HEX, chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"],
};

function getProvider() {
  const w = window as any; let p = w.okxwallet || w.ethereum;
  if (w.ethereum?.providers?.length) p = w.ethereum.providers.find((x: any) => x.isMetaMask) || w.ethereum.providers[0];
  return p;
}
async function ensureArc(p: any) {
  try { await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_HEX }] }); }
  catch (e: any) { if (e?.code === 4902 || e?.code === -32603) await p.request({ method: "wallet_addEthereumChain", params: [ARC_PARAMS] }); }
}

export function AppKitPanel({ color = "emerald" }: { color?: string }) {
  const [addr, setAddr] = useState("");
  const [bal, setBal] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [dep, setDep] = useState("");
  const [sub, setSub] = useState<"balance" | "deposit" | "send">("balance");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    const p = getProvider();
    if (!p) { setStatus("No EVM wallet detected (MetaMask / OKX)."); return; }
    await ensureArc(p);
    const a = await p.request({ method: "eth_requestAccounts" });
    setAddr(a[0]);
  }
  async function loadBalance(a = addr) {
    if (!a) return; setBusy(true); setStatus("");
    try {
      const { createUnifiedBalanceKitContext, getBalances } = await import("@circle-fin/unified-balance-kit");
      const ctx = createUnifiedBalanceKitContext();
      const res: any = await getBalances(ctx as any, { token: "USDC", sources: { address: a, chains: ["Arc_Testnet"] }, includePending: true } as any);
      setBal(res?.totalConfirmedBalance ?? "0"); setPending(res?.totalPendingBalance ?? null);
      const p = Number(res?.totalPendingBalance || 0);
      setStatus(p > 0 ? `$${res.totalPendingBalance} pending — confirming…` : "Unified USDC balance loaded ✓");
    } catch (e: any) { setStatus("Balance: " + (e?.shortMessage || e?.message || "unavailable")); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (addr) loadBalance(addr); }, [addr]); // eslint-disable-line

  async function deposit() {
    if (!addr || !(Number(dep) > 0)) return; setBusy(true); setStatus("Depositing…");
    try {
      const p = getProvider();
      const { createViemAdapterFromProvider } = await import("@circle-fin/adapter-viem-v2");
      const { createUnifiedBalanceKitContext, deposit: ubDeposit } = await import("@circle-fin/unified-balance-kit");
      const adapter: any = await createViemAdapterFromProvider({ provider: p } as any);
      const ctx = createUnifiedBalanceKitContext();
      const res: any = await ubDeposit(ctx as any, { from: { adapter, chain: "Arc_Testnet" }, token: "USDC", amount: dep } as any);
      setStatus("Deposited ✓ " + (res?.txHash ? fmt(res.txHash) : "")); setDep(""); setSub("balance");
      for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 5000)); await loadBalance(); }
    } catch (e: any) { setStatus("Deposit failed: " + (e?.shortMessage || e?.message || "unknown")); }
    finally { setBusy(false); }
  }
  async function send() {
    if (!addr || !to || !(Number(amount) > 0)) return; setBusy(true); setStatus("Preparing…");
    try {
      const p = getProvider();
      const { createViemAdapterFromProvider } = await import("@circle-fin/adapter-viem-v2");
      const { createUnifiedBalanceKitContext, spend } = await import("@circle-fin/unified-balance-kit");
      const adapter: any = await createViemAdapterFromProvider({ provider: p } as any);
      const ctx = createUnifiedBalanceKitContext();
      const res: any = await spend(ctx as any, { from: { adapter }, to: { adapter, chain: "Arc_Testnet", recipientAddress: to, useForwarder: false }, token: "USDC", amount } as any);
      setStatus("Sent ✓ " + (res?.txHash ? fmt(res.txHash) : "")); setTo(""); setAmount(""); loadBalance();
    } catch (e: any) { setStatus("Send failed: " + (e?.shortMessage || e?.message || "unknown")); }
    finally { setBusy(false); }
  }

  const c = color;
  return (
    <div className="space-y-4">
      <div className={`bg-${c}-500/10 border border-${c}-500/20 rounded-xl p-3 text-center text-xs text-${c}-300`}>⚡ Powered by Circle App Kit — chain-abstracted USDC (Unified Balance · Deposit · Send)</div>
      {!addr ? <button onClick={connect} className={`w-full py-3 font-bold rounded-xl bg-${c}-500 text-black hover:opacity-90`}>Connect for USDC balance</button>
        : <>
          {status && <div className="text-center text-xs text-gray-400">{status}</div>}
          <div className="flex gap-2">{(["balance", "deposit", "send"] as const).map(s => <button key={s} onClick={() => setSub(s)} className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize ${sub === s ? `bg-${c}-500 text-black` : "bg-gray-800 text-gray-400"}`}>{s}</button>)}</div>
          {sub === "balance" && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Unified USDC balance</div>
            <div className={`text-4xl font-black text-${c}-300`}>{bal !== null ? `$${bal}` : "—"}</div>
            {pending && Number(pending) > 0 ? <div className="text-xs text-amber-400">⏳ ${pending} pending</div> : null}
            <button onClick={() => loadBalance()} disabled={busy} className="w-full py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs font-semibold disabled:opacity-40">{busy ? "…" : "Refresh"}</button>
          </div>}
          {sub === "deposit" && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
            <div className="text-xs text-gray-500">Move USDC from wallet into unified balance (needed before Send).</div>
            <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span><input value={dep} onChange={e => setDep(e.target.value)} type="number" placeholder="0.00" className={`w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:border-${c}-500`} /></div>
            <button onClick={deposit} disabled={busy || !(Number(dep) > 0)} className={`w-full py-3 font-bold rounded-xl bg-${c}-500 text-black hover:opacity-90 disabled:opacity-40`}>{busy ? "…" : "Deposit"}</button>
          </div>}
          {sub === "send" && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="0x… recipient" className={`w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-${c}-500`} />
            <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span><input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0.00" className={`w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:border-${c}-500`} /></div>
            <button onClick={send} disabled={busy || !to || !(Number(amount) > 0)} className={`w-full py-3 font-bold rounded-xl bg-${c}-500 text-black hover:opacity-90 disabled:opacity-40`}>{busy ? "…" : amount ? `Send $${amount} USDC` : "Send"}</button>
          </div>}
        </>}
    </div>
  );
}

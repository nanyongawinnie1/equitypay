"use client";
// Equitypay — standalone equity-vesting dApp. Corporate fintech dashboard. Self-contained.
import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";

const K = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const EURC = (process.env.NEXT_PUBLIC_EURC_ADDRESS || "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a") as `0x${string}`;
const ED = Number(process.env.NEXT_PUBLIC_EURC_DECIMALS || "6");
const CHAIN = 5042002, HEX = "0x4CEF52";
const ABI = [
  { name: "create", type: "function", stateMutability: "payable", inputs: [{ name: "beneficiary", type: "address" }, { name: "label", type: "string" }, { name: "cliffDays", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "matured", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "get", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "grantor", type: "address" }, { name: "beneficiary", type: "address" }, { name: "label", type: "string" }, { name: "amount", type: "uint256" }, { name: "cliff", type: "uint256" }, { name: "claimed", type: "bool" }] }] },
  { name: "total", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "quote", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "bool" }, { name: "a", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "swapUsdcToEurc", type: "function", stateMutability: "payable", inputs: [{ name: "minOut", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "earnApyBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "earnDeposit", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "earnWithdraw", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "earnPrincipal", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const m = (w?: bigint, d = 2) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const cut = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const isAddr = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);
async function toArc() { const e = (window as any).ethereum; if (!e) return; try { await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] }); } catch { try { await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEX }] }); } catch {} } }

export default function App() {
  const { address, isConnected } = useAccount();
  const net = useChainId();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [pop, setPop] = useState(false);
  const [section, setSection] = useState<"grants" | "vault" | "fx">("grants");
  const [f, setF] = useState({ ben: "", label: "", cliff: "365", amt: "" });
  const [dep, setDep] = useState("");
  const [sw, setSw] = useState("");
  const w = useWriteContract();
  const rc = useWaitForTransactionReceipt({ hash: w.data, query: { enabled: !!w.data } });
  const busy = w.isPending || rc.isLoading;
  useEffect(() => { if (rc.isSuccess) { w.reset(); setF({ ben: "", label: "", cliff: "365", amt: "" }); setDep(""); setSw(""); } }, [rc.isSuccess]); // eslint-disable-line
  const total = useReadContract({ address: K, abi: ABI, functionName: "total" });
  const apy = useReadContract({ address: K, abi: ABI, functionName: "earnApyBps" });
  const prin = useReadContract({ address: K, abi: ABI, functionName: "earnPrincipal", args: address ? [address] : undefined, query: { enabled: !!address } });
  const swWei = useMemo(() => { try { return parseEther(sw || "0"); } catch { return 0n; } }, [sw]);
  const out = useReadContract({ address: K, abi: ABI, functionName: "quote", args: [true, swWei], query: { enabled: swWei > 0n } });
  const n = total.data !== undefined ? Number(total.data) : 0;
  const wrong = isConnected && net !== CHAIN;
  const apyPct = apy.data === undefined ? "—" : (Number(apy.data) / 100).toFixed(1);
  const call = (fn: string, a: any[], v?: bigint) => w.writeContract({ address: K, abi: ABI, functionName: fn as any, args: a, value: v });
  const NAV = [["grants", "Grants"], ["vault", "Treasury"], ["fx", "FX"]] as const;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#0a1020", color: "#dbe4f4", fontFamily: '"IBM Plex Sans","Segoe UI",sans-serif' }}>
      <aside style={{ width: 220, borderRight: "1px solid #16213d", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px 18px" }}><span style={{ width: 30, height: 30, borderRadius: 7, background: "#1d4ed8", display: "grid", placeItems: "center" }}>📊</span><b style={{ fontSize: 16 }}>Equitypay</b></div>
        {NAV.map(([k, l]) => <button key={k} onClick={() => setSection(k as any)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 9, border: 0, fontSize: 14, fontWeight: 600, cursor: "pointer", background: section === k ? "#13203c" : "transparent", color: section === k ? "#93b4ff" : "#6b7a99" }}>{l}</button>)}
        <div style={{ marginTop: "auto" }}>
          {wrong && <button onClick={toArc} style={{ width: "100%", marginBottom: 8, background: "#dc2626", color: "#fff", border: 0, padding: "9px", borderRadius: 9, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Switch to Arc</button>}
          <div style={{ position: "relative" }}>
            <button onClick={() => setPop(p => !p)} style={{ width: "100%", background: "#1d4ed8", color: "#fff", border: 0, padding: "10px", borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{isConnected ? cut(address) : "Connect wallet"}</button>
            {pop && <div style={{ position: "absolute", bottom: "112%", left: 0, right: 0, background: "#0e1730", border: "1px solid #1d2a4a", borderRadius: 10, padding: 6, zIndex: 20 }}>
              {isConnected ? <button onClick={() => { disconnect(); setPop(false); }} style={di("#f87171")}>Disconnect</button> : connectors.map(c => <button key={c.uid} onClick={() => { connect({ connector: c }); setPop(false); }} style={di("#dbe4f4")}>{c.name}</button>)}
            </div>}
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, padding: "26px 4vw", maxWidth: 860 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
          <Stat label="Active grants" val={String(n)} />
          <Stat label="Treasury APY" val={`${apyPct}%`} />
          <Stat label="Your principal" val={`$${m(prin.data as bigint)}`} accent />
        </div>

        {section === "grants" && <>
          <Card title="Issue an equity grant">
            <Row><Field v={f.ben} on={(x) => setF(s => ({ ...s, ben: x }))} ph="Beneficiary 0x…" /><Field v={f.label} on={(x) => setF(s => ({ ...s, label: x }))} ph="Label (e.g. Seed grant)" /></Row>
            <Row><Field v={f.cliff} on={(x) => setF(s => ({ ...s, cliff: x }))} ph="Cliff (days)" t="number" /><Field v={f.amt} on={(x) => setF(s => ({ ...s, amt: x }))} ph="Amount USDC" t="number" /></Row>
            <Btn disabled={!isConnected || busy || !isAddr(f.ben) || !(Number(f.amt) > 0)} onClick={() => call("create", [f.ben as `0x${string}`, f.label, BigInt(f.cliff || "0")], parseEther(f.amt || "0"))}>{busy ? "Confirming…" : "Issue grant"}</Btn>
          </Card>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {n === 0 && <div style={{ color: "#5d6a86", textAlign: "center", padding: 22 }}>No grants issued yet</div>}
            {Array.from({ length: n }, (_, i) => BigInt(n - 1 - i)).map(id => <Grant key={id.toString()} id={id} busy={busy} onClaim={() => call("claim", [id])} />)}
          </div>
        </>}

        {section === "vault" && <Card title={`Treasury vault · ${apyPct}% APY`}>
          <div style={{ color: "#6b7a99", fontSize: 13, marginBottom: 12 }}>Principal <b style={{ color: "#93b4ff" }}>${m(prin.data as bigint)}</b></div>
          <Field v={dep} on={setDep} ph="USDC to deposit" t="number" />
          <Row><Btn disabled={!isConnected || busy || !(Number(dep) > 0)} onClick={() => call("earnDeposit", [], parseEther(dep || "0"))}>{busy ? "…" : "Deposit"}</Btn><Btn ghost disabled={busy || !(prin.data && (prin.data as bigint) > 0n)} onClick={() => call("earnWithdraw", [])}>Withdraw all</Btn></Row>
        </Card>}

        {section === "fx" && <Card title="Convert USDC → EURC">
          <Field v={sw} on={setSw} ph="USDC amount" t="number" />
          <div style={{ color: "#6b7a99", fontSize: 13, margin: "2px 0 12px" }}>Receive ≈ <b style={{ color: "#93b4ff" }}>{out.data !== undefined ? Number(formatUnits(out.data as bigint, ED)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0"} EURC</b></div>
          <Btn disabled={!isConnected || busy || !(swWei > 0n)} onClick={() => call("swapUsdcToEurc", [0n], swWei)}>{busy ? "…" : "Convert"}</Btn>
        </Card>}
      </div>
    </div>
  );
}
function Grant({ id, busy, onClaim }: { id: bigint; busy: boolean; onClaim: () => void }) {
  const g = useReadContract({ address: K, abi: ABI, functionName: "get", args: [id] });
  const mat = useReadContract({ address: K, abi: ABI, functionName: "matured", args: [id] });
  if (!g.data) return null; const it = g.data as any; const ready = !!mat.data && !it.claimed;
  return (
    <div style={{ background: "#0e1730", border: "1px solid #1a2744", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><div style={{ fontWeight: 600 }}>{it.label || `Grant #${id}`}</div><div style={{ color: "#5d6a86", fontSize: 12.5, marginTop: 2 }}>{cut(it.beneficiary)} · cliff {Number(it.cliff)}d</div></div>
      <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, color: "#93b4ff" }}>${m(it.amount)}</div>
        {it.claimed ? <span style={{ fontSize: 12, color: "#4ade80" }}>Claimed ✓</span> : <button disabled={busy || !ready} onClick={onClaim} style={{ marginTop: 4, background: ready ? "#1d4ed8" : "#1a2744", color: ready ? "#fff" : "#5d6a86", border: 0, padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: ready ? "pointer" : "not-allowed" }}>{ready ? "Claim" : "Vesting"}</button>}</div>
    </div>
  );
}
const Stat = ({ label, val, accent }: { label: string; val: string; accent?: boolean }) => <div style={{ flex: 1, background: "#0e1730", border: "1px solid #16213d", borderRadius: 12, padding: "14px 16px" }}><div style={{ color: "#6b7a99", fontSize: 12 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: accent ? "#93b4ff" : "#fff" }}>{val}</div></div>;
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => <div style={{ background: "#0e1730", border: "1px solid #16213d", borderRadius: 14, padding: "20px 22px" }}><div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>{title}</div>{children}</div>;
const Row = ({ children }: { children: React.ReactNode }) => <div style={{ display: "flex", gap: 10 }}>{children}</div>;
const Field = ({ v, on, ph, t }: { v: string; on: (x: string) => void; ph: string; t?: string }) => <input value={v} onChange={e => on(e.target.value)} placeholder={ph} type={t || "text"} style={{ width: "100%", boxSizing: "border-box", background: "#0a1020", border: "1px solid #1d2a4a", borderRadius: 10, padding: "11px 13px", color: "#dbe4f4", fontSize: 14.5, outline: "none", marginBottom: 10 }} />;
const Btn = ({ children, onClick, disabled, ghost }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; ghost?: boolean }) => <button disabled={disabled} onClick={onClick} style={{ flex: 1, marginTop: 2, background: ghost ? "transparent" : "#1d4ed8", color: ghost ? "#93b4ff" : "#fff", border: ghost ? "1px solid #1d4ed8" : 0, borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1 }}>{children}</button>;
const di = (color: string): React.CSSProperties => ({ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, padding: "9px 12px", borderRadius: 8, color, fontWeight: 600, fontSize: 13.5, cursor: "pointer" });

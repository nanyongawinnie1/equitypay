"use client";
import { useEffect, useState } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";

// Multi-capability DeFi panel for the combined contract's own module: Swap + Liquidity + Earn.
// `show` picks which sub-tabs appear (first = default). USDC native (18) / EURC ERC20 (6).
const AMM = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const EURC = (process.env.NEXT_PUBLIC_EURC_ADDRESS || "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a") as `0x${string}`;
const ED = Number(process.env.NEXT_PUBLIC_EURC_DECIMALS || "6");
const ABI = [
  { name: "quote", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "bool" }, { name: "a", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "reserves", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "usdc", type: "uint256" }, { name: "eurc", type: "uint256" }, { name: "lp", type: "uint256" }] },
  { name: "lpOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "swapUsdcToEurc", type: "function", stateMutability: "payable", inputs: [{ name: "minOut", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "swapEurcToUsdc", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amountIn", type: "uint256" }, { name: "minOut", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "addLiquidity", type: "function", stateMutability: "payable", inputs: [{ name: "eurcAmt", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "removeLiquidity", type: "function", stateMutability: "nonpayable", inputs: [{ name: "lp", type: "uint256" }], outputs: [] },
  { name: "earnDeposit", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "earnWithdraw", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "earnBalanceOf", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "earnPrincipal", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "earnPending", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "earnApyBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const ERC = [
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const SLIPS = [0.1, 0.5, 1];
const LABEL: Record<string, string> = { swap: "Swap", pool: "Liquidity", earn: "Earn" };
const Tok = ({ s }: { s: string }) => <span className="inline-flex items-center gap-1.5 font-bold text-sm"><span className={`w-5 h-5 rounded-full bg-gradient-to-br ${s === "USDC" ? "from-blue-400 to-blue-600" : "from-amber-300 to-amber-500"} grid place-items-center text-[10px] text-white`}>{s === "USDC" ? "$" : "€"}</span>{s}</span>;

export function DefiPanel({ color = "emerald", show = ["swap", "pool", "earn"] }: { color?: string; show?: string[] }) {
  const c = color;
  const { address, isConnected } = useAccount();
  const [sub, setSub] = useState(show[0]);
  const [u2e, setU2e] = useState(true);
  const [amt, setAmt] = useState(""); const [slip, setSlip] = useState(1);
  const [addU, setAddU] = useState(""); const [addE, setAddE] = useState(""); const [rmLp, setRmLp] = useState("");
  const [dep, setDep] = useState("");

  const { data: nat } = useBalance({ address, query: { enabled: !!address } });
  const { data: eBal } = useReadContract({ address: EURC, abi: ERC, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: res } = useReadContract({ address: AMM, abi: ABI, functionName: "reserves", query: { refetchInterval: 9000 } });
  const { data: lp, refetch: rLp } = useReadContract({ address: AMM, abi: ABI, functionName: "lpOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const inUnits = u2e ? (() => { try { return parseEther(amt || "0"); } catch { return 0n; } })() : (() => { try { return parseUnits(amt || "0", ED); } catch { return 0n; } })();
  const { data: out } = useReadContract({ address: AMM, abi: ABI, functionName: "quote", args: [u2e, inUnits], query: { enabled: inUnits > 0n } });
  const { data: alw, refetch: rA } = useReadContract({ address: EURC, abi: ERC, functionName: "allowance", args: address ? [address, AMM] : undefined, query: { enabled: !!address } });
  const { data: apy } = useReadContract({ address: AMM, abi: ABI, functionName: "earnApyBps" });
  const { data: ePrin, refetch: rEP } = useReadContract({ address: AMM, abi: ABI, functionName: "earnPrincipal", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: eBalv, refetch: rEB } = useReadContract({ address: AMM, abi: ABI, functionName: "earnBalanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: ePend, refetch: rPe } = useReadContract({ address: AMM, abi: ABI, functionName: "earnPending", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { writeContract, data: tx, isPending, reset } = useWriteContract();
  const { isSuccess, isLoading: isConf } = useWaitForTransactionReceipt({ hash: tx, query: { enabled: !!tx } });
  useEffect(() => { if (isSuccess) { rA(); rLp(); rEP(); rEB(); rPe(); reset(); setAmt(""); setAddU(""); setAddE(""); setRmLp(""); setDep(""); } }, [isSuccess]); // eslint-disable-line
  useEffect(() => { const t = setInterval(() => { if (address) { rEB(); rPe(); } }, 7000); return () => clearInterval(t); }, [address]); // eslint-disable-line
  const busy = isPending || isConf;

  const outFmt = out === undefined ? "" : u2e ? Number(formatUnits(out as bigint, ED)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : Number(formatEther(out as bigint)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  const minOut = out === undefined ? 0n : (out as bigint) * BigInt(Math.round((100 - slip) * 100)) / 10000n;
  const swapNeedApprove = !u2e && inUnits > 0n && (alw === undefined || (alw as bigint) < inUnits);
  const addE_u = (() => { try { return parseUnits(addE || "0", ED); } catch { return 0n; } })();
  const addNeedApprove = addE_u > 0n && (alw === undefined || (alw as bigint) < addE_u);
  const r = res as readonly [bigint, bigint, bigint] | undefined;
  const usd = (w?: bigint, d = 2) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  const fromBal = u2e ? (nat ? Number(formatEther(nat.value)) : 0) : (eBal !== undefined ? Number(formatUnits(eBal as bigint, ED)) : 0);
  const apyPct = apy === undefined ? "—" : (Number(apy) / 100).toFixed(1);
  const field = "w-full bg-transparent text-2xl font-bold focus:outline-none placeholder:text-gray-600";

  function doSwap() {
    if (swapNeedApprove) return writeContract({ address: EURC, abi: ERC, functionName: "approve", args: [AMM, inUnits] });
    if (u2e) writeContract({ address: AMM, abi: ABI, functionName: "swapUsdcToEurc", args: [minOut], value: inUnits });
    else writeContract({ address: AMM, abi: ABI, functionName: "swapEurcToUsdc", args: [inUnits, minOut] });
  }
  function doAdd() {
    if (addNeedApprove) return writeContract({ address: EURC, abi: ERC, functionName: "approve", args: [AMM, addE_u] });
    writeContract({ address: AMM, abi: ABI, functionName: "addLiquidity", args: [addE_u], value: (() => { try { return parseEther(addU || "0"); } catch { return 0n; } })() });
  }

  return (
    <div className="space-y-3">
      {show.length > 1 && <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit mx-auto">
        {show.map(s => <button key={s} onClick={() => setSub(s)} className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${sub === s ? `bg-${c}-500 text-black` : "text-gray-400 hover:text-gray-200"}`}>{LABEL[s]}</button>)}
      </div>}

      {sub === "swap" && <>
        <div className="flex items-center justify-end px-1"><span className="text-xs text-gray-500">Slippage</span>{SLIPS.map(s => <button key={s} onClick={() => setSlip(s)} className={`ml-1 px-2 py-0.5 rounded-md text-xs font-semibold ${slip === s ? `bg-${c}-500 text-black` : "bg-gray-800 text-gray-400"}`}>{s}%</button>)}</div>
        <div className="relative space-y-1">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-500"><span>You pay</span><span>Balance {fromBal.toLocaleString(undefined, { maximumFractionDigits: 2 })} <button onClick={() => setAmt(String(fromBal))} className={`text-${c}-400 font-semibold hover:underline`}>MAX</button></span></div>
            <div className="flex items-center gap-3"><input value={amt} onChange={e => setAmt(e.target.value)} type="number" placeholder="0" className={field} /><div className="bg-gray-800 rounded-full px-3 py-1.5"><Tok s={u2e ? "USDC" : "EURC"} /></div></div>
          </div>
          <div className="flex justify-center -my-3 relative z-10"><button onClick={() => { setU2e(v => !v); setAmt(""); }} className={`w-9 h-9 rounded-xl bg-gray-800 border-4 border-[#0a0a0a] grid place-items-center text-gray-300 hover:text-${c}-400 hover:rotate-180 transition-all`}>↓</button></div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <div className="text-xs text-gray-500">You receive</div>
            <div className="flex items-center gap-3"><div className={`flex-1 text-2xl font-bold ${outFmt ? "text-white" : "text-gray-600"}`}>{outFmt || "0"}</div><div className="bg-gray-800 rounded-full px-3 py-1.5"><Tok s={u2e ? "EURC" : "USDC"} /></div></div>
          </div>
        </div>
        <button onClick={doSwap} disabled={!isConnected || busy || !(inUnits > 0n)} className={`w-full py-4 font-bold rounded-2xl bg-gradient-to-r from-${c}-500 to-${c}-600 text-white hover:opacity-90 disabled:opacity-40 shadow-lg shadow-${c}-500/20`}>{!isConnected ? "Connect wallet" : busy ? "…" : !(inUnits > 0n) ? "Enter an amount" : swapNeedApprove ? "Approve EURC" : `Swap ${u2e ? "USDC → EURC" : "EURC → USDC"}`}</button>
      </>}

      {sub === "pool" && <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3"><div className="text-[10px] text-gray-500">USDC</div><div className="font-bold text-sm">${r ? Number(formatEther(r[0])).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}</div></div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3"><div className="text-[10px] text-gray-500">EURC</div><div className="font-bold text-sm">€{r ? Number(formatUnits(r[1], ED)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}</div></div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3"><div className="text-[10px] text-gray-500">Your LP</div><div className={`font-bold text-sm text-${c}-300`}>{lp ? Number(formatEther(lp as bigint)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}</div></div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold">Add liquidity</div>
          <div className="flex items-center gap-2"><span className="text-gray-500">$</span><input value={addU} onChange={e => setAddU(e.target.value)} type="number" placeholder="USDC" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none" /><Tok s="USDC" /></div>
          <div className="flex items-center gap-2"><span className="text-gray-500">€</span><input value={addE} onChange={e => setAddE(e.target.value)} type="number" placeholder="EURC" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none" /><Tok s="EURC" /></div>
          <button onClick={doAdd} disabled={!isConnected || busy || !(Number(addU) > 0) || !(addE_u > 0n)} className={`w-full py-3 font-bold rounded-xl bg-gradient-to-r from-${c}-500 to-${c}-600 text-white hover:opacity-90 disabled:opacity-40`}>{busy ? "…" : addNeedApprove ? "Approve EURC" : "Add liquidity"}</button>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold">Remove liquidity</div>
          <div className="flex gap-2"><input value={rmLp} onChange={e => setRmLp(e.target.value)} type="number" placeholder="LP amount" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none" /><button onClick={() => lp && setRmLp(formatEther(lp as bigint))} className={`px-3 text-${c}-400 text-sm font-semibold`}>MAX</button></div>
          <button onClick={() => writeContract({ address: AMM, abi: ABI, functionName: "removeLiquidity", args: [(() => { try { return parseEther(rmLp || "0"); } catch { return 0n; } })()] })} disabled={!isConnected || busy || !(Number(rmLp) > 0)} className="w-full py-3 font-bold rounded-xl bg-gray-700 text-gray-100 hover:bg-gray-600 disabled:opacity-40">{busy ? "…" : "Remove liquidity"}</button>
        </div>
      </div>}

      {sub === "earn" && <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className={`bg-gradient-to-br from-${c}-500/15 to-${c}-500/5 border border-${c}-500/20 rounded-2xl p-4`}><div className="text-xs text-gray-400">APY</div><div className={`text-2xl font-extrabold text-${c}-300`}>{apyPct}%</div></div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4"><div className="text-xs text-gray-400">Your balance</div><div className="text-2xl font-extrabold">${usd(eBalv as bigint, 2)}</div></div>
        </div>
        {ePrin !== undefined && (ePrin as bigint) > 0n && <div className="flex justify-between text-xs px-1"><span className="text-gray-500">Principal ${usd(ePrin as bigint)}</span><span className="text-emerald-400 tabular-nums">+${usd(ePend as bigint, 6)} earned</span></div>}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3"><span className="text-gray-500 text-lg">$</span><input value={dep} onChange={e => setDep(e.target.value)} type="number" placeholder="0" className="w-full bg-transparent text-2xl font-bold focus:outline-none placeholder:text-gray-600" /><Tok s="USDC" /></div>
          <button onClick={() => writeContract({ address: AMM, abi: ABI, functionName: "earnDeposit", value: (() => { try { return parseEther(dep || "0"); } catch { return 0n; } })() })} disabled={!isConnected || busy || !(Number(dep) > 0)} className={`w-full py-3 font-bold rounded-xl bg-gradient-to-r from-${c}-500 to-${c}-600 text-white hover:opacity-90 disabled:opacity-40`}>{busy ? "…" : `Deposit & earn ${apyPct}%`}</button>
          {ePrin !== undefined && (ePrin as bigint) > 0n && <button onClick={() => writeContract({ address: AMM, abi: ABI, functionName: "earnWithdraw" })} disabled={busy} className="w-full py-2.5 font-semibold rounded-xl bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 text-sm">{busy ? "…" : "Withdraw all + interest"}</button>}
        </div>
      </div>}
      <p className="text-[11px] text-gray-600 text-center">On-chain AMM (x·y=k, 0.3% fee) + yield vault · settled on Arc.</p>
    </div>
  );
}

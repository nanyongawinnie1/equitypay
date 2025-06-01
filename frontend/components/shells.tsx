"use client";
import { ReactNode } from "react";
import { ConnectButton } from "./ConnectButton";

// 8 distinct page layouts. Each takes the same props and arranges brand/nav/tabs/content differently.
export type Brand = { name: string; sub: string; emoji: string; color: string; font: string; shape: string; hero: string; herosub: string };
type P = { brand: Brand; tabs: [string, string][]; tab: string; setTab: (t: string) => void; children: ReactNode };
const pill = (c: string, on: boolean) => on ? `bg-gradient-to-r from-${c}-500 to-${c}-600 text-white shadow-lg shadow-${c}-500/20` : "text-gray-400 hover:text-gray-200";

// 1 — Centered
export function Shell1({ brand: b, tabs, tab, setTab, children }: P) {
  return (<div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-gray-800/80 px-5 sm:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3"><span className={`w-10 h-10 ${b.shape} bg-gradient-to-br from-${b.color}-500 to-${b.color}-700 grid place-items-center text-xl shadow-lg shadow-${b.color}-500/30`}>{b.emoji}</span><div className="leading-tight"><div className={`text-[15px] font-bold text-${b.color}-100`} style={{ fontFamily: b.font }}>{b.name}</div><div className="text-[10px] text-gray-500" style={{ fontFamily: b.font }}>{b.sub}</div></div></div><ConnectButton /></header>
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-10 space-y-7">
      <div className="text-center space-y-2"><h1 className={`text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-${b.color}-300 to-${b.color}-400`} style={{ fontFamily: b.font }}>{b.hero}</h1><p className="text-gray-400 text-sm">{b.herosub}</p></div>
      <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-2xl p-1 w-fit mx-auto">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${pill(b.color, tab === k)}`}>{l}</button>)}</div>
      {children}
    </main>
    <footer className="border-t border-gray-800 py-5 text-center text-gray-600 text-xs">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className={`text-${b.color}-400 hover:underline`}>Arc Network</a></footer>
  </div>);
}

// 2 — Top-nav app (wide, inline menu, no hero)
export function Shell2({ brand: b, tabs, tab, setTab, children }: P) {
  return (<div className="min-h-screen bg-[#0b0b0d] text-white flex flex-col">
    <header className="border-b border-gray-800 px-5 sm:px-10 py-3 flex items-center gap-6">
      <div className="flex items-center gap-2"><span className={`w-8 h-8 ${b.shape} bg-${b.color}-500/20 border border-${b.color}-500/40 grid place-items-center text-base`}>{b.emoji}</span><span className="font-bold tracking-tight" style={{ fontFamily: b.font }}>{b.name}</span></div>
      <nav className="hidden sm:flex items-center gap-1 flex-1">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === k ? `text-${b.color}-300 bg-${b.color}-500/10` : "text-gray-400 hover:text-gray-200"}`}>{l}</button>)}</nav>
      <div className="ml-auto"><ConnectButton /></div></header>
    <div className="sm:hidden flex gap-1 px-4 py-2 border-b border-gray-800 overflow-x-auto">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${tab === k ? `text-${b.color}-300 bg-${b.color}-500/10` : "text-gray-400"}`}>{l}</button>)}</div>
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8"><div className="mb-6"><h1 className="text-2xl font-bold" style={{ fontFamily: b.font }}>{b.hero}</h1><p className="text-gray-400 text-sm mt-1">{b.herosub}</p></div><div className="max-w-md">{children}</div></main>
    <footer className="border-t border-gray-800 py-4 px-6 text-gray-600 text-xs">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className={`text-${b.color}-400 hover:underline`}>Arc Network</a></footer>
  </div>);
}

// 3 — Split hero (left text, right content)
export function Shell3({ brand: b, tabs, tab, setTab, children }: P) {
  return (<div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
    <header className="px-5 sm:px-10 py-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-2xl">{b.emoji}</span><span className="font-bold" style={{ fontFamily: b.font }}>{b.name}</span></div><ConnectButton /></header>
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 sm:px-10 py-8 grid md:grid-cols-2 gap-10 items-start">
      <div className="md:sticky md:top-10"><h1 className={`text-4xl sm:text-5xl font-extrabold leading-tight text-transparent bg-clip-text bg-gradient-to-br from-${b.color}-300 to-${b.color}-500`} style={{ fontFamily: b.font }}>{b.hero}</h1><p className="text-gray-400 mt-4 text-base max-w-sm">{b.herosub}</p><div className="mt-6 inline-flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${tab === k ? `bg-${b.color}-500 text-black` : "text-gray-400"}`}>{l}</button>)}</div></div>
      <div className="w-full max-w-md">{children}</div>
    </main>
    <footer className="border-t border-gray-800 py-4 px-10 text-gray-600 text-xs">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className={`text-${b.color}-400 hover:underline`}>Arc Network</a></footer>
  </div>);
}

// 4 — Dashboard (stat strip + panel)
export function Shell4({ brand: b, tabs, tab, setTab, children }: P) {
  return (<div className="min-h-screen bg-[#08090c] text-white flex flex-col">
    <header className="border-b border-gray-800/70 px-5 sm:px-8 py-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className={`w-9 h-9 ${b.shape} bg-gradient-to-br from-${b.color}-500 to-${b.color}-700 grid place-items-center`}>{b.emoji}</span><div><div className="font-bold text-sm" style={{ fontFamily: b.font }}>{b.name}</div><div className="text-[10px] text-gray-500">{b.sub}</div></div></div><ConnectButton /></header>
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div><h1 className="text-2xl font-bold" style={{ fontFamily: b.font }}>{b.hero}</h1><p className="text-gray-400 text-sm">{b.herosub}</p></div>
      <div className="flex gap-1 border-b border-gray-800">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === k ? `border-${b.color}-500 text-${b.color}-300` : "border-transparent text-gray-400 hover:text-gray-200"}`}>{l}</button>)}</div>
      <div className="max-w-md">{children}</div>
    </main>
    <footer className="border-t border-gray-800 py-4 px-6 text-gray-600 text-xs">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className={`text-${b.color}-400 hover:underline`}>Arc Network</a></footer>
  </div>);
}

// 5 — Sidebar
export function Shell5({ brand: b, tabs, tab, setTab, children }: P) {
  return (<div className="min-h-screen bg-[#0a0a0a] text-white md:flex">
    <aside className="md:w-56 md:min-h-screen border-b md:border-b-0 md:border-r border-gray-800 px-4 py-5 flex md:flex-col gap-4 items-center md:items-stretch">
      <div className="flex items-center gap-2"><span className={`w-9 h-9 ${b.shape} bg-gradient-to-br from-${b.color}-500 to-${b.color}-700 grid place-items-center`}>{b.emoji}</span><span className="font-bold text-sm hidden md:inline" style={{ fontFamily: b.font }}>{b.name}</span></div>
      <nav className="flex md:flex-col gap-1 flex-1">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`text-left px-3 py-2 rounded-lg text-sm font-medium ${tab === k ? `bg-${b.color}-500/15 text-${b.color}-300` : "text-gray-400 hover:bg-gray-900"}`}>{l}</button>)}</nav>
      <div className="hidden md:block"><ConnectButton /></div>
    </aside>
    <div className="flex-1 flex flex-col"><div className="md:hidden px-4 py-3 border-b border-gray-800 flex justify-end"><ConnectButton /></div>
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-8 space-y-5"><div><h1 className="text-2xl font-bold" style={{ fontFamily: b.font }}>{b.hero}</h1><p className="text-gray-400 text-sm">{b.herosub}</p></div>{children}</main>
      <footer className="border-t border-gray-800 py-4 px-6 text-gray-600 text-xs">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className={`text-${b.color}-400 hover:underline`}>Arc Network</a></footer></div>
  </div>);
}

// 6 — Minimal / terminal
export function Shell6({ brand: b, tabs, tab, setTab, children }: P) {
  const M = 'ui-monospace, "Cascadia Code", Menlo, monospace';
  return (<div className="min-h-screen bg-black text-gray-200" style={{ fontFamily: M }}>
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3"><div className="text-sm">{b.emoji} <span className="text-white">{b.name.toLowerCase().replace(/\s/g, "-")}</span> <span className="text-gray-600">/ arc</span></div><ConnectButton /></div>
      <div className="py-6"><div className="text-xl text-white">{b.hero}</div><div className="text-gray-500 text-sm mt-1">{b.herosub}</div></div>
      <div className="flex gap-2 text-sm mb-4">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={tab === k ? `text-${b.color}-400` : "text-gray-600 hover:text-gray-400"}>[ {l.toLowerCase()} ]</button>)}</div>
      <div>{children}</div>
      <div className="border-t border-gray-800 mt-8 pt-3 text-gray-600 text-xs">built on <a href="https://arc.network" className={`text-${b.color}-500`}>arc network</a></div>
    </div>
  </div>);
}

// 7 — Card-stack (one big elevated card)
export function Shell7({ brand: b, tabs, tab, setTab, children }: P) {
  return (<div className="min-h-screen bg-gradient-to-b from-[#0d0d11] to-[#070708] text-white flex flex-col items-center px-4 py-8">
    <div className="w-full max-w-md flex justify-end mb-4"><ConnectButton /></div>
    <div className="w-full max-w-md bg-gray-900/80 border border-gray-800 rounded-3xl shadow-2xl shadow-black/50 p-6 space-y-5">
      <div className="text-center space-y-2"><span className={`inline-grid w-14 h-14 ${b.shape} bg-gradient-to-br from-${b.color}-500 to-${b.color}-700 place-items-center text-2xl mx-auto shadow-lg shadow-${b.color}-500/40`}>{b.emoji}</span><h1 className="text-2xl font-extrabold" style={{ fontFamily: b.font }}>{b.hero}</h1><p className="text-gray-400 text-sm">{b.herosub}</p></div>
      <div className="flex gap-1 bg-black/40 border border-gray-800 rounded-xl p-1">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${tab === k ? `bg-${b.color}-500 text-black` : "text-gray-400"}`}>{l}</button>)}</div>
      {children}
    </div>
    <div className="text-gray-600 text-xs mt-6">Built on <a href="https://arc.network" className={`text-${b.color}-400`}>Arc Network</a></div>
  </div>);
}

// 8 — Hero-banner
export function Shell8({ brand: b, tabs, tab, setTab, children }: P) {
  return (<div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
    <div className={`bg-gradient-to-br from-${b.color}-600/30 via-${b.color}-500/10 to-transparent border-b border-${b.color}-500/20`}>
      <header className="px-5 sm:px-10 py-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-2xl">{b.emoji}</span><span className="font-bold" style={{ fontFamily: b.font }}>{b.name}</span></div><ConnectButton /></header>
      <div className="px-5 sm:px-10 pb-8 pt-4 max-w-3xl mx-auto text-center"><h1 className="text-4xl sm:text-5xl font-extrabold" style={{ fontFamily: b.font }}>{b.hero}</h1><p className="text-gray-300 mt-2">{b.herosub}</p>
        <div className="mt-5 inline-flex gap-1 bg-black/30 backdrop-blur border border-white/10 rounded-full p-1">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${tab === k ? "bg-white text-black" : "text-gray-200 hover:bg-white/10"}`}>{l}</button>)}</div></div>
    </div>
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-8">{children}</main>
    <footer className="border-t border-gray-800 py-4 text-center text-gray-600 text-xs">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className={`text-${b.color}-400 hover:underline`}>Arc Network</a></footer>
  </div>);
}

export const SHELLS = [Shell1, Shell2, Shell3, Shell4, Shell5, Shell6, Shell7, Shell8];

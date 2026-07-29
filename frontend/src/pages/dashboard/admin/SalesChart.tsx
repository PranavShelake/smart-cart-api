import { useState } from "react";
import { salesChartData } from "./mockData";

export default function SalesChart() {
  const [tab, setTab] = useState<"weekly"|"monthly">("monthly");
  const max = Math.max(...salesChartData.map(d => d.value));
  return (
    <div className="glass-panel rounded-[22px] p-6 flex flex-col">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-white font-display">Sales Overview</h3>
          <p className="text-[12px] text-slate-500 mt-0.5">Monthly performance metrics</p>
        </div>
        <div className="flex gap-1.5">
          {(["weekly","monthly"] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-display capitalize transition-all
                ${tab===t ? "bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-glow-purple"
                           : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"}`}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-1.5 flex-1 min-h-[140px] relative">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0,1,2,3].map(i=><div key={i} className="w-full border-t border-white/[0.04]"/>)}
        </div>
        {salesChartData.map((d, i) => (
          <div key={d.month} className="flex-1 rounded-t-[4px] min-h-[4px] hover:opacity-75 transition-opacity cursor-pointer"
            style={{height:`${(d.value/max)*100}%`, background: i%2===0
              ? "linear-gradient(to top, rgba(124,58,237,0.35), #a78bfa)"
              : "linear-gradient(to top, rgba(59,130,246,0.35), #60a5fa)"}}/>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {salesChartData.map(d=>(
          <span key={d.month} className="flex-1 text-center text-[9px] uppercase tracking-wide text-slate-600 font-display">{d.month}</span>
        ))}
      </div>
    </div>
  );
}
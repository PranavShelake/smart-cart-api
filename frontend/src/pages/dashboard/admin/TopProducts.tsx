import { topProducts } from "./mockData";
const stockStyle = { in:"text-teal-400", low:"text-amber-400", out:"text-red-400" };
export default function TopProducts() {
  return (
    <div className="glass-panel rounded-[22px] p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[15px] font-semibold text-white font-display">Top Products</h3>
        <button className="text-[11px] text-violet-400 font-bold font-display hover:text-violet-300 transition-colors">See All</button>
      </div>
      <div className="flex flex-col gap-0.5">
        {topProducts.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-slate-500 group-hover:text-violet-400 transition-colors">{p.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white font-display truncate">{p.name}</p>
              <p className="text-[10px] text-slate-500">{p.category}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[12px] font-bold text-white font-display">{p.price}</p>
              <p className={`text-[10px] font-bold ${stockStyle[p.stock as keyof typeof stockStyle]}`}>{p.stockLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
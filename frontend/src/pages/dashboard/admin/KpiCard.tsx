type KpiCardProps = {
  label: string; value: string; change: number; trend: "up"|"down"; icon: string; color: string;
};
const colorMap: Record<string,{icon:string;pill:string}> = {
  violet:  {icon:"bg-violet-500/15 text-violet-400", pill:"bg-teal-400/10 text-teal-400"},
  blue:    {icon:"bg-blue-500/15 text-blue-400",     pill:"bg-teal-400/10 text-teal-400"},
  cyan:    {icon:"bg-cyan-500/15 text-cyan-400",     pill:"bg-red-400/10 text-red-400"},
  emerald: {icon:"bg-emerald-500/15 text-emerald-400",pill:"bg-teal-400/10 text-teal-400"},
};
export default function KpiCard({label,value,change,trend,icon,color}:KpiCardProps){
  const c = colorMap[color] ?? colorMap.violet;
  const pillClass = trend === "up" ? "bg-teal-400/10 text-teal-400" : "bg-red-400/10 text-red-400";
  return (
    <div className="glass-panel rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-200 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <span className={`flex items-center gap-0.5 text-[10px] font-bold rounded-full px-2 py-1 ${pillClass}`}>
          <span className="material-symbols-outlined text-[12px]">{trend==="up"?"trending_up":"trending_down"}</span>
          {change}%
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-display mb-1">{label}</p>
      <p className="text-[22px] font-bold text-white font-display tracking-tight">{value}</p>
    </div>
  );
}
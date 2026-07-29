import { recentOrders } from "./mockData";
const avatarColor: Record<string,string> = {
  violet:"bg-violet-500/20 text-violet-400", blue:"bg-blue-500/20 text-blue-400",
  teal:"bg-teal-500/20 text-teal-400", amber:"bg-amber-500/20 text-amber-400",
};
const statusStyle: Record<string,string> = {
  paid:      "bg-teal-400/10 text-teal-400 border-teal-400/25",
  pending:   "bg-amber-400/10 text-amber-400 border-amber-400/25",
  cancelled: "bg-red-400/10 text-red-400 border-red-400/25",
};
export default function RecentOrders() {
  return (
    <div className="glass-panel rounded-[22px] overflow-hidden">
      <div className="flex justify-between items-center px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-[15px] font-semibold text-white font-display">Recent Orders</h3>
        <button className="text-[11px] text-violet-400 font-bold font-display hover:text-violet-300 transition-colors">View All Orders</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{tableLayout:"fixed"}}>
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Customer","Order ID","Product","Amount","Status","Action"].map((h,i)=>(
                <th key={h} className="px-6 py-3 text-[9px] uppercase tracking-widest text-slate-600 font-display font-medium"
                  style={{width:i===5?"80px":i===1?"110px":undefined, textAlign:i===5?"right":undefined}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {recentOrders.map(o => (
              <tr key={o.id} className="hover:bg-white/[0.03] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold font-display flex-shrink-0 ${avatarColor[o.color]}`}>{o.initials}</div>
                    <span className="text-[12px] font-semibold text-white truncate">{o.customer}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[11px] text-slate-400 font-display">{o.id}</td>
                <td className="px-6 py-4 text-[12px] text-slate-400 truncate">{o.product}</td>
                <td className="px-6 py-4 text-[12px] font-bold text-white font-display">{o.amount}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold font-display uppercase tracking-wide border ${statusStyle[o.status]}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-600 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
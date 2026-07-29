/**
 * mockData.ts
 * Temporary mock data for all dashboard sections.
 * When API is ready, delete this file and replace with Redux selectors.
 */

export const kpiData = [
  { id: "sales",   label: "Total Sales",   value: "₹4,28,490", change: 12.5, trend: "up",   icon: "payments",    color: "violet" },
  { id: "orders",  label: "Total Orders",  value: "1,842",      change: 8.2,  trend: "up",   icon: "shopping_bag",color: "blue"   },
  { id: "users",   label: "Active Users",  value: "8,924",      change: 2.1,  trend: "down", icon: "person",      color: "cyan"   },
  { id: "stock",   label: "Stock Level",   value: "92%",        change: 4.5,  trend: "up",   icon: "inventory",   color: "emerald"},
] as const;

export const salesChartData = [
  { month: "Jan", value: 40 }, { month: "Feb", value: 62 },
  { month: "Mar", value: 48 }, { month: "Apr", value: 82 },
  { month: "May", value: 58 }, { month: "Jun", value: 95 },
  { month: "Jul", value: 72 }, { month: "Aug", value: 78 },
  { month: "Sep", value: 52 }, { month: "Oct", value: 88 },
  { month: "Nov", value: 64 }, { month: "Dec", value: 42 },
];

export const topProducts = [
  { id: 1, name: "iPhone 15 Pro",    category: "Electronics", price: "₹1,34,900", stock: "in",  stockLabel: "In Stock",      icon: "smartphone"  },
  { id: 2, name: "Sony WH-1000XM5", category: "Audio",       price: "₹29,990",   stock: "low", stockLabel: "Low Stock (5)", icon: "headphones"  },
  { id: 3, name: "Apple Watch Ultra",category: "Wearables",   price: "₹89,900",   stock: "in",  stockLabel: "In Stock",      icon: "watch"       },
  { id: 4, name: "MacBook Pro M3",  category: "Computers",   price: "₹1,69,900", stock: "out", stockLabel: "Out of Stock",  icon: "laptop_mac"  },
];

export const recentOrders = [
  { id: "#SC-9021", customer: "John Doe",      initials: "JD", color: "violet", product: "iPhone 15 Pro Max",  amount: "₹1,59,900", status: "paid"      },
  { id: "#SC-9022", customer: "Ananya Sharma", initials: "AS", color: "blue",   product: "Sony WH-1000XM5",   amount: "₹29,990",   status: "pending"   },
  { id: "#SC-9023", customer: "Rahul Verma",   initials: "RV", color: "teal",   product: "MacBook Air M3",    amount: "₹1,14,900", status: "paid"      },
  { id: "#SC-9024", customer: "Priya Kapoor",  initials: "PK", color: "amber",  product: 'iPad Pro 12.9"',    amount: "₹1,09,900", status: "cancelled" },
];
import { adminSelect, adminSelectAll } from "./supabase-admin";
import { getAllProducts } from "./catalog";

/**
 * The assistant can ONLY call these tools. Every one returns aggregates from the
 * read-only analytics views — never a name, email, phone, or address. There is no
 * tool that reads a PII table and no tool that writes anything, so the model has no
 * path to customer identities or to altering the books, even under a jailbreak.
 */
export type ToolResult = {
  title: string;
  chartType: "bar" | "line" | "none";
  rows: { label: string; value: number }[]; // for the chart
  data: Record<string, unknown>[]; // full detail handed to the model to narrate
};

type Tool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<ToolResult>;
};

const yearFilter = (col: string, year?: number) =>
  year ? `&${col}=eq.${year}` : "";

export const TOOLS: Tool[] = [
  {
    name: "revenue_over_time",
    description: "Revenue and margin over time — monthly or yearly. Use for trends, 'how did last season compare', growth.",
    parameters: {
      type: "object",
      properties: {
        granularity: { type: "string", enum: ["month", "year"], description: "month or year buckets" },
        year: { type: "integer", description: "optional: restrict to a single calendar year" },
      },
      required: ["granularity"],
    },
    run: async (a) => {
      const rows = await adminSelect<{ ym: string; sales_rev: number; sales_cost: number; rental_rev: number }[]>(
        "v_mgmt_monthly?select=ym,sales_rev,sales_cost,rental_rev&order=ym.asc"
      );
      const y = a.year as number | undefined;
      const filtered = rows.filter((r) => !y || r.ym.startsWith(String(y)));
      if (a.granularity === "year") {
        const m = new Map<string, { rev: number; margin: number; rentals: number }>();
        for (const r of filtered) {
          const yy = r.ym.slice(0, 4);
          const c = m.get(yy) ?? { rev: 0, margin: 0, rentals: 0 };
          c.rev += r.sales_rev; c.margin += r.sales_rev - r.sales_cost; c.rentals += r.rental_rev;
          m.set(yy, c);
        }
        const data = [...m.entries()].sort().map(([yr, v]) => ({ period: yr, revenue: Math.round(v.rev), margin: Math.round(v.margin), rentals: Math.round(v.rentals) }));
        return { title: "Revenue by year", chartType: "line", rows: data.map((d) => ({ label: d.period, value: d.revenue })), data };
      }
      const data = filtered.map((r) => ({ period: r.ym, revenue: Math.round(r.sales_rev), margin: Math.round(r.sales_rev - r.sales_cost), rentals: Math.round(r.rental_rev) }));
      return { title: y ? `Monthly revenue in ${y}` : "Monthly revenue", chartType: "line", rows: data.map((d) => ({ label: d.period, value: d.revenue })), data };
    },
  },
  {
    name: "top_products",
    description: "Top (or bottom) products by units sold, revenue, or margin. Use for best/worst sellers, what earns the most.",
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string", enum: ["units", "revenue", "margin"] },
        year: { type: "integer", description: "optional single year" },
        limit: { type: "integer", description: "how many to return (default 8)" },
        ascending: { type: "boolean", description: "true for worst/lowest instead of best" },
      },
      required: ["metric"],
    },
    run: async (a) => {
      const metric = (a.metric as string) || "revenue";
      const limit = Math.min(20, (a.limit as number) || 8);
      const year = a.year as number | undefined;
      const rows = year
        ? await adminSelect<any[]>(`v_mgmt_product_year?select=name,category,units,revenue,margin${yearFilter("yr", year)}`)
        : await adminSelect<any[]>("v_mgmt_product?select=name,category,units,revenue,margin");
      // aggregate (product_year has per-year rows; all-time is one row per product)
      const agg = new Map<string, any>();
      for (const r of rows) {
        const c = agg.get(r.name) ?? { name: r.name, category: r.category, units: 0, revenue: 0, margin: 0 };
        c.units += r.units; c.revenue += r.revenue; c.margin += r.margin; agg.set(r.name, c);
      }
      const sorted = [...agg.values()].sort((x, y2) => (a.ascending ? x[metric] - y2[metric] : y2[metric] - x[metric])).slice(0, limit);
      const data = sorted.map((r) => ({ product: r.name, category: r.category, units: Math.round(r.units), revenue: Math.round(r.revenue), margin: Math.round(r.margin) }));
      return { title: `${a.ascending ? "Lowest" : "Top"} products by ${metric}${year ? " in " + year : ""}`, chartType: "bar", rows: data.map((d) => ({ label: d.product, value: (d as any)[metric] })), data };
    },
  },
  {
    name: "category_breakdown",
    description: "Revenue and margin by product category (Snorkel & Dive, Surfing, etc.).",
    parameters: { type: "object", properties: { year: { type: "integer" } }, required: [] },
    run: async (a) => {
      const year = a.year as number | undefined;
      const rows = year
        ? await adminSelect<any[]>(`v_mgmt_product_year?select=category,revenue,margin${yearFilter("yr", year)}`)
        : await adminSelect<any[]>("v_mgmt_category?select=category,revenue,margin");
      const agg = new Map<string, any>();
      for (const r of rows) {
        const c = agg.get(r.category) ?? { category: r.category, revenue: 0, margin: 0 };
        c.revenue += r.revenue; c.margin += r.margin; agg.set(r.category, c);
      }
      const data = [...agg.values()].sort((x, y2) => y2.revenue - x.revenue).map((r) => ({ category: r.category, revenue: Math.round(r.revenue), margin: Math.round(r.margin) }));
      return { title: `Category revenue${year ? " in " + year : ""}`, chartType: "bar", rows: data.map((d) => ({ label: d.category, value: d.revenue })), data };
    },
  },
  {
    name: "customer_type_spend",
    description: "Spend, orders and count by customer TYPE (Local, Tourist, Shipping). Use for 'which kind of customer spends the most'. Never returns individual customers.",
    parameters: { type: "object", properties: { year: { type: "integer" } }, required: [] },
    run: async (a) => {
      const year = a.year as number | undefined;
      const rows = year
        ? await adminSelect<any[]>(`v_mgmt_customer_year?select=type,customers,orders,revenue${yearFilter("yr", year)}`)
        : await adminSelect<any[]>("v_mgmt_customer_type?select=type,customers,orders,revenue");
      const data = rows.map((r) => ({ type: r.type, customers: r.customers, orders: r.orders, revenue: Math.round(r.revenue) })).sort((x, y2) => y2.revenue - x.revenue);
      return { title: `Revenue by customer type${year ? " in " + year : ""}`, chartType: "bar", rows: data.map((d) => ({ label: d.type, value: d.revenue })), data };
    },
  },
  {
    name: "sales_vs_rentals",
    description: "Compare sales revenue against rental revenue, overall or for a year.",
    parameters: { type: "object", properties: { year: { type: "integer" } }, required: [] },
    run: async (a) => {
      const year = a.year as number | undefined;
      const rows = await adminSelect<{ ym: string; sales_rev: number; rental_rev: number }[]>("v_mgmt_monthly?select=ym,sales_rev,rental_rev");
      const f = rows.filter((r) => !year || r.ym.startsWith(String(year)));
      const sales = Math.round(f.reduce((s, r) => s + r.sales_rev, 0));
      const rentals = Math.round(f.reduce((s, r) => s + r.rental_rev, 0));
      const data = [{ kind: "Sales", revenue: sales }, { kind: "Rentals", revenue: rentals }];
      return { title: `Sales vs rentals${year ? " in " + year : ""}`, chartType: "bar", rows: data.map((d) => ({ label: d.kind, value: d.revenue })), data };
    },
  },
  {
    name: "products_bought_together",
    description: "Pairs of products that are most often bought in the same order (market basket). Use for 'what sells together'.",
    parameters: { type: "object", properties: { limit: { type: "integer" } }, required: [] },
    run: async (a) => {
      const limit = Math.min(15, (a.limit as number) || 8);
      const pairs = await adminSelect<{ p1: string; p2: string; together: number }[]>(`v_mgmt_basket?select=p1,p2,together&order=together.desc&limit=${limit}`);
      const products = await getAllProducts();
      const name = new Map(products.map((p) => [p.sku, p.name]));
      const data = pairs.map((p) => ({ pair: `${name.get(p.p1) ?? p.p1} + ${name.get(p.p2) ?? p.p2}`, orders: p.together }));
      return { title: "Most often bought together", chartType: "bar", rows: data.map((d) => ({ label: d.pair, value: d.orders })), data };
    },
  },
  {
    name: "inventory_to_reorder",
    description: "Products at or below their reorder point (running low). Use for 'what should I restock / reorder'.",
    parameters: { type: "object", properties: {}, required: [] },
    run: async () => {
      const rows = await adminSelect<{ name: string; category: string; on_hand: number; demand_365: number }[]>("v_mgmt_inventory?select=name,category,on_hand,demand_365");
      const LEAD = 14, Z = 1.65;
      const scored = rows.map((r) => {
        const daily = r.demand_365 / 365;
        const rop = Math.round(daily * LEAD + Z * Math.sqrt(LEAD * Math.max(daily, 0)));
        return { product: r.name, category: r.category, on_hand: r.on_hand, reorder_at: rop, days_left: daily > 0 ? Math.round(r.on_hand / daily) : null, needs: r.on_hand <= rop };
      }).filter((r) => r.needs).sort((x, y) => (x.days_left ?? 999) - (y.days_left ?? 999));
      return { title: "Products to reorder", chartType: "bar", rows: scored.map((d) => ({ label: d.product, value: d.on_hand })), data: scored };
    },
  },
];

export const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

-- Part C: inventory table (family-level) + demand/inventory views for reorder view.
create table if not exists public."Inventory" (
  sku          text primary key references public.products(sku),
  on_hand      integer,
  rental_units integer
);
alter table public."Inventory" enable row level security;

-- Units demanded (sales + rentals) in the trailing 365 days of data, per family.
create or replace view public.v_mgmt_demand with (security_invoker=true) as
with span as (select max("OrderDate") md from public."Orders"),
sale as (
  select l."ProductCode" sku, sum(l."Quantity") units
  from public."OrderLines" l join public."Orders" o on o."OrderID"=l."OrderID", span
  where o."OrderDate" > span.md - interval '365 days' group by 1),
rent as (
  select r."SKU" sku, sum(r."Quantity") units
  from public."RentalTransactions" r, span
  where r."RentalDate" > span.md - interval '365 days' group by 1)
select p.sku, p.name, p.category,
       coalesce(sale.units,0) as sale_units_365,
       coalesce(rent.units,0) as rental_units_365
from public.products p
left join sale on sale.sku=p.sku
left join rent on rent.sku=p.sku;

-- Inventory joined with demand (reorder point is computed in the app).
create or replace view public.v_mgmt_inventory with (security_invoker=true) as
select p.sku, p.name, p.category,
       coalesce(i.on_hand,0)      as on_hand,
       coalesce(i.rental_units,0) as rental_units,
       coalesce(d.sale_units_365,0) + coalesce(d.rental_units_365,0) as demand_365
from public.products p
left join public."Inventory" i on i.sku=p.sku
left join public.v_mgmt_demand d on d.sku=p.sku;

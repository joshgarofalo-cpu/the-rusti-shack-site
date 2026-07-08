-- Part C: analytics views for the back office.
-- security_invoker=true => they respect base-table RLS, so the public/anon key
-- sees nothing; only the server (service role) can read them.

-- All-time headline totals (single row)
create or replace view public.v_mgmt_totals with (security_invoker=true) as
select
  (select count(*) from public."Orders")                                             as orders,
  (select coalesce(sum("OrderTotal"),0) from public."Orders")                         as sales_revenue,
  (select coalesce(sum("LineRevenue"),0) from public."OrderLines")                    as line_revenue,
  (select coalesce(sum("LineRevenue")-sum("LineCost"),0) from public."OrderLines")    as sales_margin,
  (select coalesce(sum("RentalRevenue"),0) from public."RentalTransactions")          as rental_revenue,
  (select count(*) from public."Customers_Core")                                      as customers;

-- Monthly sales + rentals (seasonality, trend, forecast)
create or replace view public.v_mgmt_monthly with (security_invoker=true) as
with s as (
  select to_char(o."OrderDate",'YYYY-MM') ym,
         sum(l."LineRevenue") sales_rev, sum(l."LineCost") sales_cost, sum(l."Quantity") sales_units,
         count(distinct o."OrderID") orders
  from public."OrderLines" l join public."Orders" o on o."OrderID"=l."OrderID"
  where o."OrderDate" is not null group by 1),
r as (
  select to_char("RentalDate",'YYYY-MM') ym, sum("RentalRevenue") rental_rev, sum("Quantity") rental_units
  from public."RentalTransactions" where "RentalDate" is not null group by 1)
select coalesce(s.ym,r.ym) ym,
       coalesce(s.sales_rev,0) sales_rev, coalesce(s.sales_cost,0) sales_cost,
       coalesce(s.sales_units,0) sales_units, coalesce(s.orders,0) orders,
       coalesce(r.rental_rev,0) rental_rev, coalesce(r.rental_units,0) rental_units
from s full outer join r on s.ym=r.ym;

-- Per-product-family sales performance + margin
create or replace view public.v_mgmt_product with (security_invoker=true) as
select l."ProductCode" sku, coalesce(p.name,l."ProductCode") name, coalesce(p.category,'Unknown') category,
       sum(l."Quantity") units, sum(l."LineRevenue") revenue, sum(l."LineCost") cost,
       sum(l."LineRevenue")-sum(l."LineCost") margin
from public."OrderLines" l left join public.products p on p.sku=l."ProductCode"
group by 1,2,3;

-- Per-category performance
create or replace view public.v_mgmt_category with (security_invoker=true) as
select coalesce(p.category,'Unknown') category,
       sum(l."Quantity") units, sum(l."LineRevenue") revenue, sum(l."LineCost") cost,
       sum(l."LineRevenue")-sum(l."LineCost") margin
from public."OrderLines" l left join public.products p on p.sku=l."ProductCode"
group by 1;

-- Rentals per product family
create or replace view public.v_mgmt_rental_product with (security_invoker=true) as
select r."SKU" sku, coalesce(p.name,r."SKU") name, coalesce(p.category,'Unknown') category,
       sum(r."Quantity") units, sum(r."RentalRevenue") revenue
from public."RentalTransactions" r left join public.products p on p.sku=r."SKU"
group by 1,2,3;

-- Customer mix by type
create or replace view public.v_mgmt_customer_type with (security_invoker=true) as
select c."CustomerType" type, count(distinct c."CustomerID") customers,
       count(o."OrderID") orders, coalesce(sum(o."OrderTotal"),0) revenue
from public."Customers_Core" c left join public."Orders" o on o."CustID"=c."CustomerID"
group by 1;

-- One row per item sold, joined for the "Download sales (CSV)" export
create or replace view public.v_mgmt_sales_export with (security_invoker=true) as
select l."OrderID", o."OrderDate", c."FirstName", c."LastName", c."Country",
       l."ProductCode", coalesce(p.name, l."ProductCode") as "ProductName",
       l."Quantity", l."UnitPrice", l."LineRevenue",
       o."ShippingFee", o."OrderTotal", o."PaymentMethod"
from public."OrderLines" l
join public."Orders" o on o."OrderID" = l."OrderID"
left join public."Customers_Core" c on c."CustomerID" = o."CustID"
left join public.products p on p.sku = l."ProductCode";

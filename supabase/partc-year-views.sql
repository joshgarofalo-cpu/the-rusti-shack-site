-- Part C: year-tagged breakdowns so a single page-wide year slicer can filter
-- product margins, categories, and customer mix (not just the time series).
create or replace view public.v_mgmt_product_year with (security_invoker=true) as
select extract(year from o."OrderDate")::int as yr, l."ProductCode" as sku,
       coalesce(p.name, l."ProductCode") as name, coalesce(p.category,'Unknown') as category,
       sum(l."Quantity") as units, sum(l."LineRevenue") as revenue,
       sum(l."LineCost") as cost, sum(l."LineRevenue") - sum(l."LineCost") as margin
from public."OrderLines" l
join public."Orders" o on o."OrderID" = l."OrderID"
left join public.products p on p.sku = l."ProductCode"
where o."OrderDate" is not null
group by 1,2,3,4;

create or replace view public.v_mgmt_customer_year with (security_invoker=true) as
select extract(year from o."OrderDate")::int as yr, c."CustomerType" as type,
       count(distinct c."CustomerID") as customers, count(o."OrderID") as orders,
       sum(o."OrderTotal") as revenue
from public."Orders" o
join public."Customers_Core" c on c."CustomerID" = o."CustID"
where o."OrderDate" is not null
group by 1,2;

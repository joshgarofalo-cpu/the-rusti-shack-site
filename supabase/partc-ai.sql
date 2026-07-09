-- Part D: assistant support — market-basket view + daily usage cap table.
create or replace view public.v_mgmt_basket with (security_invoker=true) as
select a."ProductCode" as p1, b."ProductCode" as p2, count(*) as together
from public."OrderLines" a
join public."OrderLines" b
  on a."OrderID" = b."OrderID" and a."ProductCode" < b."ProductCode"
group by 1,2;

create table if not exists public.ai_usage (
  day   date primary key,
  count integer not null default 0
);
alter table public.ai_usage enable row level security;

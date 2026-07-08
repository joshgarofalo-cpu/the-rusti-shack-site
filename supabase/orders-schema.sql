-- The Rusti Shack — customer & order tables (empty containers)
-- Run once in the Supabase SQL Editor. Creates the four tables that mirror
-- Rusti's sheets. They stay empty until the website records a sale (steps 6.6/6.7).
--
-- Names/columns are kept in Rusti's exact casing (quoted identifiers).
-- RLS is enabled with NO public policy: these hold customer PII (emails,
-- phones, addresses), so the anon/publishable key can neither read nor write
-- them. The website will write orders server-side with a service role later.

-- Who the customer is
create table if not exists public."Customers_Core" (
  "CustomerID"   text primary key,
  "FirstName"    text,
  "LastName"     text,
  "CustomerType" text,
  "JoinDate"     date,
  "City"         text,
  "Country"      text
);

-- How to reach them — plus the new street-address columns
create table if not exists public."Customers_Contact" (
  "CustomerID"    text primary key references public."Customers_Core" ("CustomerID"),
  "Email"         text,
  "Phone"         text,
  "LoyaltyMember" text,
  "StreetAddress" text,
  "Region"        text,
  "PostalCode"    text
);

-- One row per order
create table if not exists public."Orders" (
  "OrderID"        text primary key,
  "OrderDate"      date,
  "CustID"         text references public."Customers_Core" ("CustomerID"),
  "LocationID"     text,
  "SalesAssociate" text,
  "Channel"        text,
  "ShippingFee"    numeric,
  "OrderTotal"     numeric,
  "PaymentMethod"  text
);

-- One row per item within an order
create table if not exists public."OrderLines" (
  "OrderID"                 text references public."Orders" ("OrderID"),
  "LineNumber"              integer,
  "ProductCode"            text references public.products (sku),
  "Quantity"               integer,
  "UnitPrice"              numeric,
  "DiscountPct"            numeric,
  "LineRevenue"            numeric,
  "LineCost"               numeric,
  "EffectiveDiscountAmount" numeric,
  primary key ("OrderID", "LineNumber")
);

-- Lock the PII tables down (RLS on, no anon policy = not exposed publicly)
alter table public."Customers_Core"    enable row level security;
alter table public."Customers_Contact" enable row level security;
alter table public."Orders"            enable row level security;
alter table public."OrderLines"        enable row level security;

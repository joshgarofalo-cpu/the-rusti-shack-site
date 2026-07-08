-- Part C: rentals + dimension tables for the back office.
-- RLS-locked (no public policy) — only the server (service role) reads them.

create table if not exists public."Stores" (
  "LocationCode" text primary key,
  "LocationName" text,
  "StoreType"    text,
  "Country"      text
);

create table if not exists public."Employees" (
  "EmpID"     text primary key,
  "FirstName" text,
  "LastName"  text,
  "Role"      text,
  "HireDate"  date,
  "HomeStore" text
);

create table if not exists public."Customers_Demographics" (
  "CustomerID" text primary key references public."Customers_Core"("CustomerID"),
  "Gender"     text,
  "Occupation" text
);

create table if not exists public."RentalTransactions" (
  "RentalID"       text primary key,
  "RentalDate"     date,
  "CustID"         text,
  "LocationID"     text,
  "SalesAssociate" text,
  "SKU"            text,        -- mapped to product family (products.sku)
  "Quantity"       integer,
  "DailyRate"      numeric,
  "RentalRevenue"  numeric,
  "Returned"       text
);

alter table public."Stores"                 enable row level security;
alter table public."Employees"              enable row level security;
alter table public."Customers_Demographics" enable row level security;
alter table public."RentalTransactions"     enable row level security;

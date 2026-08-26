create table public.shops (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null unique,
  api_key text,
  sync_status text not null default 'idle' check (sync_status in ('idle', 'syncing', 'synced', 'error')),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null,
  sku text not null,
  price numeric(10,2) not null default 0,
  conversion_rate numeric(5,2) not null default 0,
  views integer not null default 0,
  favorites integer not null default 0,
  listing_quality_score integer not null default 0 check (listing_quality_score between 0 and 100),
  category text not null default 'Templates',
  stock_status text not null default 'active' check (stock_status in ('active', 'draft', 'sold_out', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  order_id text not null,
  customer_name text not null,
  product_id uuid references public.products(id) on delete set null,
  gross_amount numeric(10,2) not null default 0,
  net_amount numeric(10,2) not null default 0,
  etsy_fees numeric(10,2) not null default 0,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  ad_spend numeric(10,2) not null default 0,
  listing_fees numeric(10,2) not null default 0,
  offsite_ad_fees numeric(10,2) not null default 0,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index idx_products_shop on public.products(shop_id);
create index idx_orders_shop_date on public.orders(shop_id, date desc);
create index idx_expenses_shop_date on public.expenses(shop_id, date desc);

grant select, insert, update, delete on public.shops to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update, delete on public.orders to anon, authenticated;
grant select, insert, update, delete on public.expenses to anon, authenticated;
grant all on public.shops to service_role;
grant all on public.products to service_role;
grant all on public.orders to service_role;
grant all on public.expenses to service_role;

alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.expenses enable row level security;

create policy "Public shops access" on public.shops for all to anon, authenticated using (true) with check (true);
create policy "Public products access" on public.products for all to anon, authenticated using (true) with check (true);
create policy "Public orders access" on public.orders for all to anon, authenticated using (true) with check (true);
create policy "Public expenses access" on public.expenses for all to anon, authenticated using (true) with check (true);

insert into public.shops (shop_name, sync_status) values
  ('LogicGridStore', 'synced'),
  ('DigitalHubStudio', 'synced');

insert into public.products (shop_id, title, sku, price, conversion_rate, views, favorites, listing_quality_score, category, stock_status)
select s.id, t.title, t.sku, t.price, t.conv, t.views, t.favs, t.score, t.cat, t.stock
from public.shops s
join (values
  ('Notion Freelancer OS Template', 'LG-001', 49.00, 4.20, 12480, 931, 92, 'Templates', 'active'),
  ('Excel Budget Planner Pro', 'LG-002', 19.00, 5.10, 18930, 1204, 88, 'Spreadsheets', 'active'),
  ('Google Sheets Invoice Pack', 'LG-003', 15.00, 3.80, 9420, 512, 76, 'Spreadsheets', 'active'),
  ('Digital Product Launch Checklist', 'LG-004', 12.00, 6.40, 7200, 488, 81, 'Guides', 'active'),
  ('Airtable CRM Starter Kit', 'LG-005', 39.00, 2.90, 6110, 377, 73, 'Templates', 'active'),
  ('Printable Wall Art Bundle', 'LG-006', 9.00, 7.20, 15340, 2102, 69, 'Printables', 'sold_out'),
  ('SEO Keyword Research Sheet', 'LG-007', 24.00, 3.10, 5540, 301, 64, 'Spreadsheets', 'active'),
  ('Canva Media Kit Templates', 'LG-008', 29.00, 4.60, 8870, 690, 84, 'Graphics', 'active')
) as t(title, sku, price, conv, views, favs, score, cat, stock) on s.shop_name = 'LogicGridStore';

insert into public.products (shop_id, title, sku, price, conversion_rate, views, favorites, listing_quality_score, category, stock_status)
select s.id, t.title, t.sku, t.price, t.conv, t.views, t.favs, t.score, t.cat, t.stock
from public.shops s
join (values
  ('Procreate Brush Mega Pack', 'DH-001', 22.00, 5.90, 21450, 1840, 90, 'Graphics', 'active'),
  ('Wedding Planner Printable Suite', 'DH-002', 34.00, 4.10, 13220, 1105, 86, 'Printables', 'active'),
  ('Social Media Content Calendar', 'DH-003', 18.00, 4.80, 10680, 742, 79, 'Templates', 'active'),
  ('Lightroom Preset Collection', 'DH-004', 27.00, 3.40, 9310, 655, 71, 'Photography', 'active'),
  ('Etsy Shop Banner Bundle', 'DH-005', 14.00, 6.10, 7740, 590, 77, 'Graphics', 'active'),
  ('Resume Template Pack', 'DH-006', 16.00, 5.50, 16890, 1320, 85, 'Templates', 'active'),
  ('Kids Activity Printable Pack', 'DH-007', 11.00, 6.80, 12430, 1012, 74, 'Printables', 'active'),
  ('Font Duo - Modern Serif', 'DH-008', 21.00, 2.60, 4120, 288, 58, 'Graphics', 'draft')
) as t(title, sku, price, conv, views, favs, score, cat, stock) on s.shop_name = 'DigitalHubStudio';

insert into public.orders (shop_id, order_id, customer_name, product_id, gross_amount, etsy_fees, net_amount, date)
with params as (
  select p.id as product_id, p.shop_id, p.price,
         greatest(0.4, p.conversion_rate / 3.0) as daily_lambda
  from public.products p
),
expanded as (
  select pr.*, (current_date - g.off) as order_date
  from params pr
  cross join generate_series(0, 119) g(off)
),
mult as (
  select e.*, n.ord
  from expanded e
  cross join lateral generate_series(
    1,
    case when (abs(hashtext(e.product_id::text || e.order_date::text)) % 100) < (e.daily_lambda * 22)::int
         then 1 + (abs(hashtext(e.order_date::text || e.product_id::text)) % 2)
         else 0 end
  ) n(ord)
)
select m.shop_id,
       'ETSY-' || to_char(m.order_date, 'YYMMDD') || '-' || lpad(((row_number() over (order by m.order_date)) % 997)::text, 3, '0'),
       (array['Emma Wilson','Liam Carter','Sophia Reyes','Noah Bennett','Ava Thompson','Mason Clark','Isabella Rossi','Lucas Meyer','Mia Kowalski','Ethan Novak','Olivia Laurent','James Okafor','Charlotte Dubois','Henry Walsh','Amelia Sato','Daniel Costa','Harper Lin','Jack Moreau','Ella Fischer','Owen Petrov'])[1 + (abs(hashtext(m.order_date::text || m.ord::text || m.product_id::text)) % 20)],
       m.product_id,
       round(m.price * (0.9 + (abs(hashtext(m.product_id::text || m.ord::text || m.order_date::text)) % 25) / 100.0), 2),
       0,
       0,
       m.order_date
from mult m;

update public.orders
set etsy_fees = round(gross_amount * 0.095 + 0.45, 2),
    net_amount = round(gross_amount - (gross_amount * 0.095 + 0.45), 2);

insert into public.expenses (shop_id, ad_spend, listing_fees, offsite_ad_fees, date)
select s.id,
       round((8 + (abs(hashtext(s.id::text || d::text)) % 1800) / 100.0)::numeric, 2),
       round((0.20 * (1 + (abs(hashtext(d::text || s.id::text)) % 6)))::numeric, 2),
       round(case when (abs(hashtext(s.id::text || d::text || 'off')) % 100) < 35
                  then (2 + (abs(hashtext(d::text || 'x' || s.id::text)) % 900) / 100.0)
                  else 0 end::numeric, 2),
       d::date
from public.shops s
cross join (select (current_date - g.off)::text as d from generate_series(0, 119) g(off)) days(d);
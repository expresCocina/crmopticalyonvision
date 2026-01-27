-- ==============================================================================
-- SCHEMA: CRM ÓPTICA LYON VISIÓN
-- STRICT SINGLE-TENANT
-- ==============================================================================

-- 1. ENUMS (Tipos de datos personalizados)
create type user_role as enum ('admin', 'vendedor', 'atencion', 'lectura');
create type lead_status as enum ('nuevo', 'interesado', 'cotizado', 'agendado', 'no_responde', 'no_compro', 'cliente', 'recurrente');
create type channel_source as enum ('whatsapp', 'meta_ads', 'google_ads', 'tiktok_ads', 'web', 'qr_tienda');
create type msg_direction as enum ('inbound', 'outbound');
create type appointment_status as enum ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_asistio');
create type currency_code as enum ('COP', 'USD', 'MXN');
create type message_status as enum ('sent', 'delivered', 'read', 'failed');
create type order_status as enum ('pendiente', 'en_estudio', 'en_entrega', 'entregada');

-- 2. TABLES

-- PROFILES: Usuarios del sistema (Staff)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role user_role default 'vendedor',
  email text,
  active boolean default true,
  created_at timestamptz default now()
);

-- LEADS: Clientes potenciales y actuales
create table leads (
  id uuid default gen_random_uuid() primary key,
  wa_id text unique not null, -- WhatsApp ID (e.g. 52155...)
  full_name text,
  status lead_status default 'nuevo',
  source channel_source default 'whatsapp',
  campaign_id text, -- UTM param o ID de campaña ad
  assigned_to uuid references profiles(id),
  tags text[], -- Array de etiquetas (e.g. ['examen', 'lentes', 'promo'])
  notes text,
  last_interaction timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MESSAGES: Historial de Chat
create table messages (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade,
  wa_message_id text unique, -- ID mensaje de META
  content text,
  type text default 'text', -- text, image, document, location
  direction msg_direction not null,
  status message_status default 'sent', -- ENUM
  created_at timestamptz default now()
);

-- APPOINTMENTS: Agenda de Citas
create table appointments (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade,
  doctor_id uuid references profiles(id), -- Si aplica, o null
  scheduled_at timestamptz not null,
  status appointment_status default 'pendiente',
  reason text, -- 'Examen visual', 'Ajuste', etc.
  notes text,
  created_at timestamptz default now()
);

-- CLINICAL_RECORDS: Historia Clínica Básica
create table clinical_records (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade,
  optometrist_id uuid references profiles(id),
  description text,
  rx_data jsonb, -- Estructura flexible para esfera, cilindro, eje, etc.
                 -- { "od": { "sph": -1.5, "cyl": -0.5, "axis": 90 }, "oi": ... }
  diagnosis text,
  recommendations text,
  created_at timestamptz default now()
);

-- PURCHASES: Ventas y Post-venta
create table purchases (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id),
  product_summary text, -- 'Lentes Transitions + Montura RayBan'
  amount numeric not null,
  currency currency_code default 'COP', -- ENUM
  status text default 'paid', -- paid, pending, refunded
  order_status order_status default 'pendiente', -- Order workflow status
  delivery_notes text, -- Notes about delivery
  delivered_at timestamptz, -- Timestamp when marked as delivered
  delivery_date date,
  is_delivered boolean default false,
  created_at timestamptz default now()
);

-- AUTOMATIONS: Configuración de reglas
create table automations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  trigger_type text not null, -- 'status_change', 'no_reply_time'
  trigger_value text, -- 'cotizado' (val) o '3 days' (time)
  action_type text not null, -- 'send_message', 'notify_staff'
  action_payload jsonb, -- { "message": "Hola, sigues interesado?" }
  active boolean default true,
  created_at timestamptz default now()
);

-- AUTOMATION LOGS: Auditoría
create table automation_logs (
  id uuid default gen_random_uuid() primary key,
  automation_id uuid references automations(id),
  lead_id uuid references leads(id),
  status text, -- 'success', 'failed'
  error_message text,
  executed_at timestamptz default now()
);

-- 3. INDEXES (Performance)
create index idx_leads_wa_id on leads(wa_id);
create index idx_leads_assigned_to on leads(assigned_to);
create index idx_leads_status on leads(status);
create index idx_messages_lead_id on messages(lead_id);
create index idx_messages_wa_msg_id on messages(wa_message_id);
create index idx_appointments_lead_id on appointments(lead_id);
create index idx_appointments_date on appointments(scheduled_at);
create index idx_purchases_lead_id on purchases(lead_id);

-- 4. VIEWS (Marketing & Audiencias)

create view audience_no_compra as
select wa_id, full_name, status, last_interaction 
from leads 
where status in ('no_responde','no_compro', 'cotizado');

create view audience_clientes as
select wa_id, full_name, status, created_at 
from leads 
where status in ('cliente','recurrente');

create view kpi_daily_sales as
select 
  date_trunc('day', created_at) as day, 
  sum(amount) as total_sales,
  count(*) as count_sales
from purchases
group by 1;

-- 5. ROW LEVEL SECURITY (RLS) policies

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table leads enable row level security;
alter table messages enable row level security;
alter table appointments enable row level security;
alter table clinical_records enable row level security;
alter table purchases enable row level security;
alter table automations enable row level security;
alter table automation_logs enable row level security;

-- Function helper to get current user role
create or replace function get_my_role()
returns user_role as $$
  select role from profiles where id = auth.uid() limit 1;
$$ language sql security definer;

-- POLICIES

-- PROFILES
create policy "Admin manages profiles" on profiles for all using ( get_my_role() = 'admin' );
create policy "Users view own profile" on profiles for select using ( auth.uid() = id );
create policy "Staff can view other profiles" on profiles for select using ( get_my_role() in ('vendedor', 'atencion') );

-- LEADS
create policy "Admin all leads" on leads for all using ( get_my_role() = 'admin' );
create policy "Vendedor view assigned leads" on leads
  for select using ( get_my_role() = 'vendedor' and assigned_to = auth.uid() or assigned_to is null );
create policy "Vendedor update assigned leads" on leads
  for update using ( get_my_role() = 'vendedor' and assigned_to = auth.uid() );
create policy "Vendedor insert new leads" on leads for insert with check ( get_my_role() = 'vendedor' );
create policy "Atencion view all leads" on leads for select using ( get_my_role() = 'atencion' );
create policy "Atencion update leads" on leads for update using ( get_my_role() = 'atencion' );
create policy "Lectura view leads" on leads for select using ( get_my_role() = 'lectura' );

-- MESSAGES
create policy "Admin all messages" on messages for all using ( get_my_role() = 'admin' );
create policy "Vendedor view messages" on messages
  for select using ( exists (select 1 from leads where leads.id = messages.lead_id and leads.assigned_to = auth.uid()) );
create policy "Vendedor insert messages" on messages
  for insert with check ( exists (select 1 from leads where leads.id = messages.lead_id and leads.assigned_to = auth.uid()) );
create policy "Atencion all messages" on messages for select using ( get_my_role() = 'atencion' );
create policy "Atencion reply messages" on messages for insert with check ( get_my_role() = 'atencion' );
create policy "Lectura read messages" on messages for select using ( get_my_role() = 'lectura' );

-- APPOINTMENTS, CLINICAL, PURCHASES, AUTOMATIONS
create policy "Admin all records" on appointments for all using ( get_my_role() = 'admin' );
create policy "Admin all records2" on clinical_records for all using ( get_my_role() = 'admin' );
create policy "Admin all records3" on purchases for all using ( get_my_role() = 'admin' );
create policy "Admin all records4" on automations for all using ( get_my_role() = 'admin' );
create policy "Admin all records5" on automation_logs for all using ( get_my_role() = 'admin' );

create policy "Vendedor view clinical" on clinical_records
  for select using ( exists (select 1 from leads where leads.id = clinical_records.lead_id and leads.assigned_to = auth.uid()) );
create policy "Vendedor edit clinical" on clinical_records
  for insert with check ( exists (select 1 from leads where leads.id = clinical_records.lead_id and leads.assigned_to = auth.uid()) );

create policy "Staff view purchases" on purchases for select using ( get_my_role() in ('vendedor', 'atencion') );

-- 6. TRIGGERS
create extension if not exists moddatetime;

create trigger handle_updated_at_leads
  before update on leads
  for each row execute procedure moddatetime (updated_at);

create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, 'vendedor'); 
  return new;
end;
$$ language plpgsql security definer;

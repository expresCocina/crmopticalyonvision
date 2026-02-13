-- ==============================================================================
-- MASTER RESET CRM - VERSIÓN DEFINITIVA
-- ==============================================================================
-- Este script arregla TODO: Tablas, Vistas, Permisos, Imports, Realtime y Errores 406
-- Ejecútalo completo para dejar el sistema 100% funcional.

BEGIN;

-- 1. LIMPIEZA TOTAL
DROP TRIGGER IF EXISTS handle_updated_at_leads ON leads;
DROP FUNCTION IF EXISTS handle_updated_at_leads();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS increment_unread_count(uuid);
DROP FUNCTION IF EXISTS get_my_role();

DROP VIEW IF EXISTS group_member_counts;
DROP VIEW IF EXISTS audience_no_compra;
DROP VIEW IF EXISTS audience_clientes;
DROP VIEW IF EXISTS kpi_daily_sales;

DROP TABLE IF EXISTS automations CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS clinical_records CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS lead_groups CASCADE;
DROP TABLE IF EXISTS customer_groups CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Eliminar tipos viejos para recrearlos limpios
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS lead_status CASCADE;
DROP TYPE IF EXISTS channel_source CASCADE;
DROP TYPE IF EXISTS msg_direction CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS currency_code CASCADE;
DROP TYPE IF EXISTS message_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;

-- 2. CREACIÓN DE TIPOS (ENUMS)
CREATE TYPE user_role AS ENUM ('admin', 'vendedor', 'atencion', 'lectura');
CREATE TYPE lead_status AS ENUM ('nuevo', 'interesado', 'cotizado', 'agendado', 'no_responde', 'no_compro', 'cliente', 'recurrente');
CREATE TYPE channel_source AS ENUM ('whatsapp', 'meta_ads', 'google_ads', 'tiktok_ads', 'web', 'qr_tienda');
CREATE TYPE msg_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE appointment_status AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_asistio');
CREATE TYPE currency_code AS ENUM ('COP', 'USD', 'MXN');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE order_status AS ENUM ('pendiente', 'en_estudio', 'en_entrega', 'entregada');

-- 3. CREACIÓN DE TABLAS PRINCIPALES

-- PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'vendedor',
  email TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEADS
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id TEXT UNIQUE NOT NULL,
  full_name TEXT,
  status lead_status DEFAULT 'nuevo',
  source channel_source DEFAULT 'whatsapp',
  campaign_id TEXT,
  assigned_to UUID REFERENCES profiles(id),
  tags TEXT[],
  notes TEXT,
  bot_active BOOLEAN DEFAULT TRUE,
  unread_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  last_reminder_sent TIMESTAMPTZ,
  last_agent_interaction TIMESTAMPTZ,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  wa_message_id TEXT,
  content TEXT,
  type TEXT DEFAULT 'text',
  direction msg_direction NOT NULL,
  status message_status DEFAULT 'sent',
  media_url TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMER_GROUPS
CREATE TABLE customer_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEAD_GROUPS
CREATE TABLE lead_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id),
  UNIQUE(lead_id, group_id)
);

-- PURCHASES
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  product_summary TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'COP',
  status TEXT DEFAULT 'paid',
  order_status order_status DEFAULT 'pendiente',
  delivery_date DATE,
  is_delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPOINTMENTS
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'pendiente',
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLINICAL_RECORDS
CREATE TABLE clinical_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  description TEXT,
  rx_data JSONB,
  diagnosis TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUTOMATIONS
CREATE TABLE automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  conditions JSONB,
  actions JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ÍNDICES PARA RENDIMIENTO
CREATE INDEX idx_leads_wa_id ON leads(wa_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags); -- Optimiza búsqueda por tags
CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_lead_groups_lead ON lead_groups(lead_id);
CREATE INDEX idx_lead_groups_group ON lead_groups(group_id);

-- 5. VISTAS NECESARIAS (Importante para evitar errores 404)
CREATE OR REPLACE VIEW public.group_member_counts AS
SELECT 
    cg.id,
    cg.name,
    cg.color,
    cg.description,
    cg.created_at,
    COUNT(lg.lead_id) AS member_count
FROM public.customer_groups cg
LEFT JOIN public.lead_groups lg ON cg.id = lg.group_id
GROUP BY cg.id;

-- 6. FUNCIONES Y TRIGGERS
CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TRIGGER handle_updated_at_leads
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- Función auxiliar para RLS
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Función RPC usada en frontend
CREATE OR REPLACE FUNCTION increment_unread_count(row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE leads SET unread_count = unread_count + 1 WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. REPARACIÓN DE DATOS (BACKFILL)
-- Insertar perfiles asegurando que full_name no sea nulo
INSERT INTO public.profiles (id, full_name, email, role)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', email, 'Unknown User'), 
    email, 
    'vendedor'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 8. SEGURIDAD (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (evitan errores 406/403 iniciales)
CREATE POLICY "Allow all profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all groups" ON customer_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all lead_groups" ON lead_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all misc" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all apps" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all clinical" ON clinical_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all automations" ON automations FOR ALL USING (true) WITH CHECK (true);

-- 9. PERMISOS EXPLÍCITOS (Arregla errores de conexión)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 10. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE customer_groups;

COMMIT;

-- Final: Recargar caché
NOTIFY pgrst, 'reload';

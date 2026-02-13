-- ============================================
-- RESTAURACIÓN COMPLETA DE BASE DE DATOS CRM
-- ============================================
-- Este script recrea TODA la estructura del CRM desde cero
-- ADVERTENCIA: Borrará todas las tablas existentes y sus datos

BEGIN;

-- ============================================
-- PASO 1: LIMPIAR TODO (DROP CASCADE)
-- ============================================

-- Eliminar tablas en orden inverso de dependencias
DROP TABLE IF EXISTS automations CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS clinical_records CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS lead_groups CASCADE;
DROP TABLE IF EXISTS customer_groups CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Eliminar tipos ENUM
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS lead_status CASCADE;
DROP TYPE IF EXISTS channel_source CASCADE;
DROP TYPE IF EXISTS msg_direction CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS currency_code CASCADE;
DROP TYPE IF EXISTS message_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;

-- ============================================
-- PASO 2: RECREAR ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'vendedor', 'atencion', 'lectura');
CREATE TYPE lead_status AS ENUM ('nuevo', 'interesado', 'cotizado', 'agendado', 'no_responde', 'no_compro', 'cliente', 'recurrente');
CREATE TYPE channel_source AS ENUM ('whatsapp', 'meta_ads', 'google_ads', 'tiktok_ads', 'web', 'qr_tienda');
CREATE TYPE msg_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE appointment_status AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_asistio');
CREATE TYPE currency_code AS ENUM ('COP', 'USD', 'MXN');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE order_status AS ENUM ('pendiente', 'en_estudio', 'en_entrega', 'entregada');

-- ============================================
-- PASO 3: RECREAR TABLAS
-- ============================================

-- PROFILES: Usuarios del sistema (Staff)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'vendedor',
  email TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEADS: Clientes potenciales y actuales
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

-- MESSAGES: Historial de Chat
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

-- CUSTOMER_GROUPS: Grupos de clientes
CREATE TABLE customer_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEAD_GROUPS: Relación muchos-a-muchos entre leads y grupos
CREATE TABLE lead_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id),
  UNIQUE(lead_id, group_id)
);

-- PURCHASES: Ventas
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

-- APPOINTMENTS: Citas
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'pendiente',
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLINICAL_RECORDS: Historia Clínica
CREATE TABLE clinical_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  description TEXT,
  rx_data JSONB,
  diagnosis TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUTOMATIONS: Automatizaciones
CREATE TABLE automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  conditions JSONB,
  actions JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PASO 4: CREAR ÍNDICES
-- ============================================

CREATE INDEX idx_leads_wa_id ON leads(wa_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_last_interaction ON leads(last_interaction DESC);
CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_lead_groups_lead ON lead_groups(lead_id);
CREATE INDEX idx_lead_groups_group ON lead_groups(group_id);
CREATE INDEX idx_appointments_lead ON appointments(lead_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);

-- ============================================
-- PASO 5: FUNCIONES Y TRIGGERS
-- ============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Trigger para updated_at en leads
CREATE TRIGGER handle_updated_at_leads
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- Función para manejar nuevos usuarios (Profile creation)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'vendedor')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para incrementar contador de no leídos
CREATE OR REPLACE FUNCTION increment_unread_count(row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE leads SET unread_count = unread_count + 1 WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PASO 6: BACKFILL DE PERFILES (CRÍTICO)
-- ============================================
-- Insertar perfiles para usuarios existentes en auth.users
INSERT INTO public.profiles (id, full_name, email, role)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', email, 'Usuario Sin Nombre'), 
    email, 
    'vendedor'
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- PASO 7: HABILITAR RLS (Row Level Security)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 8: POLÍTICAS RLS (Permisivas para empezar)
-- ============================================

-- Profiles
CREATE POLICY "Allow all for authenticated users" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leads
CREATE POLICY "Allow all for authenticated users" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Messages
CREATE POLICY "Allow all for authenticated users" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Groups
CREATE POLICY "Allow all for authenticated users" ON customer_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lead Groups
CREATE POLICY "Allow all for authenticated users" ON lead_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchases
CREATE POLICY "Allow all for authenticated users" ON purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointments
CREATE POLICY "Allow all for authenticated users" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clinical Records
CREATE POLICY "Allow all for authenticated users" ON clinical_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Automations
CREATE POLICY "Allow all for authenticated users" ON automations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- PASO 7: HABILITAR REALTIME
-- ============================================

-- Habilitar Realtime en tablas críticas para actualizaciones en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;

COMMIT;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'leads', 'messages', 'customer_groups', 'lead_groups', 'purchases', 'appointments', 'clinical_records', 'automations')
ORDER BY table_name;

-- Forzar recarga del esquema en PostgREST
NOTIFY pgrst, 'reload';

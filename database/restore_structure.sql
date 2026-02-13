-- =====================================================
-- REPARACIÓN DE ESTRUCTURA CRM (RESTORE SCRIPT)
-- =====================================================
-- Objetivo: Re-crear tablas faltantes para que el Frontend no falle.
-- NO BORRA 'leads' ni 'messages'. Solo agrega lo que falta.

BEGIN;

-- 1. TABLA: customer_groups (Grupos de Clientes)
CREATE TABLE IF NOT EXISTS public.customer_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA INTERMEDIA: lead_groups (Relación Clientes <-> Grupos)
CREATE TABLE IF NOT EXISTS public.lead_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.customer_groups(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, group_id)
);

-- 3. TABLA: purchases (Ventas)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id),
  product_summary TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'COP',
  status TEXT DEFAULT 'paid', -- paid, pending
  order_status TEXT DEFAULT 'pendiente', -- pendiente, entregada
  delivery_date DATE,
  is_delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: appointments (Citas)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pendiente', -- pendiente, confirmada
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: clinical_records (Historia Clínica)
CREATE TABLE IF NOT EXISTS public.clinical_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  description TEXT,
  rx_data JSONB, -- { "od": ... }
  diagnosis TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HABILITAR SEGURIDAD (RLS) - POLÍTICAS PERMISIVAS
-- =====================================================

ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;

-- Crear políticas "Allow All" para usuarios autenticados (para arreglar errores de acceso rápido)
DO $$
BEGIN
    -- Customer Groups
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to groups') THEN
        CREATE POLICY "Allow access to groups" ON public.customer_groups FOR ALL TO authenticated USING (true);
    END IF;

    -- Lead Groups
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to lead_groups') THEN
        CREATE POLICY "Allow access to lead_groups" ON public.lead_groups FOR ALL TO authenticated USING (true);
    END IF;

    -- Purchases
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to purchases') THEN
        CREATE POLICY "Allow access to purchases" ON public.purchases FOR ALL TO authenticated USING (true);
    END IF;

    -- Appointments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to appointments') THEN
        CREATE POLICY "Allow access to appointments" ON public.appointments FOR ALL TO authenticated USING (true);
    END IF;

    -- Clinical Records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to clinical_records') THEN
        CREATE POLICY "Allow access to clinical_records" ON public.clinical_records FOR ALL TO authenticated USING (true);
    END IF;
END
$$;

COMMIT;

-- Verificación final
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('customer_groups', 'lead_groups', 'purchases', 'appointments');

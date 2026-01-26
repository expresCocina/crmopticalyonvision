-- System Settings Table
-- Single-row configuration table for CRM system-wide settings

CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name text NOT NULL DEFAULT 'Óptica Lyon Visión',
    primary_color text NOT NULL DEFAULT '#FFD700',
    secondary_color text NOT NULL DEFAULT '#000000',
    timezone text NOT NULL DEFAULT 'America/Bogota',
    currency currency_code NOT NULL DEFAULT 'COP',
    whatsapp_enabled boolean NOT NULL DEFAULT false,
    whatsapp_phone_id text,
    whatsapp_waba_id text,
    meta_pixel_id text,
    default_followup_days integer NOT NULL DEFAULT 3,
    clinic_enabled boolean NOT NULL DEFAULT true,
    appointments_enabled boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin: Full access (select, update, insert)
CREATE POLICY "Admin can manage system settings"
    ON public.system_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Other roles: Read-only access
CREATE POLICY "All authenticated users can view system settings"
    ON public.system_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at_system_settings
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- Seed initial configuration (only if table is empty)
INSERT INTO public.system_settings (
    business_name,
    primary_color,
    secondary_color,
    timezone,
    currency,
    whatsapp_enabled,
    default_followup_days,
    clinic_enabled,
    appointments_enabled
)
SELECT
    'Óptica Lyon Visión',
    '#FFD700',
    '#000000',
    'America/Bogota',
    'COP',
    false,
    3,
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

-- Comment
COMMENT ON TABLE public.system_settings IS 'Single-row table for system-wide configuration. Only admins can modify.';

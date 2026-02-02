export type UserRole = 'admin' | 'vendedor' | 'atencion' | 'lectura';
export type LeadStatus = 'nuevo' | 'interesado' | 'cotizado' | 'agendado' | 'no_responde' | 'no_compro' | 'cliente' | 'recurrente';
export type ChannelSource = 'whatsapp' | 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'web' | 'qr_tienda';
export type MsgDirection = 'inbound' | 'outbound';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type CurrencyCode = 'COP' | 'USD' | 'MXN';
export type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'no_asistio';

export interface Profile {
    id: string;
    full_name: string;
    role: UserRole;
    email: string | null;
    active: boolean;
    created_at: string;
}

export interface Lead {
    id: string;
    wa_id: string;
    full_name: string | null;
    status: LeadStatus;
    source: ChannelSource;
    campaign_id: string | null;
    assigned_to: string | null;
    tags: string[] | null;
    notes: string | null;
    bot_active: boolean;
    unread_count: number;
    last_interaction: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    lead_id: string;
    wa_message_id: string | null;
    content: string | null;
    type: string;
    direction: MsgDirection;
    status: MessageStatus;
    created_at: string;
}

export interface Purchase {
    id: string;
    lead_id: string | null;
    product_summary: string | null;
    amount: number;
    currency: CurrencyCode;
    status: string | null;
    delivery_date: string | null;
    is_delivered: boolean;
    created_at: string;
}

export interface Appointment {
    id: string;
    lead_id: string;
    scheduled_at: string;
    status: AppointmentStatus;
    reason: string | null;
    notes: string | null;
    created_at: string;
    created_by: string | null;
}

export interface RxData {
    od: { sph: string; cyl: string; axis: string; add?: string };
    oi: { sph: string; cyl: string; axis: string; add?: string };
}

export interface ClinicalRecord {
    id: string;
    lead_id: string;
    optometrist_id: string | null;
    description: string | null;
    rx_data: RxData;
    diagnosis: string | null;
    recommendations: string | null;
    created_at: string;
    lead?: { full_name: string; wa_id: string }; // Joined
}

export interface SystemSettings {
    id: string;
    business_name: string;
    primary_color: string;
    secondary_color: string;
    timezone: string;
    currency: CurrencyCode;
    whatsapp_enabled: boolean;
    whatsapp_phone_id: string | null;
    whatsapp_waba_id: string | null;
    meta_pixel_id: string | null;
    default_followup_days: number;
    clinic_enabled: boolean;
    appointments_enabled: boolean;
    updated_at: string;
    created_at: string;
}

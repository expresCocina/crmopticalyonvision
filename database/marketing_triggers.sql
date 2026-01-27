-- ==============================================================================
-- MARKETING AUTOMATION TRIGGERS
-- Automatic reminders for inactive leads
-- ==============================================================================

-- Function to send automated reminders to inactive leads
CREATE OR REPLACE FUNCTION send_automated_reminders()
RETURNS TABLE(leads_reminded int) AS $$
DECLARE
    lead_record RECORD;
    reminder_count int := 0;
    reminder_message text;
BEGIN
    -- Find leads that need reminders
    -- Criteria: status in (nuevo, no_responde, interesado)
    -- AND (last_reminder_sent is NULL OR > 24 hours ago)
    -- AND last_interaction > 24 hours ago
    FOR lead_record IN
        SELECT id, full_name, wa_id, status, last_interaction
        FROM leads
        WHERE status IN ('nuevo', 'no_responde', 'interesado')
        AND (last_reminder_sent IS NULL OR last_reminder_sent < NOW() - INTERVAL '24 hours')
        AND last_interaction < NOW() - INTERVAL '24 hours'
        LIMIT 50 -- Limit to avoid overwhelming WhatsApp API
    LOOP
        -- Determine message based on lead status
        reminder_message := CASE
            WHEN lead_record.status = 'nuevo' THEN
                '¡Hola' || COALESCE(' ' || lead_record.full_name, '') || '! 👋 Vimos que nos escribiste. ¿En qué podemos ayudarte hoy en Óptica Lyon Visión?'
            WHEN lead_record.status = 'no_responde' THEN
                'Hola de nuevo' || COALESCE(' ' || lead_record.full_name, '') || '. ¿Sigues interesado en nuestros productos? Estamos aquí para ayudarte. 😊'
            WHEN lead_record.status = 'interesado' THEN
                '¡Hola' || COALESCE(' ' || lead_record.full_name, '') || '! ¿Cómo va todo? ¿Necesitas más información sobre lo que conversamos?'
            ELSE
                '¡Hola! ¿Podemos ayudarte en algo? 😊'
        END;
        
        -- Insert reminder message into messages table
        INSERT INTO messages (lead_id, content, direction, type, status)
        VALUES (
            lead_record.id,
            reminder_message,
            'outbound',
            'text',
            'sent'
        );
        
        -- Update last_reminder_sent timestamp
        UPDATE leads
        SET last_reminder_sent = NOW()
        WHERE id = lead_record.id;
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_automated_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION send_automated_reminders() TO service_role;

-- Note: This function should be called by a Supabase Edge Function via Cron
-- The Edge Function will then call whatsapp-outbound for each message

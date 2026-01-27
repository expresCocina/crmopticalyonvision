-- Appointment Booking Helper Functions
-- Funciones para ayudar con el agendamiento automático

-- Función para verificar disponibilidad de citas
CREATE OR REPLACE FUNCTION check_appointment_availability(
    requested_date timestamptz,
    duration_minutes int DEFAULT 30
)
RETURNS TABLE (
    available boolean,
    conflicting_appointments_count int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) = 0 as available,
        COUNT(*)::int as conflicting_appointments_count
    FROM appointments
    WHERE status IN ('pendiente', 'confirmada')
    AND appointment_date >= requested_date - (duration_minutes || ' minutes')::interval
    AND appointment_date <= requested_date + (duration_minutes || ' minutes')::interval;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener horarios disponibles en un día
CREATE OR REPLACE FUNCTION get_available_slots(
    target_date date,
    start_hour int DEFAULT 9,
    end_hour int DEFAULT 18,
    slot_duration_minutes int DEFAULT 30
)
RETURNS TABLE (
    slot_time timestamptz,
    is_available boolean
) AS $$
DECLARE
    current_slot timestamptz;
    slot_end timestamptz;
BEGIN
    -- Generar slots desde start_hour hasta end_hour
    FOR hour IN start_hour..end_hour-1 LOOP
        FOR minute IN 0..1 LOOP
            current_slot := target_date + (hour || ' hours')::interval + (minute * 30 || ' minutes')::interval;
            slot_end := current_slot + (slot_duration_minutes || ' minutes')::interval;
            
            -- Verificar si el slot está disponible
            RETURN QUERY
            SELECT 
                current_slot,
                NOT EXISTS (
                    SELECT 1 FROM appointments
                    WHERE status IN ('pendiente', 'confirmada')
                    AND appointment_date >= current_slot - (slot_duration_minutes || ' minutes')::interval
                    AND appointment_date <= slot_end
                ) as is_available;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON FUNCTION check_appointment_availability IS 'Verifica si hay disponibilidad en una fecha/hora específica';
COMMENT ON FUNCTION get_available_slots IS 'Retorna todos los slots disponibles para un día específico';

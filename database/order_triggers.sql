-- ==============================================================================
-- ORDER MANAGEMENT TRIGGERS
-- Automatic WhatsApp notification when order is marked as delivered
-- ==============================================================================

-- Function to notify customer when order is delivered
CREATE OR REPLACE FUNCTION notify_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_id uuid;
    v_lead_name text;
    v_wa_id text;
    v_product_summary text;
BEGIN
    -- Only trigger when order_status changes to 'entregada'
    IF NEW.order_status = 'entregada' AND (OLD.order_status IS NULL OR OLD.order_status != 'entregada') THEN
        
        -- Set delivered_at timestamp
        NEW.delivered_at := now();
        NEW.is_delivered := true;
        
        -- Get lead information
        SELECT id, full_name, wa_id INTO v_lead_id, v_lead_name, v_wa_id
        FROM leads
        WHERE id = NEW.lead_id;
        
        -- Get product summary
        v_product_summary := COALESCE(NEW.product_summary, 'su pedido');
        
        -- Insert notification message into messages table
        -- The whatsapp-outbound function will be called separately from frontend
        INSERT INTO messages (lead_id, content, direction, type, status)
        VALUES (
            v_lead_id,
            '¡Hola ' || COALESCE(v_lead_name, 'estimado cliente') || '! 👋

Su orden ha sido entregada satisfactoriamente. ✅

Producto: ' || v_product_summary || '

Gracias por su compra en Óptica Lyon Visión.

Si tiene alguna pregunta, no dude en contactarnos.',
            'outbound',
            'text',
            'sent'
        );
        
        -- Update lead last_interaction
        UPDATE leads
        SET last_interaction = now()
        WHERE id = v_lead_id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_order_delivered ON purchases;
CREATE TRIGGER on_order_delivered
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_delivered();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_order_delivered() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_order_delivered() TO service_role;

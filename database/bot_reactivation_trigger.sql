-- ==============================================================================
-- BOT AUTO-REACTIVATION TRIGGER
-- Automatically update last_agent_interaction when agent sends a message
-- ==============================================================================

-- Function to update last_agent_interaction timestamp
CREATE OR REPLACE FUNCTION update_last_agent_interaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el mensaje es outbound (del agente) y el bot está desactivado
    IF NEW.direction = 'outbound' AND 
       (SELECT bot_active FROM leads WHERE id = NEW.lead_id) = false THEN
        
        UPDATE leads
        SET last_agent_interaction = NOW()
        WHERE id = NEW.lead_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after message insert
CREATE TRIGGER on_agent_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_last_agent_interaction();

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_last_agent_interaction() TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_agent_interaction() TO service_role;

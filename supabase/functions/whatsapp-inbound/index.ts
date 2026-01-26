import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Verify Request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)

    // 2. Handle Verification Challenge (Meta)
    if (req.method === 'GET' && url.searchParams.get("hub.mode") === "subscribe") {
        const token = url.searchParams.get("hub.verify_token")
        const challenge = url.searchParams.get("hub.challenge")

        if (token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) {
            return new Response(challenge, { headers: { 'Content-Type': 'text/plain' } })
        }
        return new Response("Invalid Token", { status: 403 })
    }

    // 3. Handle Inbound Messages (POST)
    if (req.method === 'POST') {
        try {
            const payload = await req.json()

            // Initialize Admin Supabase Client
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // Extract relevant data (Simplified for Meta's Cloud API structure)
            const entry = payload.entry?.[0]
            const change = entry?.changes?.[0]
            const value = change?.value
            const message = value?.messages?.[0]
            const contact = value?.contacts?.[0]

            if (!message) {
                return new Response(JSON.stringify({ message: 'No notification' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const wa_id = message.from
            const user_name = contact?.profile?.name || 'Usuario WhatsApp'
            const msg_body = message.text?.body || message.button?.text || '[Multimedia]'
            const wa_message_id = message.id
            const msg_type = message.type

            console.log(`New Message from ${wa_id}: ${msg_body}`)

            // 4. Find or Create Lead
            let lead_id: string | null = null

            const { data: existingLead } = await supabase
                .from('leads')
                .select('id, status')
                .eq('wa_id', wa_id)
                .single()

            if (existingLead) {
                lead_id = existingLead.id
                // Update last interaction
                await supabase
                    .from('leads')
                    .update({
                        last_interaction: new Date(),
                        // Logic to reopen connection if status was 'no_responde' could go here
                    })
                    .eq('id', lead_id)
            } else {
                // Create new lead
                const { data: newLead, error: createError } = await supabase
                    .from('leads')
                    .insert({
                        wa_id,
                        full_name: user_name,
                        source: 'whatsapp',
                        status: 'nuevo'
                    })
                    .select()
                    .single()

                if (createError) throw createError
                lead_id = newLead.id
            }

            // 5. Store Message
            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    lead_id,
                    wa_message_id,
                    content: msg_body,
                    type: msg_type,
                    direction: 'inbound',
                    status: 'delivered'
                })

            if (msgError) throw msgError

            // 6. Automation Hook (Placeholder)
            // await processAutomations(lead_id, msg_body, supabase)

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })

        } catch (error) {
            console.error(error)
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }
    }

    return new Response("Method not allowed", { status: 405 })
})

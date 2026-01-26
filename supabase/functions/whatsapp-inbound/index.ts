import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)

        // GET: Webhook Verification (Meta)
        if (req.method === 'GET') {
            const mode = url.searchParams.get('hub.mode')
            const token = url.searchParams.get('hub.verify_token')
            const challenge = url.searchParams.get('hub.challenge')

            const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')

            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('Webhook verified successfully')
                return new Response(challenge, {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                })
            } else {
                console.error('Webhook verification failed')
                return new Response('Forbidden', { status: 403 })
            }
        }

        // POST: Incoming Messages
        if (req.method === 'POST') {
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            const payload = await req.json()
            console.log('Received webhook payload:', JSON.stringify(payload, null, 2))

            // Parse WhatsApp Cloud API payload
            const entry = payload.entry?.[0]
            const changes = entry?.changes?.[0]
            const value = changes?.value

            if (!value?.messages || value.messages.length === 0) {
                console.log('No messages in payload, returning 200')
                return new Response(JSON.stringify({ status: 'ok' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            const message = value.messages[0]
            const wa_id = message.from
            const wa_message_id = message.id
            const timestamp = message.timestamp
            const messageType = message.type
            const messageContent = message.text?.body || message.image?.caption || ''

            // Extract contact name if available
            const contact = value.contacts?.[0]
            const contactName = contact?.profile?.name || null

            console.log(`Processing message from ${wa_id}: ${messageContent}`)

            // 1. Upsert Lead
            const { data: existingLead } = await supabase
                .from('leads')
                .select('id, full_name')
                .eq('wa_id', wa_id)
                .single()

            let leadId: string

            if (existingLead) {
                // Update existing lead
                leadId = existingLead.id
                await supabase
                    .from('leads')
                    .update({
                        last_interaction: new Date().toISOString(),
                        full_name: existingLead.full_name || contactName // Keep existing name if set
                    })
                    .eq('id', leadId)

                console.log(`Updated existing lead: ${leadId}`)
            } else {
                // Create new lead
                const { data: newLead, error: leadError } = await supabase
                    .from('leads')
                    .insert({
                        wa_id,
                        full_name: contactName,
                        status: 'nuevo',
                        source: 'whatsapp',
                        last_interaction: new Date().toISOString()
                    })
                    .select()
                    .single()

                if (leadError) {
                    console.error('Error creating lead:', leadError)
                    throw leadError
                }

                leadId = newLead.id
                console.log(`Created new lead: ${leadId}`)
            }

            // 2. Insert Message
            const { error: messageError } = await supabase
                .from('messages')
                .insert({
                    lead_id: leadId,
                    wa_message_id,
                    content: messageContent,
                    type: messageType,
                    direction: 'inbound',
                    status: 'delivered',
                    created_at: new Date(parseInt(timestamp) * 1000).toISOString()
                })

            if (messageError) {
                console.error('Error inserting message:', messageError)
                throw messageError
            }

            console.log('Message saved successfully')

            // 3. Check if auto-response is enabled
            const { data: settings } = await supabase
                .from('system_settings')
                .select('whatsapp_enabled')
                .single()

            if (settings?.whatsapp_enabled) {
                // TODO: Implement bot logic here
                // For now, just log that bot is enabled
                console.log('WhatsApp bot is enabled - auto-response logic can be added here')
            }

            return new Response(
                JSON.stringify({ status: 'success', lead_id: leadId }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        return new Response('Method not allowed', { status: 405 })

    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

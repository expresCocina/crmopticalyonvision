import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
    lead_id: string
    message: string
    wa_id?: string // Optional if lead_id is provided
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        if (req.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { lead_id, message, wa_id }: SendMessageRequest = await req.json()

        if (!message || (!lead_id && !wa_id)) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: message and (lead_id or wa_id)' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            )
        }

        // Get lead info
        let leadData
        if (lead_id) {
            const { data } = await supabase
                .from('leads')
                .select('id, wa_id')
                .eq('id', lead_id)
                .single()
            leadData = data
        } else {
            const { data } = await supabase
                .from('leads')
                .select('id, wa_id')
                .eq('wa_id', wa_id)
                .single()
            leadData = data
        }

        if (!leadData) {
            return new Response(
                JSON.stringify({ error: 'Lead not found' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                }
            )
        }

        // Get WhatsApp credentials from environment
        const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
        const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

        if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
            console.error('Missing WhatsApp credentials')
            return new Response(
                JSON.stringify({ error: 'WhatsApp not configured' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500,
                }
            )
        }

        // Send message via WhatsApp Cloud API
        const whatsappApiUrl = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`

        const whatsappPayload = {
            messaging_product: 'whatsapp',
            to: leadData.wa_id,
            type: 'text',
            text: {
                body: message
            }
        }

        console.log(`Sending message to ${leadData.wa_id}`)

        const whatsappResponse = await fetch(whatsappApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(whatsappPayload)
        })

        const whatsappResult = await whatsappResponse.json()

        if (!whatsappResponse.ok) {
            console.error('WhatsApp API error:', whatsappResult)
            return new Response(
                JSON.stringify({ error: 'Failed to send message', details: whatsappResult }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: whatsappResponse.status,
                }
            )
        }

        const wa_message_id = whatsappResult.messages?.[0]?.id

        // Save outbound message to database
        const { error: messageError } = await supabase
            .from('messages')
            .insert({
                lead_id: leadData.id,
                wa_message_id,
                content: message,
                type: 'text',
                direction: 'outbound',
                status: 'sent',
                created_at: new Date().toISOString()
            })

        if (messageError) {
            console.error('Error saving message to database:', messageError)
            // Don't fail the request since message was sent successfully
        }

        // Update lead last_interaction
        await supabase
            .from('leads')
            .update({ last_interaction: new Date().toISOString() })
            .eq('id', leadData.id)

        console.log('Message sent successfully:', wa_message_id)

        return new Response(
            JSON.stringify({
                success: true,
                wa_message_id,
                lead_id: leadData.id
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('Error sending message:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

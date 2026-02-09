import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
    lead_id: string
    message?: string
    wa_id?: string // Optional if lead_id is provided
    media_url?: string // For images and audio
    caption?: string // For image captions
    type?: 'text' | 'image' | 'audio' // Message type
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

        const { lead_id, message, wa_id, media_url, caption, type = 'text' }: SendMessageRequest = await req.json()

        // Validate required fields based on message type
        if (type === 'text' && !message) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: message' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            )
        }

        if ((type === 'image' || type === 'audio') && !media_url) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: media_url' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            )
        }

        if (!lead_id && !wa_id) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: lead_id or wa_id' }),
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
        const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN')
        const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_ID')

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

        // Build WhatsApp payload based on message type
        let whatsappPayload: any = {
            messaging_product: 'whatsapp',
            to: leadData.wa_id,
        }

        if (type === 'image') {
            whatsappPayload.type = 'image'
            whatsappPayload.image = {
                link: media_url,
            }
            if (caption) {
                whatsappPayload.image.caption = caption
            }
        } else if (type === 'audio') {
            // For audio, upload directly to WhatsApp instead of using external URL
            console.log('Uploading audio to WhatsApp API...')

            try {
                // 1. Download audio from Supabase Storage
                const audioResponse = await fetch(media_url)
                if (!audioResponse.ok) {
                    throw new Error(`Failed to download audio: ${audioResponse.statusText}`)
                }
                const audioBlob = await audioResponse.blob()

                // 2. Upload to WhatsApp Media API
                const formData = new FormData()
                formData.append('file', audioBlob, 'audio.ogg')
                formData.append('messaging_product', 'whatsapp')
                formData.append('type', 'audio/ogg')

                const uploadResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/media`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                        },
                        body: formData
                    }
                )

                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json()
                    console.error('WhatsApp media upload error:', errorData)
                    throw new Error(`Media upload failed: ${JSON.stringify(errorData)}`)
                }

                const uploadData = await uploadResponse.json()
                const mediaId = uploadData.id

                console.log('Audio uploaded to WhatsApp, media_id:', mediaId)

                // 3. Use media_id instead of link
                whatsappPayload.type = 'audio'
                whatsappPayload.audio = {
                    id: mediaId
                }
            } catch (uploadError) {
                console.error('Error uploading audio to WhatsApp:', uploadError)
                return new Response(
                    JSON.stringify({ error: 'Failed to upload audio to WhatsApp', details: uploadError.message }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 500,
                    }
                )
            }
        } else {
            // Default text message
            whatsappPayload.type = 'text'
            whatsappPayload.text = {
                body: message
            }
        }

        console.log(`Sending ${type} message to ${leadData.wa_id}`)

        // Debug: Log the complete payload
        if (type === 'image' || type === 'audio') {
            if (type === 'image') {
                console.log('Media URL:', media_url)
            }
            console.log('WhatsApp Payload:', JSON.stringify(whatsappPayload, null, 2))
        }


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
        const messageData: any = {
            lead_id: leadData.id,
            wa_message_id,
            type: type,
            direction: 'outbound',
            status: 'sent',
            created_at: new Date().toISOString()
        }

        // Add content/media based on type
        if (type === 'text') {
            messageData.content = message
        } else if (type === 'image') {
            messageData.media_url = media_url
            messageData.caption = caption || null
        } else if (type === 'audio') {
            messageData.media_url = media_url
        }

        const { error: messageError } = await supabase
            .from('messages')
            .insert(messageData)

        if (messageError) {
            console.error('Error saving message to database:', messageError)
            // Don't fail the request since message was sent successfully
        }

        // Update lead last_interaction and deactivate bot (agent is taking over)
        await supabase
            .from('leads')
            .update({
                last_interaction: new Date().toISOString(),
                bot_active: false  // Desactivar bot cuando agente envía mensaje
            })
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

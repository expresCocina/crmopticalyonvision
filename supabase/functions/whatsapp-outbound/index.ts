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
    type?: 'text' | 'image' | 'audio' | 'template' // Message type
    message_id?: string // Optional: existing message ID to update
    template_name?: string
    template_lang?: string
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

        const { lead_id, message, wa_id, media_url, caption, type = 'text', message_id, template_name, template_lang }: SendMessageRequest = await req.json()

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
                .select('id, wa_id, name')
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
        } else if (type === 'template') {
            if (!template_name) {
                return new Response(
                    JSON.stringify({ error: 'Missing required field: template_name for template message' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
            whatsappPayload.type = 'template'
            whatsappPayload.template = {
                name: template_name,
                language: {
                    code: template_lang || 'es'
                },
                components: []
            }

            // DEBUG: Log template details
            console.log('📋 Sending template message:', {
                template_name,
                template_lang: template_lang || 'es',
                lead_id,
                message_id,
                lead_name: leadData.name
            })

            // IMPORTANTE: Si la plantilla tiene una cabecera de tipo IMAGEN, necesitamos enviarla.
            // Asumimos que si hay media_url, es porque la plantilla requiere una imagen en el header.
            if (media_url && media_url.trim() !== '') {
                whatsappPayload.template.components.push({
                    type: 'header',
                    parameters: [
                        {
                            type: 'image',
                            image: {
                                link: media_url
                            }
                        }
                    ]
                })
            }

            // Agregar parámetros del body si la plantilla tiene variables
            // Por ahora, enviamos el nombre del cliente como primer parámetro
            if (leadData.name) {
                whatsappPayload.template.components.push({
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            text: leadData.name
                        }
                    ]
                })
            }

            // Si no hay componentes, eliminamos el array para evitar errores si la API es estricta
            if (whatsappPayload.template.components.length === 0) {
                delete whatsappPayload.template.components
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
                // Detect the actual MIME type from the blob
                const audioType = audioBlob.type || 'audio/webm;codecs=opus'
                console.log('Audio blob content-type:', audioType)

                // Determine file extension and WhatsApp type
                let fileName = 'audio.ogg'
                let whatsappType = 'audio/ogg'

                if (audioType.includes('mp4')) {
                    fileName = 'audio.mp4'
                    whatsappType = 'audio/mp4'
                } else if (audioType.includes('aac')) {
                    fileName = 'audio.aac'
                    whatsappType = 'audio/aac'
                } else if (audioType.includes('mpeg') || audioType.includes('mp3')) {
                    fileName = 'audio.mp3'
                    whatsappType = 'audio/mpeg'
                } else if (audioType.includes('webm')) {
                    // WebM is not supported by WhatsApp, but we'll try anyway
                    fileName = 'audio.webm'
                    whatsappType = 'audio/webm'
                }

                console.log('Using filename:', fileName, 'type:', whatsappType)

                const formData = new FormData()
                formData.append('file', audioBlob, fileName)
                formData.append('messaging_product', 'whatsapp')
                formData.append('type', whatsappType)

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
        // Save or update outbound message
        let dbMessageId = message_id

        console.log('📝 Saving message to DB - message_id:', message_id, 'wa_message_id:', wa_message_id)

        if (message_id) {
            // Update existing message
            console.log('🔄 Updating existing message:', message_id)
            const { error: updateError } = await supabase
                .from('messages')
                .update({
                    wa_message_id,
                    status: 'sent'
                })
                .eq('id', message_id)

            if (updateError) {
                console.error('❌ Error updating message:', updateError)
            } else {
                console.log('✅ Successfully updated message with wa_message_id')
            }
        } else {
            // Insert new message
            const messageData: any = {
                lead_id: leadData.id,
                wa_message_id,
                type: type,
                direction: 'outbound',
                status: 'sent',
                created_at: new Date().toISOString()
            }

            // Add content/media based on type
            if (type === 'text' || type === 'template') {
                messageData.content = message
            } else if (type === 'image') {
                messageData.media_url = media_url
                messageData.caption = caption || null
            } else if (type === 'audio') {
                messageData.media_url = media_url
            }

            const { data: newMessage, error: insertError } = await supabase
                .from('messages')
                .insert(messageData)
                .select('id')
                .single()

            if (insertError) {
                console.error('Error saving message to database:', insertError)
            } else if (newMessage) {
                dbMessageId = newMessage.id
            }
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

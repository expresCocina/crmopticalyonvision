import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN')!
        const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_ID')!

        const supabase = createClient(supabaseUrl, supabaseKey)

        console.log('🔄 Starting automated reminder check...')

        // Call the database function to create reminder messages
        const { data: reminderData, error: reminderError } = await supabase
            .rpc('send_automated_reminders')

        if (reminderError) {
            console.error('Error calling send_automated_reminders:', reminderError)
            throw reminderError
        }

        const leadsReminded = reminderData || 0
        console.log(`📊 Created ${leadsReminded} reminder messages`)

        if (leadsReminded === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'No reminders needed', count: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Fetch pending outbound messages (created by the function)
        const { data: pendingMessages, error: fetchError } = await supabase
            .from('messages')
            .select(`
        id,
        content,
        lead_id,
        leads (
          wa_id,
          full_name
        )
      `)
            .eq('direction', 'outbound')
            .eq('status', 'sent')
            .order('created_at', { ascending: true })
            .limit(50)

        if (fetchError) {
            console.error('Error fetching pending messages:', fetchError)
            throw fetchError
        }

        console.log(`📤 Sending ${pendingMessages?.length || 0} WhatsApp messages...`)

        let sentCount = 0
        let failedCount = 0

        // Send each message via WhatsApp API
        for (const msg of pendingMessages || []) {
            try {
                const lead = msg.leads as any
                if (!lead?.wa_id) {
                    console.warn(`Skipping message ${msg.id}: no wa_id`)
                    continue
                }

                // Call WhatsApp Cloud API
                const whatsappResponse = await fetch(
                    `https://graph.facebook.com/v21.0/${whatsappPhoneId}/messages`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${whatsappToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            to: lead.wa_id,
                            type: 'text',
                            text: { body: msg.content }
                        })
                    }
                )

                if (!whatsappResponse.ok) {
                    const errorText = await whatsappResponse.text()
                    console.error(`WhatsApp API error for ${lead.wa_id}:`, errorText)

                    // Update message status to failed
                    await supabase
                        .from('messages')
                        .update({ status: 'failed' })
                        .eq('id', msg.id)

                    failedCount++
                    continue
                }

                const whatsappData = await whatsappResponse.json()
                console.log(`✅ Sent to ${lead.wa_id}:`, whatsappData)

                // Update message status to delivered
                await supabase
                    .from('messages')
                    .update({
                        status: 'delivered',
                        wa_message_id: whatsappData.messages?.[0]?.id
                    })
                    .eq('id', msg.id)

                sentCount++

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))

            } catch (error) {
                console.error(`Error sending message ${msg.id}:`, error)
                failedCount++
            }
        }

        console.log(`✅ Reminder job complete: ${sentCount} sent, ${failedCount} failed`)

        return new Response(
            JSON.stringify({
                success: true,
                leadsReminded,
                sent: sentCount,
                failed: failedCount
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in send-reminders function:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

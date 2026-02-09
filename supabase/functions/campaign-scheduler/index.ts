// Edge Function: campaign-scheduler
// Ejecuta campañas programadas enviando mensajes a grupos de clientes
// Se ejecuta diariamente mediante cron job

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Campaign {
    id: string
    name: string
    message_template: string
    media_url: string | null
    campaign_type: string
    target_groups: string[]
    current_group_index: number
    send_interval_days: number
    last_sent_at: string | null
    is_active: boolean
}

interface Lead {
    id: string
    wa_id: string
    full_name: string | null
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('Campaign Scheduler: Starting execution...')

        // 1. Obtener campañas activas que necesitan envío
        const { data: campaigns, error: campaignsError } = await supabaseClient
            .from('marketing_campaigns')
            .select('*')
            .eq('is_active', true)
            .not('target_groups', 'is', null)
            .returns<Campaign[]>()

        if (campaignsError) {
            console.error('Error fetching campaigns:', campaignsError)
            throw campaignsError
        }

        if (!campaigns || campaigns.length === 0) {
            console.log('No active campaigns found')
            return new Response(
                JSON.stringify({ message: 'No active campaigns to process' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Found ${campaigns.length} active campaigns`)

        const results = []

        // 2. Procesar cada campaña
        for (const campaign of campaigns) {
            console.log(`Processing campaign: ${campaign.name} (${campaign.id})`)

            // Verificar si es tiempo de enviar
            const shouldSend = shouldSendCampaign(campaign)

            if (!shouldSend) {
                console.log(`Campaign ${campaign.name} not ready to send yet`)
                results.push({
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    status: 'skipped',
                    reason: 'Not time to send yet'
                })
                continue
            }

            // Verificar si hay más grupos por enviar
            if (campaign.current_group_index >= campaign.target_groups.length) {
                console.log(`Campaign ${campaign.name} completed all groups`)

                // Marcar campaña como inactiva
                await supabaseClient
                    .from('marketing_campaigns')
                    .update({ is_active: false })
                    .eq('id', campaign.id)

                results.push({
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    status: 'completed',
                    reason: 'All groups sent'
                })
                continue
            }

            // 3. Obtener el siguiente grupo
            const nextGroupId = campaign.target_groups[campaign.current_group_index]
            console.log(`Next group ID: ${nextGroupId}`)

            // 4. Obtener leads del grupo
            const { data: leadGroups, error: leadGroupsError } = await supabaseClient
                .from('lead_groups')
                .select('lead_id')
                .eq('group_id', nextGroupId)

            if (leadGroupsError) {
                console.error('Error fetching lead groups:', leadGroupsError)
                results.push({
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    status: 'error',
                    error: leadGroupsError.message
                })
                continue
            }

            const leadIds = leadGroups.map(lg => lg.lead_id)
            console.log(`Found ${leadIds.length} leads in group`)

            if (leadIds.length === 0) {
                console.log('No leads in group, skipping to next')

                // Incrementar índice para saltar este grupo vacío
                await supabaseClient.rpc('mark_campaign_group_sent', {
                    campaign_id_param: campaign.id
                })

                results.push({
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    status: 'skipped',
                    reason: 'Empty group'
                })
                continue
            }

            // 5. Obtener información completa de los leads
            const { data: leads, error: leadsError } = await supabaseClient
                .from('leads')
                .select('id, wa_id, full_name')
                .in('id', leadIds)
                .returns<Lead[]>()

            if (leadsError) {
                console.error('Error fetching leads:', leadsError)
                results.push({
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    status: 'error',
                    error: leadsError.message
                })
                continue
            }

            // 6. Enviar mensajes a cada lead
            let successCount = 0
            let errorCount = 0

            for (const lead of leads) {
                try {
                    // Reemplazar variables en el mensaje
                    const personalizedMessage = replaceVariables(
                        campaign.message_template,
                        lead
                    )

                    // Crear registro del mensaje
                    const messageData: any = {
                        lead_id: lead.id,
                        content: personalizedMessage,
                        direction: 'outbound',
                        type: campaign.campaign_type === 'image' ? 'image' : 'text',
                        status: 'sent'
                    }

                    if (campaign.media_url) {
                        messageData.media_url = campaign.media_url
                    }

                    const { data: message, error: messageError } = await supabaseClient
                        .from('messages')
                        .insert(messageData)
                        .select()
                        .single()

                    if (messageError) throw messageError

                    // Crear registro de envío de campaña
                    await supabaseClient
                        .from('campaign_sends')
                        .insert({
                            campaign_id: campaign.id,
                            lead_id: lead.id,
                            message_id: message.id,
                            status: 'sent'
                        })

                    // Enviar por WhatsApp
                    const whatsappPayload: any = {
                        lead_id: lead.id,
                        message: personalizedMessage
                    }

                    if (campaign.media_url) {
                        whatsappPayload.media_url = campaign.media_url
                        whatsappPayload.type = 'image'
                        whatsappPayload.caption = personalizedMessage
                    }

                    await supabaseClient.functions.invoke('whatsapp-outbound', {
                        body: whatsappPayload
                    })

                    successCount++
                    console.log(`Sent to ${lead.full_name || lead.wa_id}`)

                } catch (error) {
                    errorCount++
                    console.error(`Error sending to ${lead.wa_id}:`, error)
                }
            }

            // 7. Actualizar campaña
            await supabaseClient.rpc('mark_campaign_group_sent', {
                campaign_id_param: campaign.id
            })

            // Actualizar contador total
            const { data: currentCampaign } = await supabaseClient
                .from('marketing_campaigns')
                .select('sent_count')
                .eq('id', campaign.id)
                .single()

            await supabaseClient
                .from('marketing_campaigns')
                .update({
                    sent_count: (currentCampaign?.sent_count || 0) + successCount
                })
                .eq('id', campaign.id)

            results.push({
                campaign_id: campaign.id,
                campaign_name: campaign.name,
                status: 'success',
                group_index: campaign.current_group_index,
                leads_sent: successCount,
                leads_failed: errorCount
            })

            console.log(`Campaign ${campaign.name}: Sent to ${successCount} leads, ${errorCount} failed`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: campaigns.length,
                results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Campaign Scheduler Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

// Función auxiliar: Verificar si es tiempo de enviar la campaña
function shouldSendCampaign(campaign: Campaign): boolean {
    // Si nunca se ha enviado, enviar ahora
    if (!campaign.last_sent_at) {
        return true
    }

    // Calcular días desde el último envío
    const lastSent = new Date(campaign.last_sent_at)
    const now = new Date()
    const daysSinceLastSend = Math.floor(
        (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Enviar si han pasado suficientes días
    return daysSinceLastSend >= campaign.send_interval_days
}

// Función auxiliar: Reemplazar variables en el mensaje
function replaceVariables(template: string, lead: Lead): string {
    let result = template

    // Reemplazar {nombre}
    if (lead.full_name) {
        result = result.replace(/{nombre}/gi, lead.full_name)
    }

    // Aquí se pueden agregar más variables en el futuro
    // result = result.replace(/{empresa}/gi, companyName)
    // result = result.replace(/{fecha}/gi, new Date().toLocaleDateString())

    return result
}

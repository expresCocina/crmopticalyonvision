'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Campaign {
    id: string
    name: string
    message_template: string
    target_segment: string | null
    target_status: string[] | null
    scheduled_at: string | null
    sent_count: number
    is_active: boolean
    created_by: string
    created_at: string
    // Nuevos campos
    media_url?: string | null
    send_interval_days?: number
    current_group_index?: number
    target_groups?: string[] | null
    campaign_type?: 'text' | 'image' | 'image_text'
    last_sent_at?: string | null
}

export interface CampaignSend {
    id: string
    campaign_id: string
    lead_id: string
    message_id: string | null
    sent_at: string
    status: string
}

export function useCampaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchCampaigns = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('marketing_campaigns')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching campaigns:', error)
        } else {
            setCampaigns(data || [])
        }
        setLoading(false)
    }

    const createCampaign = async (campaign: Partial<Campaign>) => {
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('marketing_campaigns')
            .insert({
                ...campaign,
                created_by: user?.id
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating campaign:', error)
            return { success: false, error }
        }

        await fetchCampaigns()
        return { success: true, data }
    }

    const sendCampaign = async (campaignId: string, leadIds: string[], message: string) => {
        try {
            // Insert messages for each lead
            const messages = leadIds.map(leadId => ({
                lead_id: leadId,
                content: message,
                direction: 'outbound' as const,
                type: 'text',
                status: 'sent' as const
            }))

            const { data: insertedMessages, error: messageError } = await supabase
                .from('messages')
                .insert(messages)
                .select()

            if (messageError) throw messageError

            // Create campaign sends records
            const campaignSends = insertedMessages.map((msg, index) => ({
                campaign_id: campaignId,
                lead_id: leadIds[index],
                message_id: msg.id,
                status: 'sent'
            }))

            const { error: sendError } = await supabase
                .from('campaign_sends')
                .insert(campaignSends)

            if (sendError) throw sendError

            // Update campaign sent_count
            const { error: updateError } = await supabase
                .from('marketing_campaigns')
                .update({ sent_count: leadIds.length })
                .eq('id', campaignId)

            if (updateError) throw updateError

            // Send via WhatsApp
            for (const leadId of leadIds) {
                await supabase.functions.invoke('whatsapp-outbound', {
                    body: { lead_id: leadId, message }
                })
            }

            await fetchCampaigns()
            return { success: true }
        } catch (error) {
            console.error('Error sending campaign:', error)
            return { success: false, error }
        }
    }

    const sendCampaignWithImage = async (
        campaignId: string,
        leadIds: string[],
        message: string,
        mediaUrl: string
    ) => {
        try {
            // Insert messages for each lead with image
            const messages = leadIds.map(leadId => ({
                lead_id: leadId,
                content: message,
                direction: 'outbound' as const,
                type: 'image',
                media_url: mediaUrl,
                status: 'sent' as const
            }))

            const { data: insertedMessages, error: messageError } = await supabase
                .from('messages')
                .insert(messages)
                .select()

            if (messageError) throw messageError

            // Create campaign sends records
            const campaignSends = insertedMessages.map((msg, index) => ({
                campaign_id: campaignId,
                lead_id: leadIds[index],
                message_id: msg.id,
                status: 'sent'
            }))

            const { error: sendError } = await supabase
                .from('campaign_sends')
                .insert(campaignSends)

            if (sendError) throw sendError

            // Update campaign sent_count
            const { error: updateError } = await supabase
                .from('marketing_campaigns')
                .update({ sent_count: leadIds.length })
                .eq('id', campaignId)

            if (updateError) throw updateError

            // Send via WhatsApp with image
            for (let i = 0; i < leadIds.length; i++) {
                const leadId = leadIds[i]
                const messageId = insertedMessages[i].id

                await supabase.functions.invoke('whatsapp-outbound', {
                    body: {
                        lead_id: leadId,
                        message,
                        media_url: mediaUrl,
                        type: 'image',
                        caption: message,
                        message_id: messageId // Pass ID to avoid duplication
                    }
                })
            }

            await fetchCampaigns()
            return { success: true }
        } catch (error) {
            console.error('Error sending campaign with image:', error)
            return { success: false, error }
        }
    }

    const autoAssignGroups = async (batchSize: number = 50, groupPrefix: string = 'Grupo') => {
        try {
            const { data, error } = await supabase.rpc('auto_assign_customer_groups', {
                batch_size: batchSize,
                group_prefix: groupPrefix
            })

            if (error) throw error

            return { success: true, data }
        } catch (error) {
            console.error('Error auto-assigning groups:', error)
            return { success: false, error }
        }
    }

    const getCampaignStats = async (campaignId: string) => {
        const { data, error } = await supabase
            .from('campaign_sends')
            .select('status')
            .eq('campaign_id', campaignId)

        if (error) {
            console.error('Error fetching campaign stats:', error)
            return null
        }

        const stats = {
            total: data.length,
            sent: data.filter(s => s.status === 'sent').length,
            delivered: data.filter(s => s.status === 'delivered').length,
            read: data.filter(s => s.status === 'read').length,
            failed: data.filter(s => s.status === 'failed').length
        }

        return stats
    }

    useEffect(() => {
        fetchCampaigns()

        // Subscribe to changes
        const channel = supabase
            .channel('campaigns-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'marketing_campaigns'
                },
                () => {
                    fetchCampaigns()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return {
        campaigns,
        loading,
        createCampaign,
        sendCampaign,
        sendCampaignWithImage,
        autoAssignGroups,
        getCampaignStats,
        refreshCampaigns: fetchCampaigns
    }
}

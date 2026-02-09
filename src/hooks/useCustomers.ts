'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CustomerGroup } from './useCustomerGroups'

export type CustomerSegment = 'frios' | 'proceso' | 'activos' | 'all'

export interface Customer {
    id: string
    wa_id: string
    full_name: string | null
    status: string
    source: string
    last_interaction: string
    last_reminder_sent: string | null
    created_at: string
    groups?: CustomerGroup[]
}

export function useCustomers(segment: CustomerSegment = 'all', groupId: string | null = null) {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const supabase = createClient()

    const fetchCustomers = async () => {
        setLoading(true)

        try {
            let query = supabase
                .from('leads')
                .select(`
                    *,
                    lead_groups (
                        group:customer_groups (
                            id,
                            name,
                            color,
                            description,
                            created_at
                        )
                    )
                `)
                .order('last_interaction', { ascending: false })

            // Apply segment filter
            if (segment === 'frios') {
                query = query.in('status', ['nuevo', 'no_responde'])
            } else if (segment === 'proceso') {
                query = query.in('status', ['interesado', 'cotizado', 'agendado'])
            } else if (segment === 'activos') {
                query = query.in('status', ['cliente', 'recurrente'])
            }

            // Apply group filter
            if (groupId) {
                // First get lead IDs in the group
                const { data: groupLeads, error: groupError } = await supabase
                    .from('lead_groups')
                    .select('lead_id')
                    .eq('group_id', groupId)

                if (groupError) throw groupError

                const leadIds = groupLeads.map(gl => gl.lead_id)
                query = query.in('id', leadIds)
            }

            const { data, error } = await query

            if (error) throw error

            // Transform data to match Customer interface
            const formattedData = data.map((item: any) => ({
                ...item,
                groups: item.lead_groups?.map((lg: any) => lg.group) || []
            }))

            setCustomers(formattedData as Customer[])
        } catch (error) {
            console.error('Error fetching customers:', error)
            toast.error('Error al cargar clientes')
        } finally {
            setLoading(false)
        }
    }

    const sendBulkMessage = async (message: string, leadIds?: string[]) => {
        const targetIds = leadIds || selectedIds

        if (targetIds.length === 0) {
            toast.error('Selecciona al menos un cliente')
            return false
        }

        try {
            // Insert messages for each selected lead
            const messages = targetIds.map(leadId => ({
                lead_id: leadId,
                content: message,
                direction: 'outbound' as const,
                type: 'text',
                status: 'sent' as const
            }))

            const { error } = await supabase
                .from('messages')
                .insert(messages)

            if (error) throw error

            // Call whatsapp-outbound for each message
            for (const leadId of targetIds) {
                await supabase.functions.invoke('whatsapp-outbound', {
                    body: { lead_id: leadId, message }
                })
            }

            toast.success(`Mensaje enviado a ${targetIds.length} cliente(s)`)
            setSelectedIds([])
            return true
        } catch (error) {
            console.error('Error sending bulk message:', error)
            toast.error('Error al enviar mensajes')
            return false
        }
    }

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        )
    }

    const selectAll = () => {
        setSelectedIds(customers.map(c => c.id))
    }

    const clearSelection = () => {
        setSelectedIds([])
    }

    useEffect(() => {
        fetchCustomers()

        // Subscribe to realtime changes
        const channel = supabase
            .channel('customers-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leads'
                },
                () => {
                    fetchCustomers()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [segment, groupId])

    return {
        customers,
        loading,
        selectedIds,
        toggleSelection,
        selectAll,
        clearSelection,
        sendBulkMessage,
        fetchCustomers
    }
}

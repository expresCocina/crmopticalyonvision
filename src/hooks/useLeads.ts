'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lead } from '@/types/database'

export function useLeads() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        // 1. Fetch initial data
        const fetchLeads = async () => {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('last_interaction', { ascending: false })

            if (error) {
                console.error('Error fetching leads:', error)
            } else {
                setLeads(data || [])
            }
            setLoading(false)
        }

        fetchLeads()

        // 2. Subscribe to Realtime changes
        const channel = supabase
            .channel('leads-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'leads' },
                (payload: any) => {

                    if (payload.eventType === 'INSERT') {
                        setLeads((prev) => [payload.new as Lead, ...prev])
                    } else if (payload.eventType === 'UPDATE') {
                        setLeads((prev) => prev.map((lead) =>
                            lead.id === payload.new.id ? payload.new as Lead : lead
                        ))
                    } else if (payload.eventType === 'DELETE') {
                        setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return { leads, loading }
}

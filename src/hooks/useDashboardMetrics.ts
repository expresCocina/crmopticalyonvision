'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useDashboardMetrics() {
    const [metrics, setMetrics] = useState({
        totalSales: 0,
        newLeads: 0,
        activeChats: 0,
        pendingDeliveries: 0
    })
    const supabase = createClient()

    useEffect(() => {
        const fetchMetrics = async () => {
            // Parallel requests for metrics
            const [
                { count: leadsCount },
                { data: salesData },
                { count: messagesCount },
                { count: deliveriesCount }
            ] = await Promise.all([
                supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
                supabase.from('purchases').select('amount').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()), // This month
                supabase.from('messages').select('*', { count: 'exact', head: true }).eq('direction', 'inbound').eq('status', 'delivered'), // Unread/Inbound logic simulation
                supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('is_delivered', false)
            ])

            const totalSales = salesData?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0) || 0

            setMetrics({
                newLeads: leadsCount || 0,
                totalSales,
                activeChats: messagesCount || 0,
                pendingDeliveries: deliveriesCount || 0
            })
        }

        fetchMetrics()

        // Realtime Subscriptions for counters
        const channel = supabase.channel('dashboard-metrics')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchMetrics())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => fetchMetrics())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchMetrics())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return metrics
}

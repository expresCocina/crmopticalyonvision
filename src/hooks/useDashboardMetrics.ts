'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useDashboardMetrics() {
    const [metrics, setMetrics] = useState({
        totalSales: 0,
        newLeads: 0,
        activeChats: 0,
        pendingDeliveries: 0,
        recentActivity: [] as any[]
    })
    const supabase = createClient()

    useEffect(() => {
        const fetchMetrics = async () => {
            // Parallel requests for metrics
            const [
                { count: leadsCount },
                { data: salesData },
                { count: messagesCount },
                { count: deliveriesCount },
                { data: recentLeads },
                { data: recentSales }
            ] = await Promise.all([
                supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
                supabase.from('purchases').select('amount').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()), // This month
                supabase.from('messages').select('*', { count: 'exact', head: true }).eq('direction', 'inbound').eq('status', 'delivered'), // Unread/Inbound logic simulation
                supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('is_delivered', false),
                // Recent Activity Fetching
                supabase.from('leads').select('id, full_name, wa_id, created_at, status').order('created_at', { ascending: false }).limit(5),
                supabase.from('purchases').select('id, amount, created_at, leads(full_name)').order('created_at', { ascending: false }).limit(5)
            ])

            const totalSales = salesData?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0) || 0

            // Process Recent Activity
            const leads = (recentLeads || []).map(l => ({
                id: l.id,
                type: 'lead',
                title: l.full_name || l.wa_id,
                subtitle: l.status === 'nuevo' ? 'Nuevo Lead - WhatsApp' : 'Lead Actualizado',
                date: l.created_at,
                amount: null
            }))

            const sales = (recentSales || []).map(s => ({
                id: s.id,
                type: 'sale',
                title: (s.leads as any)?.full_name || 'Cliente',
                subtitle: 'Compra finalizada',
                date: s.created_at,
                amount: s.amount
            }))

            const recentActivity = [...leads, ...sales]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)

            setMetrics({
                newLeads: leadsCount || 0,
                totalSales,
                activeChats: messagesCount || 0,
                pendingDeliveries: deliveriesCount || 0,
                recentActivity
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

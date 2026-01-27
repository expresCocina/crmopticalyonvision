'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useDashboardMetrics() {
    const [metrics, setMetrics] = useState({
        totalSales: 0,
        newLeads: 0,
        activeChats: 0,
        pendingDeliveries: 0,
        recentActivity: [] as any[],
        salesChartData: [] as any[]
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
                { data: recentSales },
                { data: recentAppointments },
                { data: recentClinicalRecords },
                { data: recentOrderUpdates }
            ] = await Promise.all([
                supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
                supabase.from('purchases').select('amount, created_at').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()), // This month
                supabase.from('messages').select('*', { count: 'exact', head: true }).eq('direction', 'inbound').eq('status', 'delivered'), // Unread/Inbound logic simulation
                supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('is_delivered', false),
                // Recent Activity Fetching - ALL TYPES
                supabase.from('leads').select('id, full_name, wa_id, created_at, status').order('created_at', { ascending: false }).limit(10),
                supabase.from('purchases').select('id, amount, created_at, order_status, leads(full_name)').order('created_at', { ascending: false }).limit(10),
                supabase.from('appointments').select('id, created_at, scheduled_at, reason, leads(full_name)').order('created_at', { ascending: false }).limit(10),
                supabase.from('clinical_records').select('id, created_at, diagnosis, leads(full_name)').order('created_at', { ascending: false }).limit(10),
                supabase.from('purchases').select('id, created_at, order_status, updated_at, leads(full_name)').not('order_status', 'is', null).order('updated_at', { ascending: false }).limit(10)
            ])

            const totalSales = salesData?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0) || 0

            // Process Recent Activity - ALL TYPES
            const leads = (recentLeads || []).map(l => ({
                id: l.id,
                type: 'lead',
                title: l.full_name || l.wa_id,
                subtitle: l.status === 'nuevo' ? '✨ Nuevo Lead - WhatsApp' : 'Lead Actualizado',
                date: l.created_at,
                amount: null
            }))

            const sales = (recentSales || []).map(s => ({
                id: s.id,
                type: 'sale',
                title: (s.leads as any)?.full_name || 'Cliente',
                subtitle: '💰 Compra finalizada',
                date: s.created_at,
                amount: s.amount
            }))

            const appointments = (recentAppointments || []).map(a => ({
                id: a.id,
                type: 'appointment',
                title: (a.leads as any)?.full_name || 'Cliente',
                subtitle: `📅 Cita: ${a.reason || 'Consulta'}`,
                date: a.created_at,
                amount: null
            }))

            const clinicalRecords = (recentClinicalRecords || []).map(c => ({
                id: c.id,
                type: 'clinical',
                title: (c.leads as any)?.full_name || 'Cliente',
                subtitle: `🩺 Registro Clínico: ${c.diagnosis || 'Examen'}`,
                date: c.created_at,
                amount: null
            }))

            const orderUpdates = (recentOrderUpdates || []).map(o => ({
                id: o.id,
                type: 'order',
                title: (o.leads as any)?.full_name || 'Cliente',
                subtitle: `📦 Orden: ${o.order_status === 'pendiente' ? 'Pendiente' :
                    o.order_status === 'en_estudio' ? 'En Estudio' :
                        o.order_status === 'en_entrega' ? 'En Entrega' :
                            o.order_status === 'entregada' ? '✅ Entregada' : 'Actualizada'
                    }`,
                date: o.updated_at || o.created_at,
                amount: null
            }))

            const recentActivity = [...leads, ...sales, ...appointments, ...clinicalRecords, ...orderUpdates]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10) // Show top 10 most recent activities

            // Process Sales Chart Data (Daily Totals for Current Month)
            const salesMap = new Map<string, number>()
            const today = new Date()
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

            // Initialize all days of current month up to today with 0
            for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
                salesMap.set(d.toISOString().split('T')[0], 0)
            }

            salesData?.forEach((sale: any) => {
                const dateKey = new Date(sale.created_at).toISOString().split('T')[0]
                if (salesMap.has(dateKey)) {
                    salesMap.set(dateKey, (salesMap.get(dateKey) || 0) + (sale.amount || 0))
                }
            })

            const salesChartData = Array.from(salesMap.entries()).map(([date, total]) => ({
                date: date.split('-')[2], // Show only day number
                fullDate: date,
                total
            })).sort((a, b) => a.fullDate.localeCompare(b.fullDate))

            setMetrics({
                newLeads: leadsCount || 0,
                totalSales,
                activeChats: messagesCount || 0,
                pendingDeliveries: deliveriesCount || 0,
                recentActivity,
                salesChartData
            })
        }

        fetchMetrics()

        // Realtime Subscriptions for counters and activity
        const channel = supabase.channel('dashboard-metrics')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchMetrics())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => fetchMetrics())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchMetrics())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchMetrics())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clinical_records' }, () => fetchMetrics())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return metrics
}

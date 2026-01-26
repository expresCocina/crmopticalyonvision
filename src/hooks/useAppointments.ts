'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Appointment } from '@/types/database'

export function useAppointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchAppointments = async () => {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
          *,
          leads (
            full_name,
            wa_id
          )
        `)
                .order('scheduled_at', { ascending: true })

            if (error) {
                console.error('Error fetching appointments:', error)
            } else {
                setAppointments(data as any[] || [])
            }
            setLoading(false)
        }

        fetchAppointments()

        const channel = supabase
            .channel('appointments-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'appointments' },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        // Re-fetch to get the join data (lead name) easily
                        fetchAppointments()
                    } else if (payload.eventType === 'UPDATE') {
                        fetchAppointments()
                    } else if (payload.eventType === 'DELETE') {
                        setAppointments((prev) => prev.filter((a) => a.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return { appointments, loading }
}

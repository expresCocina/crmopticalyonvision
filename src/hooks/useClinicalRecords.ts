'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClinicalRecord } from '@/types/database'

export function useClinicalRecords() {
    const [records, setRecords] = useState<ClinicalRecord[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchRecords = async () => {
            const { data, error } = await supabase
                .from('clinical_records')
                .select(`
          *,
          leads (
            full_name,
            wa_id
          )
        `)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching clinical records:', error)
            } else {
                // Map the joined data correctly if needed, simpler to just cast for now
                // The join returns 'leads' as an object inside the record
                const formattedData = data?.map((r: any) => ({
                    ...r,
                    lead: r.leads // Alias for easier access
                }))
                setRecords(formattedData || [])
            }
            setLoading(false)
        }

        fetchRecords()

        const channel = supabase
            .channel('clinical-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'clinical_records' },
                (payload: any) => {
                    // On any change, just refetch to get the joins (simplest for now)
                    fetchRecords()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return { records, loading }
}

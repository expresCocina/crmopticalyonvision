'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Purchase } from '@/types/database'

export function usePurchases() {
    const [purchases, setPurchases] = useState<Purchase[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchPurchases = async () => {
            const { data, error } = await supabase
                .from('purchases')
                .select(`
          *,
          leads (
            full_name,
            wa_id
          )
        `)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching purchases:', error)
            } else {
                const formatted = data?.map((p: any) => ({
                    ...p,
                    lead: p.leads
                }))
                setPurchases(formatted || [])
            }
            setLoading(false)
        }

        fetchPurchases()

        const channel = supabase
            .channel('purchases-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'purchases' },
                () => fetchPurchases()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return { purchases, loading }
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SystemSettings } from '@/types/database'

export function useSystemSettings() {
    const [settings, setSettings] = useState<SystemSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .single()

            if (error) {
                setError(error.message)
                console.error('Error loading system settings:', error)
            } else {
                setSettings(data)
            }
            setLoading(false)
        }

        fetchSettings()

        // Subscribe to changes
        const channel = supabase
            .channel('system_settings_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'system_settings'
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setSettings(payload.new as SystemSettings)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    const updateSettings = async (updates: Partial<SystemSettings>) => {
        if (!settings) return { error: 'Settings not loaded' }

        const { data, error } = await supabase
            .from('system_settings')
            .update(updates)
            .eq('id', settings.id)
            .select()
            .single()

        if (error) {
            return { error: error.message }
        }

        setSettings(data)
        return { data, error: null }
    }

    return { settings, loading, error, updateSettings }
}

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface LeadTag {
    id: string
    lead_id: string
    tag: string
    color: string
    created_at: string
}

// Tags predefinidos con colores
export const PREDEFINED_TAGS = [
    { label: 'Nuevo', value: 'nuevo', color: 'blue' },
    { label: 'Interesado', value: 'interesado', color: 'green' },
    { label: 'Seguimiento', value: 'seguimiento', color: 'yellow' },
    { label: 'En Duda', value: 'en_duda', color: 'orange' },
    { label: 'Cotizado', value: 'cotizado', color: 'purple' },
    { label: 'Cerrado', value: 'cerrado', color: 'emerald' },
    { label: 'Perdido', value: 'perdido', color: 'red' },
    { label: 'Urgente', value: 'urgente', color: 'pink' },
    { label: 'Prospecto', value: 'prospecto', color: 'indigo' },
]

export function useLeadTags(leadId: string | null) {
    const [tags, setTags] = useState<LeadTag[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch tags for a specific lead
    const fetchTags = async () => {
        if (!leadId) {
            setTags([])
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('lead_tags')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setTags(data || [])
        } catch (error) {
            console.error('Error fetching tags:', error)
        } finally {
            setLoading(false)
        }
    }

    // Add a tag to a lead
    const addTag = async (tag: string, color: string = 'blue') => {
        if (!leadId) return

        try {
            const { data, error } = await supabase
                .from('lead_tags')
                .insert({
                    lead_id: leadId,
                    tag,
                    color
                })
                .select()
                .single()

            if (error) {
                // If duplicate, ignore silently
                if (error.code === '23505') {
                    console.log('Tag already exists')
                    return
                }
                throw error
            }

            setTags(prev => [...prev, data])
        } catch (error) {
            console.error('Error adding tag:', error)
        }
    }

    // Remove a tag from a lead
    const removeTag = async (tagId: string) => {
        try {
            const { error } = await supabase
                .from('lead_tags')
                .delete()
                .eq('id', tagId)

            if (error) throw error

            setTags(prev => prev.filter(t => t.id !== tagId))
        } catch (error) {
            console.error('Error removing tag:', error)
        }
    }

    // Subscribe to real-time changes
    useEffect(() => {
        if (!leadId) return

        fetchTags()

        const channel = supabase
            .channel(`lead_tags:${leadId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'lead_tags',
                    filter: `lead_id=eq.${leadId}`
                },
                () => {
                    fetchTags()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [leadId])

    return {
        tags,
        loading,
        addTag,
        removeTag,
        fetchTags
    }
}

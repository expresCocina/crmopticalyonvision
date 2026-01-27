'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MessageTemplate {
    id: string
    name: string
    category: string
    content: string
    variables: string[]
    is_active: boolean
    created_by: string
    created_at: string
    updated_at: string
}

export function useTemplates() {
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchTemplates = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('message_templates')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching templates:', error)
        } else {
            setTemplates(data || [])
        }
        setLoading(false)
    }

    const createTemplate = async (template: Partial<MessageTemplate>) => {
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('message_templates')
            .insert({
                ...template,
                created_by: user?.id
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating template:', error)
            return { success: false, error }
        }

        await fetchTemplates()
        return { success: true, data }
    }

    const updateTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
        const { error } = await supabase
            .from('message_templates')
            .update(updates)
            .eq('id', id)

        if (error) {
            console.error('Error updating template:', error)
            return { success: false, error }
        }

        await fetchTemplates()
        return { success: true }
    }

    const deleteTemplate = async (id: string) => {
        // Soft delete
        const { error } = await supabase
            .from('message_templates')
            .update({ is_active: false })
            .eq('id', id)

        if (error) {
            console.error('Error deleting template:', error)
            return { success: false, error }
        }

        await fetchTemplates()
        return { success: true }
    }

    useEffect(() => {
        fetchTemplates()

        // Subscribe to changes
        const channel = supabase
            .channel('templates-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'message_templates'
                },
                () => {
                    fetchTemplates()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return {
        templates,
        loading,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        refreshTemplates: fetchTemplates
    }
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface MessageTemplate {
    id: string
    name: string
    content: string
    category: string | null
    whatsapp_name?: string
    whatsapp_language?: string
    is_official?: boolean
    created_at: string
    updated_at: string
}

export function useMessageTemplates() {
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const fetchTemplates = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('message_templates')
                .select('*')
                .order('category', { ascending: true })
                .order('name', { ascending: true })

            if (error) throw error

            setTemplates(data as MessageTemplate[])
        } catch (error) {
            console.error('Error fetching templates:', error)
            toast.error('Error al cargar plantillas')
        } finally {
            setLoading(false)
        }
    }

    const createTemplate = async (
        name: string,
        content: string,
        category: string | null = null
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('message_templates')
                .insert({
                    name,
                    content,
                    category
                })

            if (error) {
                if (error.code === '23505') {
                    toast.error('Ya existe una plantilla con ese nombre')
                } else {
                    throw error
                }
                return false
            }

            toast.success('Plantilla creada')
            await fetchTemplates()
            return true
        } catch (error) {
            console.error('Error creating template:', error)
            toast.error('Error al crear plantilla')
            return false
        }
    }

    const updateTemplate = async (
        id: string,
        updates: Partial<Pick<MessageTemplate, 'name' | 'content' | 'category'>>
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('message_templates')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            toast.success('Plantilla actualizada')
            await fetchTemplates()
            return true
        } catch (error) {
            console.error('Error updating template:', error)
            toast.error('Error al actualizar plantilla')
            return false
        }
    }

    const deleteTemplate = async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('message_templates')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success('Plantilla eliminada')
            await fetchTemplates()
            return true
        } catch (error) {
            console.error('Error deleting template:', error)
            toast.error('Error al eliminar plantilla')
            return false
        }
    }

    useEffect(() => {
        fetchTemplates()

        // Suscribirse a cambios en tiempo real
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
        fetchTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate
    }
}

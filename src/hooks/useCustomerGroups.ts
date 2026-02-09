'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface CustomerGroup {
    id: string
    name: string
    description: string | null
    color: string
    member_count?: number
    created_at: string
    updated_at: string
}

export interface GroupMember {
    id: string
    wa_id: string
    full_name: string | null
    status: string
}

export function useCustomerGroups() {
    const [groups, setGroups] = useState<CustomerGroup[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    /**
     * Obtener todos los grupos con conteo de miembros
     */
    const fetchGroups = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('group_member_counts')
                .select('*')
                .order('name')

            if (error) throw error

            setGroups(data as CustomerGroup[])
        } catch (error) {
            console.error('Error fetching groups:', error)
            toast.error('Error al cargar grupos')
        } finally {
            setLoading(false)
        }
    }

    /**
     * Crear un nuevo grupo
     */
    const createGroup = async (
        name: string,
        description: string | null = null,
        color: string = '#3b82f6'
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('customer_groups')
                .insert({
                    name,
                    description,
                    color
                })

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.error('Ya existe un grupo con ese nombre')
                } else {
                    throw error
                }
                return false
            }

            toast.success('Grupo creado exitosamente')
            await fetchGroups()
            return true
        } catch (error) {
            console.error('Error creating group:', error)
            toast.error('Error al crear grupo')
            return false
        }
    }

    /**
     * Actualizar un grupo existente
     */
    const updateGroup = async (
        id: string,
        updates: Partial<Pick<CustomerGroup, 'name' | 'description' | 'color'>>
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('customer_groups')
                .update(updates)
                .eq('id', id)

            if (error) {
                if (error.code === '23505') {
                    toast.error('Ya existe un grupo con ese nombre')
                } else {
                    throw error
                }
                return false
            }

            toast.success('Grupo actualizado')
            await fetchGroups()
            return true
        } catch (error) {
            console.error('Error updating group:', error)
            toast.error('Error al actualizar grupo')
            return false
        }
    }

    /**
     * Eliminar un grupo
     */
    const deleteGroup = async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('customer_groups')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success('Grupo eliminado')
            await fetchGroups()
            return true
        } catch (error) {
            console.error('Error deleting group:', error)
            toast.error('Error al eliminar grupo')
            return false
        }
    }

    /**
     * Obtener miembros de un grupo
     */
    const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
        try {
            const { data, error } = await supabase
                .rpc('get_group_leads', { group_uuid: groupId })

            if (error) throw error

            return data as GroupMember[]
        } catch (error) {
            console.error('Error fetching group members:', error)
            toast.error('Error al cargar miembros del grupo')
            return []
        }
    }

    /**
     * Agregar leads a un grupo
     */
    const addLeadsToGroup = async (
        groupId: string,
        leadIds: string[]
    ): Promise<boolean> => {
        try {
            const relations = leadIds.map(leadId => ({
                group_id: groupId,
                lead_id: leadId
            }))

            const { error } = await supabase
                .from('lead_groups')
                .insert(relations)

            if (error) {
                // Ignorar errores de duplicados (ya están en el grupo)
                if (error.code !== '23505') {
                    throw error
                }
            }

            toast.success(`${leadIds.length} cliente(s) agregado(s) al grupo`)
            await fetchGroups()
            return true
        } catch (error) {
            console.error('Error adding leads to group:', error)
            toast.error('Error al agregar clientes al grupo')
            return false
        }
    }

    /**
     * Remover leads de un grupo
     */
    const removeLeadsFromGroup = async (
        groupId: string,
        leadIds: string[]
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('lead_groups')
                .delete()
                .eq('group_id', groupId)
                .in('lead_id', leadIds)

            if (error) throw error

            toast.success(`${leadIds.length} cliente(s) removido(s) del grupo`)
            await fetchGroups()
            return true
        } catch (error) {
            console.error('Error removing leads from group:', error)
            toast.error('Error al remover clientes del grupo')
            return false
        }
    }

    /**
     * Obtener grupos de un lead específico
     */
    const getLeadGroups = async (leadId: string): Promise<CustomerGroup[]> => {
        try {
            const { data, error } = await supabase
                .rpc('get_lead_groups', { lead_uuid: leadId })

            if (error) throw error

            return data as CustomerGroup[]
        } catch (error) {
            console.error('Error fetching lead groups:', error)
            return []
        }
    }

    /**
     * Verificar si un lead está en un grupo
     */
    const isLeadInGroup = async (leadId: string, groupId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('lead_groups')
                .select('id')
                .eq('lead_id', leadId)
                .eq('group_id', groupId)
                .single()

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
                throw error
            }

            return !!data
        } catch (error) {
            console.error('Error checking lead in group:', error)
            return false
        }
    }

    // Cargar grupos al montar el componente
    useEffect(() => {
        fetchGroups()

        // Suscribirse a cambios en tiempo real
        const channel = supabase
            .channel('customer-groups-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'customer_groups'
                },
                () => {
                    fetchGroups()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'lead_groups'
                },
                () => {
                    fetchGroups()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return {
        groups,
        loading,
        fetchGroups,
        createGroup,
        updateGroup,
        deleteGroup,
        getGroupMembers,
        addLeadsToGroup,
        removeLeadsFromGroup,
        getLeadGroups,
        isLeadInGroup
    }
}

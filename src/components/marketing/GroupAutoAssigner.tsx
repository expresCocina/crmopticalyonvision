'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface GroupAutoAssignerProps {
    onComplete?: () => void
}

export function GroupAutoAssigner({ onComplete }: GroupAutoAssignerProps) {
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const handleAutoAssign = async () => {
        setLoading(true)
        toast.loading('Asignando clientes a grupos...')

        try {
            const { data, error } = await supabase.rpc('auto_assign_customer_groups', {
                batch_size: 50,
                group_prefix: 'Grupo'
            })

            toast.dismiss()

            if (error) {
                console.error('Error auto-assigning groups:', error)
                toast.error('Error al asignar grupos')
                return
            }

            const groupCount = data?.length || 0
            toast.success(`✅ ${groupCount} grupos creados exitosamente`)

            // Mostrar detalles de los grupos creados
            if (data && data.length > 0) {
                console.log('Grupos creados:', data)
                data.forEach((group: any) => {
                    console.log(`- ${group.group_name}: ${group.customer_count} clientes`)
                })
            }

            onComplete?.()

        } catch (error) {
            console.error('Error:', error)
            toast.dismiss()
            toast.error('Error inesperado al asignar grupos')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleAutoAssign}
            disabled={loading}
            variant="outline"
            className="gap-2"
        >
            {loading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Asignando...
                </>
            ) : (
                <>
                    <Users className="h-4 w-4" />
                    Auto-asignar Grupos de 50
                </>
            )}
        </Button>
    )
}

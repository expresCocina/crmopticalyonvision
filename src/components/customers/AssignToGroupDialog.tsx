'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useCustomerGroups } from '@/hooks/useCustomerGroups'
import { Loader2 } from 'lucide-react'

interface AssignToGroupDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedLeadIds: string[]
    onAssignComplete?: () => void
}

export function AssignToGroupDialog({
    open,
    onOpenChange,
    selectedLeadIds,
    onAssignComplete
}: AssignToGroupDialogProps) {
    const { groups, addLeadsToGroup, removeLeadsFromGroup, loading } = useCustomerGroups()
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [assigning, setAssigning] = useState(false)

    const handleToggleGroup = (groupId: string) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        )
    }

    const handleAssign = async () => {
        if (selectedGroups.length === 0) return

        setAssigning(true)
        try {
            // Asignar a todos los grupos seleccionados
            // Nota: Esto podría optimizarse en el backend para hacer una sola llamada
            // pero por ahora iteramos por simplicidad
            for (const groupId of selectedGroups) {
                await addLeadsToGroup(groupId, selectedLeadIds)
            }

            if (onAssignComplete) {
                onAssignComplete()
            }
            onOpenChange(false)
        } finally {
            setAssigning(false)
            setSelectedGroups([])
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Asignar a Grupo</DialogTitle>
                    <DialogDescription>
                        Agrega {selectedLeadIds.length} cliente(s) seleccionado(s) a uno o más grupos.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground">
                            No tienes grupos creados.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
                            {groups.map((group) => (
                                <label
                                    key={group.id}
                                    className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                                >
                                    <Checkbox
                                        checked={selectedGroups.includes(group.id)}
                                        onCheckedChange={() => handleToggleGroup(group.id)}
                                    />
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: group.color }}
                                    />
                                    <span className="text-sm font-medium leading-none">
                                        {group.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAssign}
                            disabled={selectedGroups.length === 0 || assigning}
                        >
                            {assigning ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Asignando...
                                </>
                            ) : (
                                'Asignar'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

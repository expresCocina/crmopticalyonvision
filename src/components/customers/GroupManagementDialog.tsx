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
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { useCustomerGroups, type CustomerGroup } from '@/hooks/useCustomerGroups'
import { CreateGroupDialog } from './CreateGroupDialog'
import { GroupBadge } from './GroupBadge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface GroupManagementDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function GroupManagementDialog({ open, onOpenChange }: GroupManagementDialogProps) {
    const { groups, loading, createGroup, updateGroup, deleteGroup } = useCustomerGroups()
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null)
    const [groupToDelete, setGroupToDelete] = useState<CustomerGroup | null>(null)

    const handleCreate = async (name: string, description: string, color: string) => {
        return await createGroup(name, description, color)
    }

    const handleUpdate = async (name: string, description: string, color: string) => {
        if (!editingGroup) return false
        return await updateGroup(editingGroup.id, { name, description, color })
    }

    const handleDelete = async () => {
        if (!groupToDelete) return
        await deleteGroup(groupToDelete.id)
        setGroupToDelete(null)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Gestionar Grupos</span>
                        <Button size="sm" onClick={() => {
                            setEditingGroup(null)
                            setShowCreateDialog(true)
                        }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Grupo
                        </Button>
                    </DialogTitle>
                    <DialogDescription>
                        Crea y administra grupos para organizar tus clientes
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Cargando grupos...
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-lg font-medium">No hay grupos creados</p>
                            <p className="text-sm text-muted-foreground mb-4">
                                Crea tu primer grupo para empezar a organizar clientes
                            </p>
                            <Button onClick={() => {
                                setEditingGroup(null)
                                setShowCreateDialog(true)
                            }}>
                                Crear Grupo
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {groups.map((group) => (
                                <div
                                    key={group.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: group.color }}
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{group.name}</span>
                                                <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                                    {group.member_count || 0} miembros
                                                </span>
                                            </div>
                                            {group.description && (
                                                <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                                    {group.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditingGroup(group)
                                                setShowCreateDialog(true)
                                            }}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setGroupToDelete(group)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Diálogo de Crear/Editar */}
                <CreateGroupDialog
                    open={showCreateDialog}
                    onOpenChange={setShowCreateDialog}
                    onSave={editingGroup ? handleUpdate : handleCreate}
                    editingGroup={editingGroup}
                />

                {/* Confirmación de Eliminar */}
                <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar grupo "{groupToDelete?.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará el grupo permanentemente.
                                Los clientes asignados NO se borrarán, solo se quitarán de este grupo.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    )
}

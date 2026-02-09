'use client'

import { useState, useMemo } from 'react'
import { useCustomers, type CustomerSegment } from '@/hooks/useCustomers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Search, Send, Users, Upload, Tags, FolderPlus } from 'lucide-react'
import { CustomerSegmentTabs } from '@/components/customers/CustomerSegmentTabs'
import { BulkMessageDialog } from '@/components/customers/BulkMessageDialog'
import { ImportCustomersDialog } from '@/components/customers/ImportCustomersDialog'
import { GroupManagementDialog } from '@/components/customers/GroupManagementDialog'
import { AssignToGroupDialog } from '@/components/customers/AssignToGroupDialog'
import { GroupFilter } from '@/components/customers/GroupFilter'
import { GroupBadge } from '@/components/customers/GroupBadge'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function CustomersPage() {
    const [segment, setSegment] = useState<CustomerSegment>('all')
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [showBulkDialog, setShowBulkDialog] = useState(false)
    const [showImportDialog, setShowImportDialog] = useState(false)
    const [showGroupsDialog, setShowGroupsDialog] = useState(false)
    const [showAssignDialog, setShowAssignDialog] = useState(false)

    // Pass selectedGroupId to useCustomers hook
    const {
        customers,
        loading,
        selectedIds,
        toggleSelection,
        selectAll,
        clearSelection,
        sendBulkMessage,
        fetchCustomers
    } = useCustomers(segment, selectedGroupId)

    // Calculate segment counts
    const segmentCounts = useMemo(() => {
        const all = customers.length
        const frios = customers.filter(c => ['nuevo', 'no_responde'].includes(c.status)).length
        const proceso = customers.filter(c => ['interesado', 'cotizado', 'agendado'].includes(c.status)).length
        const activos = customers.filter(c => ['cliente', 'recurrente'].includes(c.status)).length

        return { all, frios, proceso, activos }
    }, [customers])

    // Filter by search
    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers

        const term = searchTerm.toLowerCase()
        return customers.filter(c =>
            (c.full_name?.toLowerCase() || '').includes(term) ||
            c.wa_id.includes(term)
        )
    }, [customers, searchTerm])

    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; color: string }> = {
            nuevo: { label: 'Nuevo', color: 'bg-blue-100 text-blue-700' },
            interesado: { label: 'Interesado', color: 'bg-yellow-100 text-yellow-700' },
            cotizado: { label: 'Cotizado', color: 'bg-purple-100 text-purple-700' },
            agendado: { label: 'Agendado', color: 'bg-indigo-100 text-indigo-700' },
            no_responde: { label: 'No Responde', color: 'bg-gray-100 text-gray-700' },
            no_compro: { label: 'No Compró', color: 'bg-red-100 text-red-700' },
            cliente: { label: 'Cliente', color: 'bg-green-100 text-green-700' },
            recurrente: { label: 'Recurrente', color: 'bg-emerald-100 text-emerald-700' }
        }

        const { label, color } = config[status] || { label: status, color: 'bg-gray-100 text-gray-700' }

        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                {label}
            </span>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Gestión de Clientes</h1>
                    <p className="text-sm text-muted-foreground">
                        Segmenta y envía mensajes masivos a tus clientes
                    </p>
                </div>
                {/* Botón Gestión de Grupos */}
                <div className="flex gap-2">
                    <Button onClick={() => setShowGroupsDialog(true)} variant="outline">
                        <Tags className="h-4 w-4 mr-2" />
                        Gestionar Grupos
                    </Button>
                </div>
            </div>

            {/* Segment Tabs */}
            <CustomerSegmentTabs
                activeSegment={segment}
                onSegmentChange={setSegment}
                counts={segmentCounts}
            />

            {/* Actions Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                        {/* Filtros y Búsqueda */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o teléfono..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Filtro de Grupo */}
                            <div className="md:w-auto w-full">
                                <GroupFilter
                                    selectedGroupId={selectedGroupId}
                                    onGroupChange={setSelectedGroupId}
                                />
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex flex-wrap gap-2 justify-end items-center">
                            <Button
                                variant="outline"
                                onClick={() => setShowImportDialog(true)}
                                size="sm"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Importar
                            </Button>

                            {selectedIds.length > 0 ? (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={clearSelection}
                                        size="sm"
                                    >
                                        Limpiar ({selectedIds.length})
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowAssignDialog(true)}
                                        size="sm"
                                        className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    >
                                        <FolderPlus className="h-4 w-4 mr-2" />
                                        Asignar a Grupo
                                    </Button>
                                    <Button
                                        onClick={() => setShowBulkDialog(true)}
                                        size="sm"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Enviar Mensaje
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={selectAll}
                                    disabled={filteredCustomers.length === 0}
                                    size="sm"
                                >
                                    Seleccionar Todos
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Customers Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Clientes ({filteredCustomers.length})
                        {selectedGroupId && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                (Filtrado por grupo)
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-lg font-medium text-muted-foreground">
                                No se encontraron clientes
                            </p>
                            {selectedGroupId && (
                                <Button
                                    variant="link"
                                    onClick={() => setSelectedGroupId(null)}
                                    className="mt-2"
                                >
                                    Limpiar filtro de grupo
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium text-sm w-12">
                                            <Checkbox
                                                checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                                                onCheckedChange={(checked) => {
                                                    if (checked) selectAll()
                                                    else clearSelection()
                                                }}
                                            />
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Cliente</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Grupos</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Estado</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Última Interacción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((customer) => (
                                        <tr key={customer.id} className="border-b hover:bg-muted/50">
                                            <td className="py-3 px-4">
                                                <Checkbox
                                                    checked={selectedIds.includes(customer.id)}
                                                    onCheckedChange={() => toggleSelection(customer.id)}
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <div>
                                                    <div className="font-medium text-sm">
                                                        {customer.full_name || 'Sin nombre'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {customer.wa_id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {customer.groups && customer.groups.length > 0 ? (
                                                        customer.groups.map(group => (
                                                            <GroupBadge
                                                                key={group.id}
                                                                name={group.name}
                                                                color={group.color}
                                                            />
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                {getStatusBadge(customer.status)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {formatDistanceToNow(parseISO(customer.last_interaction), {
                                                    addSuffix: true,
                                                    locale: es
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs */}
            <BulkMessageDialog
                open={showBulkDialog}
                onOpenChange={setShowBulkDialog}
                selectedCount={selectedIds.length}
                onSend={sendBulkMessage}
            />

            <ImportCustomersDialog
                open={showImportDialog}
                onOpenChange={setShowImportDialog}
                onImportComplete={() => {
                    fetchCustomers()
                }}
            />

            <GroupManagementDialog
                open={showGroupsDialog}
                onOpenChange={setShowGroupsDialog}
            />

            <AssignToGroupDialog
                open={showAssignDialog}
                onOpenChange={setShowAssignDialog}
                selectedLeadIds={selectedIds}
                onAssignComplete={() => {
                    // Refresh customers to show new group badges
                    fetchCustomers()
                    // Optional: Keep selection or clear it
                    // clearSelection()
                }}
            />
        </div>
    )
}

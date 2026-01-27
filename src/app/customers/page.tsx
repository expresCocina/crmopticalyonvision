'use client'

import { useState, useMemo } from 'react'
import { useCustomers, type CustomerSegment } from '@/hooks/useCustomers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Search, Send, Users } from 'lucide-react'
import { CustomerSegmentTabs } from '@/components/customers/CustomerSegmentTabs'
import { BulkMessageDialog } from '@/components/customers/BulkMessageDialog'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function CustomersPage() {
    const [segment, setSegment] = useState<CustomerSegment>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [showBulkDialog, setShowBulkDialog] = useState(false)

    const { customers, loading, selectedIds, toggleSelection, selectAll, clearSelection, sendBulkMessage } = useCustomers(segment)

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
                        <div className="flex gap-2">
                            {selectedIds.length > 0 ? (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={clearSelection}
                                    >
                                        Limpiar ({selectedIds.length})
                                    </Button>
                                    <Button
                                        onClick={() => setShowBulkDialog(true)}
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
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No se encontraron clientes
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium text-sm w-12">
                                            <Checkbox
                                                checked={selectedIds.length === filteredCustomers.length}
                                                onCheckedChange={(checked) => {
                                                    if (checked) selectAll()
                                                    else clearSelection()
                                                }}
                                            />
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Cliente</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Estado</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Última Interacción</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Último Recordatorio</th>
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
                                                {getStatusBadge(customer.status)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {formatDistanceToNow(parseISO(customer.last_interaction), {
                                                    addSuffix: true,
                                                    locale: es
                                                })}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {customer.last_reminder_sent
                                                    ? formatDistanceToNow(parseISO(customer.last_reminder_sent), {
                                                        addSuffix: true,
                                                        locale: es
                                                    })
                                                    : 'Nunca'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bulk Message Dialog */}
            <BulkMessageDialog
                open={showBulkDialog}
                onOpenChange={setShowBulkDialog}
                selectedCount={selectedIds.length}
                onSend={sendBulkMessage}
            />
        </div>
    )
}

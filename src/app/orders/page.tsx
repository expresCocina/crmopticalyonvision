'use client'

import { useState } from 'react'
import { useOrders, OrderStatus } from '@/hooks/useOrders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Package } from 'lucide-react'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function OrdersPage() {
    const { orders, loading, updateOrderStatus } = useOrders()
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
    const [newStatus, setNewStatus] = useState<OrderStatus | null>(null)
    const [deliveryNotes, setDeliveryNotes] = useState('')
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            (order.leads?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.leads?.wa_id || '').includes(searchTerm) ||
            (order.product_summary?.toLowerCase() || '').includes(searchTerm.toLowerCase())

        const matchesStatus = filterStatus === 'all' || order.order_status === filterStatus

        return matchesSearch && matchesStatus
    })

    const handleStatusChange = (orderId: string, status: OrderStatus) => {
        setSelectedOrder(orderId)
        setNewStatus(status)

        // Show confirmation dialog for 'entregada' status
        if (status === 'entregada') {
            setShowConfirmDialog(true)
        } else {
            confirmStatusChange()
        }
    }

    const confirmStatusChange = async () => {
        if (!selectedOrder || !newStatus) return

        await updateOrderStatus(selectedOrder, newStatus, deliveryNotes || undefined)

        // Reset state
        setSelectedOrder(null)
        setNewStatus(null)
        setDeliveryNotes('')
        setShowConfirmDialog(false)
    }

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency || 'COP',
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Gestión de Órdenes</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra el estado de las órdenes de tus clientes
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por cliente, producto o teléfono..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as OrderStatus | 'all')}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="en_estudio">En Estudio</SelectItem>
                                <SelectItem value="en_entrega">En Entrega</SelectItem>
                                <SelectItem value="entregada">Entregada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Órdenes ({filteredOrders.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No se encontraron órdenes
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium text-sm">Cliente</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Producto</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Monto</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Estado</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Fecha</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id} className="border-b hover:bg-muted/50">
                                            <td className="py-3 px-4">
                                                <div>
                                                    <div className="font-medium text-sm">
                                                        {order.leads?.full_name || 'Sin nombre'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {order.leads?.wa_id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                {order.product_summary || 'Sin descripción'}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-medium">
                                                {formatCurrency(order.amount, order.currency)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <OrderStatusBadge status={order.order_status} />
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {format(parseISO(order.created_at), 'dd MMM yyyy', { locale: es })}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Select
                                                    value={order.order_status}
                                                    onValueChange={(v) => handleStatusChange(order.id, v as OrderStatus)}
                                                >
                                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                                                        <SelectItem value="en_estudio">🔍 En Estudio</SelectItem>
                                                        <SelectItem value="en_entrega">🚚 En Entrega</SelectItem>
                                                        <SelectItem value="entregada">✅ Entregada</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialog for Delivery */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Entrega</DialogTitle>
                        <DialogDescription>
                            Se enviará una notificación automática por WhatsApp al cliente confirmando la entrega.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Notas de entrega (opcional)
                            </label>
                            <Textarea
                                placeholder="Ej: Entregado en recepción, firmado por..."
                                value={deliveryNotes}
                                onChange={(e) => setDeliveryNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowConfirmDialog(false)
                                setDeliveryNotes('')
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={confirmStatusChange}>
                            Confirmar Entrega
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

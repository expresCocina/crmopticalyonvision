'use client'

import { useState } from 'react'
import { usePurchases } from "@/hooks/usePurchases"
import { useLeads } from "@/hooks/useLeads"
import { PurchaseForm } from "@/components/purchases/PurchaseForm"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingBag, Calendar, User } from "lucide-react"
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

export default function PurchasesPage() {
    const { purchases, loading } = usePurchases()
    const { leads } = useLeads()
    const [selectedLeadId, setSelectedLeadId] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    if (loading) return <div className="flex items-center justify-center p-8">Cargando...</div>

    const currencyFormatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    })

    return (
        <div className="h-full flex flex-col space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">Registro de Ventas</h2>
                    <p className="text-sm text-muted-foreground">Historial de transacciones y órdenes</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-h-[44px]">
                            <ShoppingBag className="h-4 w-4" /> Registrar Venta
                        </button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Seleccionar Cliente</label>
                                <select
                                    className="w-full p-2 border rounded text-sm"
                                    onChange={(e) => setSelectedLeadId(e.target.value)}
                                    value={selectedLeadId}
                                >
                                    <option value="">-- Buscar Cliente --</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.full_name || l.wa_id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedLeadId && (
                                <PurchaseForm
                                    leadId={selectedLeadId}
                                    onSuccess={() => {
                                        setIsDialogOpen(false)
                                        setSelectedLeadId('')
                                    }}
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Mobile: Cards, Desktop: Table */}
            <div className="hidden md:block rounded-md border bg-card overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fecha</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cliente</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Detalle</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Monto</th>
                            <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Estado</th>
                            <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Entrega</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {purchases.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-4 text-center text-muted-foreground">No hay ventas registradas</td>
                            </tr>
                        )}
                        {purchases.map((sale) => (
                            <tr key={sale.id} className="border-b transition-colors hover:bg-muted/50">
                                <td className="p-4 align-middle">
                                    {format(parseISO(sale.created_at), 'dd MMM yyyy', { locale: es })}
                                </td>
                                <td className="p-4 align-middle font-medium">
                                    {/* @ts-ignore join */}
                                    {sale.lead?.full_name || 'Desconocido'}
                                </td>
                                <td className="p-4 align-middle truncate max-w-[200px]">
                                    {sale.product_summary}
                                </td>
                                <td className="p-4 align-middle text-right font-bold">
                                    {currencyFormatter.format(sale.amount)}
                                </td>
                                <td className="p-4 align-middle text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${sale.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {sale.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                    </span>
                                </td>
                                <td className="p-4 align-middle text-center text-xs text-muted-foreground">
                                    {sale.delivery_date ? format(parseISO(sale.delivery_date), 'dd MMM') : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {purchases.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay ventas registradas</p>
                )}
                {purchases.map((sale) => (
                    <Card key={sale.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <User className="h-4 w-4 text-primary flex-shrink-0" />
                                    <span className="font-medium text-sm truncate">
                                        {/* @ts-ignore join */}
                                        {sale.lead?.full_name || 'Desconocido'}
                                    </span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${sale.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {sale.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2">{sale.product_summary}</p>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-xl font-bold text-primary">{currencyFormatter.format(sale.amount)}</span>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {format(parseISO(sale.created_at), 'dd MMM', { locale: es })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { usePurchases } from "@/hooks/usePurchases"
import { useLeads } from "@/hooks/useLeads"
import { PurchaseForm } from "@/components/purchases/PurchaseForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, Calendar, CheckCircle2, Clock } from "lucide-react"
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

export default function PurchasesPage() {
    const { purchases, loading } = usePurchases()
    const { leads } = useLeads()
    const [selectedLeadId, setSelectedLeadId] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    if (loading) return <div>Cargando...</div>

    // Create a formatter
    const currencyFormatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    })

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Registro de Ventas</h2>
                    <p className="text-sm text-muted-foreground">Historial de transacciones y órdenes</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" /> Registrar Venta
                        </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
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

            <div className="rounded-md border bg-card">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
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
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, DollarSign } from 'lucide-react'
import { toast } from "sonner"

export function PurchaseForm({ leadId, onSuccess }: { leadId: string, onSuccess: () => void }) {
    const supabase = createClient()
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        product_summary: '',
        amount: '',
        currency: 'COP',
        status: 'paid',
        delivery_date: ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        if (!formData.product_summary || !formData.amount) {
            toast.error("Por favor complete los campos obligatorios")
            setSaving(false)
            return
        }

        const { error } = await supabase.from('purchases').insert({
            lead_id: leadId,
            product_summary: formData.product_summary,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            status: formData.status,
            delivery_date: formData.delivery_date || null
        })

        if (error) {
            toast.error("Error al registrar venta: " + error.message)
        } else {
            toast.success("Venta registrada exitosamente", {
                description: formData.status === 'paid' ? "El cliente ha sido actualizado." : "Venta pendiente registrada."
            })
            onSuccess()
        }
        setSaving(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-3 md:p-4 bg-card">
            <h3 className="font-semibold text-base md:text-lg">Registrar Venta</h3>

            <div className="space-y-2">
                <label className="text-sm font-medium">Producto / Servicio</label>
                <input
                    name="product_summary"
                    placeholder="Ej: Lentes Transitions + Montura"
                    className="w-full p-2 md:p-3 border rounded text-sm min-h-[44px]"
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Monto</label>
                    <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 md:top-3 h-4 w-4 text-muted-foreground" />
                        <input
                            name="amount"
                            type="number"
                            placeholder="0.00"
                            className="w-full pl-8 p-2 md:p-3 border rounded text-sm min-h-[44px]"
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Moneda</label>
                    <select name="currency" className="w-full p-2 md:p-3 border rounded text-sm min-h-[44px]" onChange={handleChange} value={formData.currency}>
                        <option value="COP">COP</option>
                        <option value="USD">USD</option>
                        <option value="MXN">MXN</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Estado Pago</label>
                    <select name="status" className="w-full p-2 md:p-3 border rounded text-sm min-h-[44px]" onChange={handleChange} value={formData.status}>
                        <option value="paid">Pagado</option>
                        <option value="pending">Pendiente</option>
                        <option value="refunded">Reembolsado</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Entrega Estimada</label>
                    <input
                        name="delivery_date"
                        type="date"
                        className="w-full p-2 md:p-3 border rounded text-sm min-h-[44px]"
                        onChange={handleChange}
                    />
                </div>
            </div>

            <button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold flex items-center justify-center gap-2 min-h-[44px]">
                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirmar Venta"}
            </button>
        </form>
    )
}

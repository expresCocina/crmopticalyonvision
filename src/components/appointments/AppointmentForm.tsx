'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useLeads } from '@/hooks/useLeads'

export function AppointmentForm({ onSuccess }: { onSuccess: () => void }) {
    const supabase = createClient()
    const { leads, loading: loadingLeads } = useLeads()
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        lead_id: '',
        scheduled_at: '',
        reason: 'Examen Visual',
        notes: ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.lead_id || !formData.scheduled_at) {
            toast.error("Por favor complete los campos obligatorios")
            return
        }

        setSaving(true)

        const { error } = await supabase.from('appointments').insert({
            lead_id: formData.lead_id,
            scheduled_at: new Date(formData.scheduled_at).toISOString(),
            status: 'pendiente',
            reason: formData.reason,
            notes: formData.notes
        })

        if (error) {
            toast.error("Error al agendar cita: " + error.message)
        } else {
            toast.success("Cita agendada correctamente", {
                description: "El estado del lead será actualizado automáticamente."
            })
            onSuccess()
        }
        setSaving(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <h3 className="font-semibold text-lg">Nueva Cita</h3>
                <p className="text-sm text-muted-foreground">Agendar cita manual para un cliente existente.</p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Paciente (Lead)</label>
                <select
                    name="lead_id"
                    className="w-full p-2 border rounded text-sm bg-background"
                    onChange={handleChange}
                    value={formData.lead_id}
                    disabled={loadingLeads}
                >
                    <option value="">-- Seleccionar Paciente --</option>
                    {leads.map(l => (
                        <option key={l.id} value={l.id}>
                            {l.full_name || l.wa_id} ({l.status})
                        </option>
                    ))}
                </select>
                {loadingLeads && <p className="text-xs text-muted-foreground">Cargando pacientes...</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha y Hora</label>
                    <input
                        name="scheduled_at"
                        type="datetime-local"
                        className="w-full p-2 border rounded text-sm bg-background"
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Motivo</label>
                    <select
                        name="reason"
                        className="w-full p-2 border rounded text-sm bg-background"
                        onChange={handleChange}
                        value={formData.reason}
                    >
                        <option value="Examen Visual">Examen Visual</option>
                        <option value="Entrega de Lentes">Entrega de Lentes</option>
                        <option value="Ajuste / Garantía">Ajuste / Garantía</option>
                        <option value="Consulta General">Consulta General</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Notas</label>
                <textarea
                    name="notes"
                    placeholder="Detalles adicionales..."
                    className="w-full p-2 border rounded text-sm bg-background min-h-[80px]"
                    onChange={handleChange}
                />
            </div>

            <button type="submit" disabled={saving || loadingLeads} className="w-full bg-primary text-primary-foreground py-2 rounded-md font-bold flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirmar Cita"}
            </button>
        </form>
    )
}

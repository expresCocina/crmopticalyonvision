'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save } from 'lucide-react'

export function ClinicalRecordForm({ leadId, onSuccess }: { leadId: string, onSuccess: () => void }) {
    const supabase = createClient()
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        od_sph: '', od_cyl: '', od_axis: '', od_add: '',
        oi_sph: '', oi_cyl: '', oi_axis: '', oi_add: '',
        diagnosis: '',
        recommendations: '',
        description: 'Examen General'
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const rx_data = {
            od: { sph: formData.od_sph, cyl: formData.od_cyl, axis: formData.od_axis, add: formData.od_add },
            oi: { sph: formData.oi_sph, cyl: formData.oi_cyl, axis: formData.oi_axis, add: formData.oi_add }
        }

        const { error } = await supabase.from('clinical_records').insert({
            lead_id: leadId,
            rx_data,
            diagnosis: formData.diagnosis,
            recommendations: formData.recommendations,
            description: formData.description
        })

        if (error) {
            alert('Error creando historia: ' + error.message)
        } else {
            onSuccess()
            // Clear form?
        }
        setSaving(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-card">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                Nueva Historia Clínica
            </h3>

            {/* RX Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-md">
                {/* Ojo Derecho */}
                <div className="space-y-2">
                    <span className="font-bold text-primary text-sm">OJO DERECHO (OD)</span>
                    <div className="grid grid-cols-3 gap-2">
                        <input name="od_sph" placeholder="Esfera" className="p-2 border rounded text-xs" onChange={handleChange} required />
                        <input name="od_cyl" placeholder="Cilindro" className="p-2 border rounded text-xs" onChange={handleChange} required />
                        <input name="od_axis" placeholder="Eje" className="p-2 border rounded text-xs" onChange={handleChange} required />
                    </div>
                    <input name="od_add" placeholder="Adición (Near)" className="w-full p-2 border rounded text-xs" onChange={handleChange} />
                </div>

                {/* Ojo Izquierdo */}
                <div className="space-y-2">
                    <span className="font-bold text-primary text-sm">OJO IZQUIERDO (OI)</span>
                    <div className="grid grid-cols-3 gap-2">
                        <input name="oi_sph" placeholder="Esfera" className="p-2 border rounded text-xs" onChange={handleChange} required />
                        <input name="oi_cyl" placeholder="Cilindro" className="p-2 border rounded text-xs" onChange={handleChange} required />
                        <input name="oi_axis" placeholder="Eje" className="p-2 border rounded text-xs" onChange={handleChange} required />
                    </div>
                    <input name="oi_add" placeholder="Adición (Near)" className="w-full p-2 border rounded text-xs" onChange={handleChange} />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Diagnóstico</label>
                <textarea name="diagnosis" className="w-full p-2 border rounded min-h-[60px]" onChange={handleChange} required />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Recomendaciones</label>
                <textarea name="recommendations" className="w-full p-2 border rounded min-h-[60px]" onChange={handleChange} />
            </div>

            <button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground py-2 rounded-md font-bold flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Historia
            </button>
        </form>
    )
}

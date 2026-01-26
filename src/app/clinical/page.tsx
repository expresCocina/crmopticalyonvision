'use client'

import { useState } from 'react'
import { useClinicalRecords } from "@/hooks/useClinicalRecords"
import { useLeads } from "@/hooks/useLeads"
import { ClinicalRecordForm } from '@/components/clinical/ClinicalRecordForm'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, User, Plus } from "lucide-react"
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

export default function ClinicalPage() {
    const { records, loading } = useClinicalRecords()
    const { leads } = useLeads()
    const [selectedLeadId, setSelectedLeadId] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin">Cargando...</div></div>

    return (
        <div className="h-full flex flex-col space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">Historia Clínica</h2>
                    <p className="text-sm text-muted-foreground">Registro de exámenes y fórmulas ópticas</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-h-[44px]">
                            <Plus className="h-4 w-4" /> Nueva Historia
                        </button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Seleccionar Paciente (Lead)</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    onChange={(e) => setSelectedLeadId(e.target.value)}
                                    value={selectedLeadId}
                                >
                                    <option value="">-- Buscar Paciente --</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.full_name || l.wa_id} ({l.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedLeadId && (
                                <ClinicalRecordForm
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

            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {records.length === 0 && (
                    <p className="text-muted-foreground col-span-full text-center py-8">No hay registros clínicos aún.</p>
                )}

                {records.map((record) => (
                    <Card key={record.id} className="hover:border-primary/50 transition-colors">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1 flex-1 min-w-0">
                                <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary flex-shrink-0" />
                                    <span className="truncate">{record.lead?.full_name || 'Paciente'}</span>
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {format(parseISO(record.created_at), "d MMMM yyyy", { locale: es })}
                                </p>
                            </div>
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="bg-muted/30 p-2 rounded text-xs font-mono overflow-x-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-[200px]">
                                    <div>
                                        <span className="font-bold text-primary">OD:</span> {record.rx_data.od.sph} / {record.rx_data.od.cyl} x {record.rx_data.od.axis}
                                    </div>
                                    <div>
                                        <span className="font-bold text-primary">OI:</span> {record.rx_data.oi.sph} / {record.rx_data.oi.cyl} x {record.rx_data.oi.axis}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <span className="font-semibold block text-xs uppercase tracking-wide text-muted-foreground">Diagnóstico</span>
                                <p className="truncate line-clamp-2 text-sm">{record.diagnosis}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

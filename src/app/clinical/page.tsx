'use client'

import { useState } from 'react'
import { useClinicalRecords } from "@/hooks/useClinicalRecords"
import { useLeads } from "@/hooks/useLeads"
import { ClinicalRecordForm } from '@/components/clinical/ClinicalRecordForm'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Eye, User, Plus } from "lucide-react"
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

export default function ClinicalPage() {
    const { records, loading } = useClinicalRecords()
    const { leads } = useLeads() // To select a patient for new record
    const [selectedLeadId, setSelectedLeadId] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    if (loading) return <div>Cargando...</div>

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Historia Clínica</h2>
                    <p className="text-sm text-muted-foreground">Registro de exámenes y fórmulas ópticas</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Nueva Historia
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {records.length === 0 && (
                    <p className="text-muted-foreground col-span-full">No hay registros clínicos aún.</p>
                )}

                {records.map((record) => (
                    <Card key={record.id} className="hover:border-primary/50 transition-colors">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    {record.lead?.full_name || 'Paciente'}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {format(parseISO(record.created_at), "d MMMM yyyy", { locale: es })}
                                </p>
                            </div>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="bg-muted/30 p-2 rounded text-xs font-mono">
                                <div className="grid grid-cols-2 gap-2">
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
                                <p className="truncate line-clamp-2">{record.diagnosis}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

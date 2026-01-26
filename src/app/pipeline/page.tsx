'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLeads } from "@/hooks/useLeads"
import { LeadStatus } from "@/types/database"
import { Loader2 } from "lucide-react"

const COLUMNS: { id: LeadStatus; label: string }[] = [
    { id: 'nuevo', label: 'Nuevos' },
    { id: 'interesado', label: 'Interesados' },
    { id: 'cotizado', label: 'Cotizados' },
    { id: 'agendado', label: 'Agendados' },
    { id: 'cliente', label: 'Clientes' },
]

export default function PipelinePage() {
    const { leads, loading } = useLeads()

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Pipeline de Ventas</h2>
                <div className="text-sm text-muted-foreground">
                    {leads.length} leads en total
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                <div className="flex h-full gap-4 pb-4 min-w-[1200px]">
                    {COLUMNS.map((col) => {
                        const columnLeads = leads.filter(l => l.status === col.id)

                        return (
                            <div key={col.id} className="w-80 flex-none flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <span className="font-semibold text-sm text-muted-foreground">{col.label}</span>
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                        {columnLeads.length}
                                    </span>
                                </div>

                                <div className="bg-muted/30 rounded-lg p-2 h-full border border-dashed border-border/50 flex flex-col gap-2 overflow-y-auto">
                                    {columnLeads.map((lead) => (
                                        <Card key={lead.id} className="cursor-grab hover:shadow-md transition-shadow hover:border-primary/50">
                                            <CardHeader className="p-3 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-sm font-medium leading-none truncate">
                                                        {lead.full_name || lead.wa_id}
                                                    </CardTitle>
                                                    {lead.source === 'whatsapp' && (
                                                        <span className="text-[10px] bg-green-100 text-green-800 px-1 rounded">WA</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {lead.notes || 'Sin notas recientes'}
                                                </p>
                                                {lead.tags && lead.tags.length > 0 && (
                                                    <div className="flex gap-1 flex-wrap pt-1">
                                                        {lead.tags.map(tag => (
                                                            <span key={tag} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

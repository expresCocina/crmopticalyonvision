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
        <div className="h-full flex flex-col space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Pipeline de Ventas</h2>
                <div className="text-sm text-muted-foreground">
                    {leads.length} leads en total
                </div>
            </div>

            {/* Mobile: Stack columns vertically, Desktop: Horizontal scroll */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
                <div className="flex flex-col md:flex-row h-full gap-3 md:gap-4 pb-4 md:min-w-[1200px]">
                    {COLUMNS.map((col) => {
                        const columnLeads = leads.filter(l => l.status === col.id)

                        return (
                            <div key={col.id} className="w-full md:w-80 md:flex-none flex flex-col gap-3 md:gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <span className="font-semibold text-sm text-muted-foreground">{col.label}</span>
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                        {columnLeads.length}
                                    </span>
                                </div>

                                <div className="bg-muted/30 rounded-lg p-2 min-h-[100px] md:h-full border border-dashed border-border/50 flex flex-col gap-2 overflow-y-auto">
                                    {columnLeads.map((lead) => (
                                        <Card key={lead.id} className="cursor-grab hover:shadow-md transition-shadow hover:border-primary/50 min-h-[60px]">
                                            <CardHeader className="p-3 space-y-1">
                                                <div className="flex justify-between items-start gap-2">
                                                    <CardTitle className="text-sm font-medium leading-none truncate flex-1">
                                                        {lead.full_name || lead.wa_id}
                                                    </CardTitle>
                                                    {lead.source === 'whatsapp' && (
                                                        <span className="text-[10px] bg-green-100 text-green-800 px-1 rounded flex-shrink-0">WA</span>
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

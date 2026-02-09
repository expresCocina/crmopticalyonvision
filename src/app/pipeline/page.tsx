'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLeads } from "@/hooks/useLeads"
import { Lead, LeadStatus } from "@/types/database"
import { Loader2 } from "lucide-react"
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor,
    DragStartEvent,
    DragEndEvent,
    closestCorners,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'

const COLUMNS: { id: LeadStatus; label: string }[] = [
    { id: 'nuevo', label: 'Nuevos' },
    { id: 'interesado', label: 'Interesados' },
    { id: 'cotizado', label: 'Cotizados' },
    { id: 'agendado', label: 'Agendados' },
    { id: 'cliente', label: 'Clientes' },
]

// Componente para la columna (Zona donde se suelta)
function DroppableColumn({ id, label, count, children }: { id: string, label: string, count: number, children: React.ReactNode }) {
    const { setNodeRef } = useDroppable({
        id: id,
    })

    return (
        <div ref={setNodeRef} className="w-full md:w-80 md:flex-none flex flex-col gap-3 md:gap-4 h-full">
            <div className="flex items-center justify-between px-2">
                <span className="font-semibold text-sm text-muted-foreground">{label}</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {count}
                </span>
            </div>

            <div className="bg-muted/30 rounded-lg p-2 min-h-[100px] h-full border border-dashed border-border/50 flex flex-col gap-2 overflow-y-auto">
                {children}
            </div>
        </div>
    )
}

// Componente para la tarjeta (Elemento arrastrable)
function DraggableLeadCard({ lead }: { lead: Lead }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: lead.id,
        data: { lead }
    })

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
        opacity: isDragging ? 0.5 : 1,
    } : undefined

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <LeadCardContent lead={lead} />
        </div>
    )
}

function LeadCardContent({ lead }: { lead: Lead }) {
    return (
        <Card className="cursor-grab hover:shadow-md transition-shadow hover:border-primary/50 min-h-[60px] bg-card">
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
                        {lead.tags.map((tag, index) => (
                            <span key={`${lead.id}-tag-${index}`} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </CardHeader>
        </Card>
    )
}

export default function PipelinePage() {
    const { leads, loading, updateLeadStatus } = useLeads()
    const [activeLead, setActiveLead] = useState<Lead | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Movimiento mínimo para activar el drag
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250, // Delay para evitar scroll accidental en móvil
                tolerance: 5,
            }
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.lead) {
            setActiveLead(event.active.data.current.lead as Lead)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveLead(null)

        if (!over) return

        const leadId = active.id as string
        const newStatus = over.id as LeadStatus
        const lead = leads.find(l => l.id === leadId)

        if (lead && lead.status !== newStatus) {
            // Validar que el status sea válido
            if (COLUMNS.some(col => col.id === newStatus)) {
                await updateLeadStatus(leadId, newStatus)
            }
        }
    }

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

            {/* Area de Drag and Drop */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="flex flex-col md:flex-row h-full gap-3 md:gap-4 pb-4 md:min-w-[1200px]">
                        {COLUMNS.map((col) => {
                            const columnLeads = leads.filter(l => l.status === col.id)
                            return (
                                <DroppableColumn
                                    key={col.id}
                                    id={col.id}
                                    label={col.label}
                                    count={columnLeads.length}
                                >
                                    {columnLeads.map((lead) => (
                                        <DraggableLeadCard key={lead.id} lead={lead} />
                                    ))}
                                </DroppableColumn>
                            )
                        })}
                    </div>
                </div>

                {/* Overlay visual mientras se arrastra */}
                <DragOverlay>
                    {activeLead ? (
                        <div className="opacity-80 rotate-2 scale-105">
                            <LeadCardContent lead={activeLead} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}

'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomerSegment } from '@/hooks/useCustomers'

interface CustomerSegmentTabsProps {
    activeSegment: CustomerSegment
    onSegmentChange: (segment: CustomerSegment) => void
    counts: {
        frios: number
        proceso: number
        activos: number
        all: number
    }
}

export function CustomerSegmentTabs({ activeSegment, onSegmentChange, counts }: CustomerSegmentTabsProps) {
    return (
        <Tabs value={activeSegment} onValueChange={(v) => onSegmentChange(v as CustomerSegment)}>
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="gap-2">
                    Todos
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {counts.all}
                    </span>
                </TabsTrigger>
                <TabsTrigger value="frios" className="gap-2">
                    🧊 Fríos
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {counts.frios}
                    </span>
                </TabsTrigger>
                <TabsTrigger value="proceso" className="gap-2">
                    🔄 En Proceso
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {counts.proceso}
                    </span>
                </TabsTrigger>
                <TabsTrigger value="activos" className="gap-2">
                    ✅ Activos
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {counts.activos}
                    </span>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}

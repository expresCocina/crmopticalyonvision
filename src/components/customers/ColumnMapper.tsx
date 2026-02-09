'use client'

import { useState } from 'react'
import { type ColumnMapping, type ColumnType } from '@/lib/utils/columnDetector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface ColumnMapperProps {
    columns: string[]
    detectedMappings: ColumnMapping[]
    sampleData: Record<string, any>[]
    onMappingChange: (mapping: Record<string, ColumnType>) => void
}

const FIELD_OPTIONS: Array<{ value: ColumnType; label: string; required?: boolean }> = [
    { value: 'wa_id', label: 'Número de WhatsApp', required: true },
    { value: 'full_name', label: 'Nombre Completo' },
    { value: 'status', label: 'Estado' },
    { value: 'source', label: 'Fuente/Origen' },
    { value: 'campaign_id', label: 'ID de Campaña' },
    { value: 'notes', label: 'Notas' },
    { value: 'tags', label: 'Etiquetas' },
    { value: 'unknown', label: '(No importar)' },
]

export function ColumnMapper({
    columns,
    detectedMappings,
    sampleData,
    onMappingChange
}: ColumnMapperProps) {
    // Inicializar con mapeos detectados
    const initialMapping: Record<string, ColumnType> = {}
    detectedMappings.forEach(m => {
        initialMapping[m.sourceColumn] = m.targetField
    })

    const [mapping, setMapping] = useState<Record<string, ColumnType>>(initialMapping)

    const handleMappingChange = (column: string, targetField: string) => {
        const newMapping = {
            ...mapping,
            [column]: targetField as ColumnType
        }
        setMapping(newMapping)
        onMappingChange(newMapping)
    }

    // Verificar si el campo requerido está mapeado
    const hasRequiredFields = Object.values(mapping).includes('wa_id')

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {hasRequiredFields ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    Mapeo de Columnas
                </CardTitle>
                {!hasRequiredFields && (
                    <p className="text-sm text-destructive">
                        Debes mapear al menos el campo "Número de WhatsApp"
                    </p>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {columns.map((column) => {
                        const detectedMapping = detectedMappings.find(m => m.sourceColumn === column)
                        const currentMapping = mapping[column] || 'unknown'
                        const sampleValues = sampleData.slice(0, 3).map(row => row[column])

                        return (
                            <div key={column} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="font-medium mb-1">{column}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Ejemplos: {sampleValues.filter(Boolean).join(', ') || 'Sin datos'}
                                        </div>
                                        {detectedMapping && (
                                            <div className="text-xs text-primary mt-1">
                                                Detectado automáticamente ({Math.round(detectedMapping.confidence * 100)}% confianza)
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-48">
                                        <select
                                            value={currentMapping}
                                            onChange={(e) => handleMappingChange(column, e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                        >
                                            {FIELD_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label} {option.required ? '*' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2 text-sm">Campos Mapeados:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(mapping)
                            .filter(([_, target]) => target !== 'unknown')
                            .map(([source, target]) => (
                                <div key={source} className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{source}</span>
                                    <span>→</span>
                                    <span className="font-medium">
                                        {FIELD_OPTIONS.find(o => o.value === target)?.label}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

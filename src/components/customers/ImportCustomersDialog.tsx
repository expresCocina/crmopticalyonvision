'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { FileUploadZone } from './FileUploadZone'
import { ColumnMapper } from './ColumnMapper'
import { useFileParser, type ParsedData } from '@/hooks/useFileParser'
import { useCustomerImport, type ImportOptions, type ImportResult } from '@/hooks/useCustomerImport'
import { type ColumnType } from '@/lib/utils/columnDetector'
import { Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface ImportCustomersDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImportComplete?: () => void
}

type ImportStep = 'upload' | 'mapping' | 'options' | 'importing' | 'complete'

export function ImportCustomersDialog({
    open,
    onOpenChange,
    onImportComplete
}: ImportCustomersDialogProps) {
    const [step, setStep] = useState<ImportStep>('upload')
    const [parsedData, setParsedData] = useState<ParsedData | null>(null)
    const [columnMapping, setColumnMapping] = useState<Record<string, ColumnType>>({})
    const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'create'>('skip')
    const [importResult, setImportResult] = useState<ImportResult | null>(null)

    const { parseFile, parsing } = useFileParser()
    const { importCustomers, importing, progress } = useCustomerImport()

    const handleFileSelect = async (file: File) => {
        try {
            const data = await parseFile(file)
            setParsedData(data)

            // Inicializar mapeo con detecciones automáticas
            const initialMapping: Record<string, ColumnType> = {}
            data.detectedMappings.forEach(m => {
                initialMapping[m.sourceColumn] = m.targetField
            })
            setColumnMapping(initialMapping)

            setStep('mapping')
        } catch (error) {
            console.error('Error parsing file:', error)
        }
    }

    const handleMappingComplete = () => {
        // Verificar que wa_id esté mapeado
        const hasPhoneMapping = Object.values(columnMapping).includes('wa_id')
        if (!hasPhoneMapping) {
            return
        }
        setStep('options')
    }

    const handleImport = async () => {
        if (!parsedData) return

        setStep('importing')

        const options: ImportOptions = {
            duplicateHandling,
            columnMapping,
            validatePhone: true
        }

        try {
            const result = await importCustomers(parsedData.rows, options)
            setImportResult(result)
            setStep('complete')

            if (onImportComplete) {
                onImportComplete()
            }
        } catch (error) {
            console.error('Import error:', error)
            setStep('options')
        }
    }

    const handleClose = () => {
        setStep('upload')
        setParsedData(null)
        setColumnMapping({})
        setImportResult(null)
        onOpenChange(false)
    }

    const downloadErrorReport = () => {
        if (!importResult) return

        const report = importResult.errors.map(e => ({
            fila: e.row,
            error: e.error,
            datos: JSON.stringify(e.data)
        }))

        const csv = [
            ['Fila', 'Error', 'Datos'],
            ...report.map(r => [r.fila, r.error, r.datos])
        ].map(row => row.join(',')).join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'errores_importacion.csv'
        a.click()
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importar Clientes</DialogTitle>
                    <DialogDescription>
                        Importa clientes desde archivos Excel o CSV
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div>
                            <FileUploadZone
                                onFileSelect={handleFileSelect}
                                acceptedFormats={['.xlsx', '.xls', '.csv']}
                                maxSizeMB={10}
                            />
                            {parsing && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Procesando archivo...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Column Mapping */}
                    {step === 'mapping' && parsedData && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm">
                                    <strong>Archivo:</strong> {parsedData.fileName}
                                </p>
                                <p className="text-sm">
                                    <strong>Registros encontrados:</strong> {parsedData.rows.length}
                                </p>
                            </div>

                            <ColumnMapper
                                columns={parsedData.columns}
                                detectedMappings={parsedData.detectedMappings}
                                sampleData={parsedData.rows}
                                onMappingChange={setColumnMapping}
                            />

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setStep('upload')}>
                                    Atrás
                                </Button>
                                <Button
                                    onClick={handleMappingComplete}
                                    disabled={!Object.values(columnMapping).includes('wa_id')}
                                >
                                    Continuar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Import Options */}
                    {step === 'options' && parsedData && (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Label>¿Qué hacer con clientes duplicados?</Label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="duplicate"
                                            value="skip"
                                            checked={duplicateHandling === 'skip'}
                                            onChange={(e) => setDuplicateHandling(e.target.value as any)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">
                                            <strong>Omitir duplicados</strong> - No importar clientes que ya existen
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="duplicate"
                                            value="update"
                                            checked={duplicateHandling === 'update'}
                                            onChange={(e) => setDuplicateHandling(e.target.value as any)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">
                                            <strong>Actualizar existentes</strong> - Sobrescribir información de clientes duplicados
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="duplicate"
                                            value="create"
                                            checked={duplicateHandling === 'create'}
                                            onChange={(e) => setDuplicateHandling(e.target.value as any)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">
                                            <strong>Crear de todos modos</strong> - Permitir duplicados
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <p className="text-sm">
                                    Se importarán <strong>{parsedData.rows.length}</strong> registros.
                                    Los números de teléfono se normalizarán automáticamente al formato internacional.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setStep('mapping')}>
                                    Atrás
                                </Button>
                                <Button onClick={handleImport}>
                                    Importar Clientes
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Importing */}
                    {step === 'importing' && (
                        <div className="space-y-4 py-8">
                            <div className="text-center">
                                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                                <p className="text-lg font-medium mb-2">Importando clientes...</p>
                                <p className="text-sm text-muted-foreground">
                                    {progress.current} de {progress.total} registros procesados
                                </p>
                            </div>
                            <Progress value={progress.percentage} className="w-full" />
                        </div>
                    )}

                    {/* Step 5: Complete */}
                    {step === 'complete' && importResult && (
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Importación Completada</h3>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {importResult.successful}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Exitosos</div>
                                </div>
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                        {importResult.duplicates}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Duplicados</div>
                                </div>
                                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        {importResult.failed}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Fallidos</div>
                                </div>
                            </div>

                            {importResult.errors.length > 0 && (
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <div className="flex items-start gap-2 mb-2">
                                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">
                                                Se encontraron {importResult.errors.length} errores
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Descarga el reporte para ver los detalles
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={downloadErrorReport}
                                        className="mt-2"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Descargar Reporte de Errores
                                    </Button>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button onClick={handleClose}>
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

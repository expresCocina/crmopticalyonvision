'use client'

import { useCallback, useState } from 'react'
import { Upload, File, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadZoneProps {
    onFileSelect: (file: File) => void
    acceptedFormats?: string[]
    maxSizeMB?: number
    className?: string
}

export function FileUploadZone({
    onFileSelect,
    acceptedFormats = ['.xlsx', '.xls', '.csv'],
    maxSizeMB = 10,
    className
}: FileUploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)

    const validateFile = (file: File): boolean => {
        setError(null)

        // Validar tamaño
        const maxSizeBytes = maxSizeMB * 1024 * 1024
        if (file.size > maxSizeBytes) {
            setError(`El archivo es muy grande. Máximo ${maxSizeMB}MB`)
            return false
        }

        // Validar formato
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!acceptedFormats.includes(extension)) {
            setError(`Formato no soportado. Usa: ${acceptedFormats.join(', ')}`)
            return false
        }

        return true
    }

    const handleFile = (file: File) => {
        if (validateFile(file)) {
            setSelectedFile(file)
            onFileSelect(file)
        }
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files[0]
        if (file) {
            handleFile(file)
        }
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
    }

    const clearFile = () => {
        setSelectedFile(null)
        setError(null)
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    return (
        <div className={cn('w-full', className)}>
            {!selectedFile ? (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                        'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                        isDragging
                            ? 'border-primary bg-primary/5'
                            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                    )}
                    onClick={() => document.getElementById('file-input')?.click()}
                >
                    <Upload className={cn(
                        'mx-auto h-12 w-12 mb-4 transition-colors',
                        isDragging ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <p className="text-lg font-medium mb-2">
                        {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic para seleccionar'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                        Formatos soportados: {acceptedFormats.join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Tamaño máximo: {maxSizeMB}MB
                    </p>
                    <input
                        id="file-input"
                        type="file"
                        accept={acceptedFormats.join(',')}
                        onChange={handleFileInput}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <File className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-medium">{selectedFile.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={clearFile}
                            className="p-2 hover:bg-muted rounded-md transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}
        </div>
    )
}

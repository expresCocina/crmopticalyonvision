'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { detectColumnMappings, type ColumnMapping } from '@/lib/utils/columnDetector'

export interface ParsedData {
    columns: string[]
    rows: Record<string, any>[]
    detectedMappings: ColumnMapping[]
    fileName: string
    fileType: string
}

export interface ParseError {
    message: string
    details?: string
}

export function useFileParser() {
    const [parsing, setParsing] = useState(false)
    const [error, setError] = useState<ParseError | null>(null)

    /**
     * Parsea un archivo Excel (.xlsx, .xls)
     */
    const parseExcel = async (file: File): Promise<ParsedData> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = (e) => {
                try {
                    const data = e.target?.result
                    const workbook = XLSX.read(data, { type: 'binary' })

                    // Tomar la primera hoja
                    const firstSheetName = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[firstSheetName]

                    // Convertir a JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

                    if (jsonData.length === 0) {
                        reject(new Error('El archivo Excel está vacío'))
                        return
                    }

                    // Primera fila como headers
                    const columns = jsonData[0].map(col => String(col || '').trim()).filter(Boolean)

                    // Resto como datos
                    const rows = jsonData.slice(1)
                        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
                        .map(row => {
                            const obj: Record<string, any> = {}
                            columns.forEach((col, idx) => {
                                obj[col] = row[idx]
                            })
                            return obj
                        })

                    if (rows.length === 0) {
                        reject(new Error('No se encontraron datos en el archivo'))
                        return
                    }

                    // Detectar mapeos automáticamente
                    const detection = detectColumnMappings(columns, rows.slice(0, 10))

                    resolve({
                        columns,
                        rows,
                        detectedMappings: detection.mappings,
                        fileName: file.name,
                        fileType: 'excel'
                    })
                } catch (err) {
                    reject(new Error(`Error al parsear Excel: ${err instanceof Error ? err.message : 'Error desconocido'}`))
                }
            }

            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'))
            }

            reader.readAsBinaryString(file)
        })
    }

    /**
     * Parsea un archivo CSV
     */
    const parseCSV = async (file: File): Promise<ParsedData> => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        if (results.errors.length > 0) {
                            const errorMsg = results.errors.map(e => e.message).join(', ')
                            reject(new Error(`Errores en CSV: ${errorMsg}`))
                            return
                        }

                        const rows = results.data as Record<string, any>[]

                        if (rows.length === 0) {
                            reject(new Error('El archivo CSV está vacío'))
                            return
                        }

                        const columns = Object.keys(rows[0])

                        // Detectar mapeos automáticamente
                        const detection = detectColumnMappings(columns, rows.slice(0, 10))

                        resolve({
                            columns,
                            rows,
                            detectedMappings: detection.mappings,
                            fileName: file.name,
                            fileType: 'csv'
                        })
                    } catch (err) {
                        reject(new Error(`Error al procesar CSV: ${err instanceof Error ? err.message : 'Error desconocido'}`))
                    }
                },
                error: (error) => {
                    reject(new Error(`Error al parsear CSV: ${error.message}`))
                }
            })
        })
    }

    /**
     * Parsea un archivo PDF (extracción básica de texto)
     * Nota: La extracción de tablas de PDF es compleja y puede requerir procesamiento adicional
     */
    const parsePDF = async (file: File): Promise<ParsedData> => {
        // Por ahora, retornamos un error indicando que PDF requiere procesamiento especial
        // En una implementación completa, usaríamos pdf-parse + pdf-table-extractor
        return Promise.reject(new Error(
            'La importación desde PDF aún no está implementada. ' +
            'Por favor, convierte el PDF a Excel o CSV primero.'
        ))
    }

    /**
     * Parsea un archivo Word (.docx)
     */
    const parseWord = async (file: File): Promise<ParsedData> => {
        // Similar a PDF, Word requiere procesamiento especial
        return Promise.reject(new Error(
            'La importación desde Word aún no está implementada. ' +
            'Por favor, convierte el documento a Excel o CSV primero.'
        ))
    }

    /**
     * Parsea un archivo automáticamente según su extensión
     */
    const parseFile = async (file: File): Promise<ParsedData> => {
        setParsing(true)
        setError(null)

        try {
            const extension = file.name.split('.').pop()?.toLowerCase()

            switch (extension) {
                case 'xlsx':
                case 'xls':
                    return await parseExcel(file)
                case 'csv':
                    return await parseCSV(file)
                case 'pdf':
                    return await parsePDF(file)
                case 'docx':
                case 'doc':
                    return await parseWord(file)
                default:
                    throw new Error(`Formato de archivo no soportado: .${extension}`)
            }
        } catch (err) {
            const error = {
                message: err instanceof Error ? err.message : 'Error al parsear archivo',
                details: err instanceof Error ? err.stack : undefined
            }
            setError(error)
            throw error
        } finally {
            setParsing(false)
        }
    }

    return {
        parseFile,
        parseExcel,
        parseCSV,
        parsePDF,
        parseWord,
        parsing,
        error
    }
}

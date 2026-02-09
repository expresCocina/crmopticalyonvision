'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizePhoneNumber } from '@/lib/utils/phoneNormalizer'
import { transformRow, type ColumnType } from '@/lib/utils/columnDetector'
import { toast } from 'sonner'

export interface ImportOptions {
    duplicateHandling: 'skip' | 'update' | 'create'
    columnMapping: Record<string, ColumnType>
    validatePhone: boolean
}

export interface ImportResult {
    total: number
    successful: number
    failed: number
    duplicates: number
    errors: Array<{ row: number; error: string; data?: any }>
}

export interface ImportProgress {
    current: number
    total: number
    percentage: number
}

export function useCustomerImport() {
    const [importing, setImporting] = useState(false)
    const [progress, setProgress] = useState<ImportProgress>({ current: 0, total: 0, percentage: 0 })
    const supabase = createClient()

    /**
     * Valida y normaliza un registro de cliente
     */
    const validateAndNormalizeCustomer = (
        row: Record<string, any>,
        options: ImportOptions
    ): { valid: boolean; data?: any; error?: string } => {
        // Transformar según mapeo
        const transformed = transformRow(row, options.columnMapping)

        // Validar campo requerido: wa_id
        if (!transformed.wa_id) {
            return { valid: false, error: 'Falta número de teléfono' }
        }

        // Normalizar teléfono
        if (options.validatePhone) {
            const phoneResult = normalizePhoneNumber(transformed.wa_id)
            if (!phoneResult.isValid) {
                return { valid: false, error: `Teléfono inválido: ${phoneResult.error}` }
            }
            transformed.wa_id = phoneResult.normalized!
        }

        // Normalizar nombre
        if (transformed.full_name) {
            transformed.full_name = String(transformed.full_name).trim()
        }

        // Normalizar status
        if (transformed.status) {
            const statusMap: Record<string, string> = {
                'nuevo': 'nuevo',
                'new': 'nuevo',
                'interesado': 'interesado',
                'interested': 'interesado',
                'cotizado': 'cotizado',
                'quoted': 'cotizado',
                'agendado': 'agendado',
                'scheduled': 'agendado',
                'cliente': 'cliente',
                'customer': 'cliente',
                'client': 'cliente',
                'recurrente': 'recurrente',
                'recurring': 'recurrente',
                'no_responde': 'no_responde',
                'no_compro': 'no_compro'
            }
            const normalizedStatus = statusMap[String(transformed.status).toLowerCase()]
            transformed.status = normalizedStatus || 'nuevo'
        } else {
            transformed.status = 'nuevo'
        }

        // Normalizar source
        if (transformed.source) {
            const sourceMap: Record<string, string> = {
                'whatsapp': 'whatsapp',
                'wa': 'whatsapp',
                'meta': 'meta_ads',
                'facebook': 'meta_ads',
                'instagram': 'meta_ads',
                'google': 'google_ads',
                'tiktok': 'tiktok_ads',
                'web': 'web',
                'qr': 'qr_tienda'
            }
            const normalizedSource = sourceMap[String(transformed.source).toLowerCase()]
            transformed.source = normalizedSource || 'web'
        } else {
            transformed.source = 'web'
        }

        // Procesar tags si existen
        if (transformed.tags) {
            if (typeof transformed.tags === 'string') {
                // Convertir string separado por comas a array
                transformed.tags = transformed.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            } else if (!Array.isArray(transformed.tags)) {
                delete transformed.tags
            }
        }

        return { valid: true, data: transformed }
    }

    /**
     * Verifica si un cliente ya existe por wa_id
     */
    const checkDuplicate = async (wa_id: string): Promise<boolean> => {
        const { data, error } = await supabase
            .from('leads')
            .select('id')
            .eq('wa_id', wa_id)
            .single()

        return !error && !!data
    }

    /**
     * Importa clientes en batches
     */
    const importCustomers = async (
        rows: Record<string, any>[],
        options: ImportOptions
    ): Promise<ImportResult> => {
        setImporting(true)
        setProgress({ current: 0, total: rows.length, percentage: 0 })

        const result: ImportResult = {
            total: rows.length,
            successful: 0,
            failed: 0,
            duplicates: 0,
            errors: []
        }

        const BATCH_SIZE = 100
        const customersToInsert: any[] = []

        try {
            // Validar y preparar datos
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]

                // Actualizar progreso
                setProgress({
                    current: i + 1,
                    total: rows.length,
                    percentage: Math.round(((i + 1) / rows.length) * 100)
                })

                // Validar y normalizar
                const validation = validateAndNormalizeCustomer(row, options)

                if (!validation.valid) {
                    result.failed++
                    result.errors.push({
                        row: i + 1,
                        error: validation.error || 'Error de validación',
                        data: row
                    })
                    continue
                }

                const customer = validation.data

                // Verificar duplicados
                const isDuplicate = await checkDuplicate(customer.wa_id)

                if (isDuplicate) {
                    result.duplicates++

                    if (options.duplicateHandling === 'skip') {
                        continue
                    } else if (options.duplicateHandling === 'update') {
                        // Actualizar registro existente
                        const { error: updateError } = await supabase
                            .from('leads')
                            .update(customer)
                            .eq('wa_id', customer.wa_id)

                        if (updateError) {
                            result.failed++
                            result.errors.push({
                                row: i + 1,
                                error: `Error al actualizar: ${updateError.message}`,
                                data: row
                            })
                        } else {
                            result.successful++
                        }
                        continue
                    }
                    // Si es 'create', continuar con la inserción (permitir duplicados)
                }

                customersToInsert.push(customer)

                // Insertar en batches
                if (customersToInsert.length >= BATCH_SIZE) {
                    const { error: insertError } = await supabase
                        .from('leads')
                        .insert(customersToInsert)

                    if (insertError) {
                        result.failed += customersToInsert.length
                        result.errors.push({
                            row: i + 1,
                            error: `Error en batch: ${insertError.message}`
                        })
                    } else {
                        result.successful += customersToInsert.length
                    }

                    customersToInsert.length = 0
                }
            }

            // Insertar registros restantes
            if (customersToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('leads')
                    .insert(customersToInsert)

                if (insertError) {
                    result.failed += customersToInsert.length
                    result.errors.push({
                        row: rows.length,
                        error: `Error en último batch: ${insertError.message}`
                    })
                } else {
                    result.successful += customersToInsert.length
                }
            }

            // Mostrar resultado
            if (result.successful > 0) {
                toast.success(`${result.successful} cliente(s) importado(s) exitosamente`)
            }
            if (result.failed > 0) {
                toast.error(`${result.failed} cliente(s) fallaron`)
            }
            if (result.duplicates > 0) {
                toast.info(`${result.duplicates} duplicado(s) encontrado(s)`)
            }

        } catch (error) {
            console.error('Error durante importación:', error)
            toast.error('Error durante la importación')
            throw error
        } finally {
            setImporting(false)
            setProgress({ current: 0, total: 0, percentage: 0 })
        }

        return result
    }

    return {
        importCustomers,
        importing,
        progress
    }
}

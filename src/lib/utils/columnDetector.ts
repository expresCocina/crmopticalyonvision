/**
 * Detecta automáticamente el tipo de columna basándose en el nombre y contenido
 */

export type ColumnType = 'wa_id' | 'full_name' | 'status' | 'source' | 'campaign_id' | 'notes' | 'tags' | 'unknown'

export interface ColumnMapping {
    sourceColumn: string
    targetField: ColumnType
    confidence: number // 0-1
    sampleValues?: string[]
}

export interface DetectionResult {
    mappings: ColumnMapping[]
    unmappedColumns: string[]
    requiredFieldsMissing: ColumnType[]
}

// Diccionarios de nombres comunes por tipo de campo
const COLUMN_PATTERNS: Record<ColumnType, RegExp[]> = {
    wa_id: [
        /^(telefono|teléfono|phone|celular|movil|móvil|whatsapp|wa|numero|número|contact)$/i,
        /^(tel|cell|mobile)$/i,
    ],
    full_name: [
        /^(nombre|name|cliente|customer|contact|contacto|persona|person)$/i,
        /^(full_name|fullname|nombre_completo)$/i,
    ],
    status: [
        /^(estado|status|state|etapa|stage|fase|phase)$/i,
    ],
    source: [
        /^(fuente|source|origen|origin|canal|channel|medio|medium)$/i,
    ],
    campaign_id: [
        /^(campaña|campaign|campana|promo|promocion|promoción|utm)$/i,
    ],
    notes: [
        /^(notas|notes|observaciones|observations|comentarios|comments|descripcion|descripción|description)$/i,
    ],
    tags: [
        /^(etiquetas|tags|labels|categorias|categorías|categories)$/i,
    ],
    unknown: [],
}

/**
 * Detecta el tipo de columna basándose en su nombre
 */
function detectColumnTypeByName(columnName: string): { type: ColumnType; confidence: number } {
    const normalizedName = columnName.trim()

    for (const [type, patterns] of Object.entries(COLUMN_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(normalizedName)) {
                // Confianza alta si coincide exactamente
                const confidence = normalizedName.toLowerCase() === pattern.source.toLowerCase().replace(/[^a-z]/g, '')
                    ? 1.0
                    : 0.8
                return { type: type as ColumnType, confidence }
            }
        }
    }

    return { type: 'unknown', confidence: 0 }
}

/**
 * Analiza el contenido de una columna para inferir su tipo
 */
function detectColumnTypeByContent(values: any[]): { type: ColumnType; confidence: number } {
    if (!values || values.length === 0) {
        return { type: 'unknown', confidence: 0 }
    }

    // Tomar muestra de valores no vacíos
    const sampleValues = values
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .slice(0, 10)
        .map(v => String(v))

    if (sampleValues.length === 0) {
        return { type: 'unknown', confidence: 0 }
    }

    // Detectar números de teléfono
    const phonePattern = /^[\d\s\-\+\(\)\.]{7,}$/
    const phoneMatches = sampleValues.filter(v => phonePattern.test(v)).length
    if (phoneMatches / sampleValues.length > 0.7) {
        return { type: 'wa_id', confidence: 0.9 }
    }

    // Detectar nombres (palabras con espacios, sin números)
    const namePattern = /^[a-záéíóúñA-ZÁÉÍÓÚÑ\s\.]+$/
    const nameMatches = sampleValues.filter(v => namePattern.test(v) && v.split(' ').length >= 2).length
    if (nameMatches / sampleValues.length > 0.6) {
        return { type: 'full_name', confidence: 0.7 }
    }

    // Detectar estados (valores cortos repetidos)
    const uniqueValues = new Set(sampleValues.map(v => v.toLowerCase()))
    if (uniqueValues.size <= 10 && sampleValues.every(v => v.length < 30)) {
        const commonStatuses = ['nuevo', 'interesado', 'cotizado', 'cliente', 'activo', 'inactivo', 'pendiente']
        const statusMatches = Array.from(uniqueValues).filter(v =>
            commonStatuses.some(s => v.includes(s))
        ).length
        if (statusMatches > 0) {
            return { type: 'status', confidence: 0.8 }
        }
    }

    // Detectar notas (texto largo)
    const avgLength = sampleValues.reduce((sum, v) => sum + v.length, 0) / sampleValues.length
    if (avgLength > 50) {
        return { type: 'notes', confidence: 0.6 }
    }

    return { type: 'unknown', confidence: 0 }
}

/**
 * Detecta automáticamente el mapeo de columnas
 */
export function detectColumnMappings(
    columns: string[],
    sampleData: Record<string, any>[]
): DetectionResult {
    const mappings: ColumnMapping[] = []
    const unmappedColumns: string[] = []
    const detectedTypes = new Set<ColumnType>()

    for (const column of columns) {
        // Detectar por nombre
        const nameDetection = detectColumnTypeByName(column)

        // Detectar por contenido
        const columnValues = sampleData.map(row => row[column])
        const contentDetection = detectColumnTypeByContent(columnValues)

        // Usar la detección con mayor confianza
        const finalDetection = nameDetection.confidence >= contentDetection.confidence
            ? nameDetection
            : contentDetection

        // Solo mapear si la confianza es razonable
        if (finalDetection.confidence >= 0.6 && finalDetection.type !== 'unknown') {
            // Evitar duplicados - solo mapear el primero encontrado
            if (!detectedTypes.has(finalDetection.type)) {
                mappings.push({
                    sourceColumn: column,
                    targetField: finalDetection.type,
                    confidence: finalDetection.confidence,
                    sampleValues: columnValues.slice(0, 3).map(v => String(v))
                })
                detectedTypes.add(finalDetection.type)
            } else {
                unmappedColumns.push(column)
            }
        } else {
            unmappedColumns.push(column)
        }
    }

    // Verificar campos requeridos
    const requiredFields: ColumnType[] = ['wa_id']
    const requiredFieldsMissing = requiredFields.filter(field => !detectedTypes.has(field))

    return {
        mappings,
        unmappedColumns,
        requiredFieldsMissing
    }
}

/**
 * Convierte un mapeo a un objeto de transformación
 */
export function createTransformMap(mappings: ColumnMapping[]): Record<string, ColumnType> {
    const transformMap: Record<string, ColumnType> = {}
    for (const mapping of mappings) {
        transformMap[mapping.sourceColumn] = mapping.targetField
    }
    return transformMap
}

/**
 * Transforma una fila de datos según el mapeo
 */
export function transformRow(
    row: Record<string, any>,
    transformMap: Record<string, ColumnType>
): Partial<Record<ColumnType, any>> {
    const transformed: Partial<Record<ColumnType, any>> = {}

    for (const [sourceColumn, targetField] of Object.entries(transformMap)) {
        const value = row[sourceColumn]
        if (value !== null && value !== undefined) {
            transformed[targetField] = value
        }
    }

    return transformed
}

'use client'

import { useState, useEffect } from 'react'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Save, Settings as SettingsIcon, Globe, MessageSquare, Zap, Package } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
    const { settings, loading, updateSettings } = useSystemSettings()
    const [saving, setSaving] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    const [formData, setFormData] = useState({
        business_name: '',
        timezone: '',
        currency: 'COP' as 'COP' | 'USD' | 'MXN',
        whatsapp_enabled: false,
        whatsapp_phone_id: '',
        whatsapp_waba_id: '',
        meta_pixel_id: '',
        default_followup_days: 3,
        clinic_enabled: true,
        appointments_enabled: true,
    })

    // Check if user is admin
    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                toast.error('Acceso Denegado', {
                    description: 'Solo administradores pueden acceder a esta sección.'
                })
                router.push('/dashboard')
            } else {
                setIsAdmin(true)
            }
            setCheckingAuth(false)
        }

        checkAdmin()
    }, [supabase, router])

    // Load settings into form
    useEffect(() => {
        if (settings) {
            setFormData({
                business_name: settings.business_name,
                timezone: settings.timezone,
                currency: settings.currency,
                whatsapp_enabled: settings.whatsapp_enabled,
                whatsapp_phone_id: settings.whatsapp_phone_id || '',
                whatsapp_waba_id: settings.whatsapp_waba_id || '',
                meta_pixel_id: settings.meta_pixel_id || '',
                default_followup_days: settings.default_followup_days,
                clinic_enabled: settings.clinic_enabled,
                appointments_enabled: settings.appointments_enabled,
            })
        }
    }, [settings])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }))
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const { error } = await updateSettings(formData)

        if (error) {
            toast.error('Error al guardar', {
                description: error
            })
        } else {
            toast.success('Configuración guardada', {
                description: 'Los cambios se han aplicado correctamente.'
            })
        }
        setSaving(false)
    }

    if (checkingAuth || loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!isAdmin) {
        return null
    }

    return (
        <div className="h-full overflow-auto">
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <SettingsIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold">Configuración del Sistema</h1>
                        <p className="text-sm text-muted-foreground">Administra la configuración global del CRM</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
                    {/* General Settings */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-primary" />
                                <CardTitle>Configuración General</CardTitle>
                            </div>
                            <CardDescription>Información básica del negocio</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nombre del Negocio</label>
                                    <input
                                        type="text"
                                        name="business_name"
                                        value={formData.business_name}
                                        onChange={handleChange}
                                        className="w-full p-2 md:p-3 border rounded-lg text-sm min-h-[44px]"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Zona Horaria</label>
                                    <select
                                        name="timezone"
                                        value={formData.timezone}
                                        onChange={handleChange}
                                        className="w-full p-2 md:p-3 border rounded-lg text-sm min-h-[44px]"
                                    >
                                        <option value="America/Bogota">Bogotá (GMT-5)</option>
                                        <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                                        <option value="America/New_York">Nueva York (GMT-5)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Moneda</label>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleChange}
                                        className="w-full p-2 md:p-3 border rounded-lg text-sm min-h-[44px]"
                                    >
                                        <option value="COP">COP - Peso Colombiano</option>
                                        <option value="USD">USD - Dólar</option>
                                        <option value="MXN">MXN - Peso Mexicano</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* WhatsApp Integration */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-primary" />
                                <CardTitle>Integración WhatsApp</CardTitle>
                            </div>
                            <CardDescription>Configuración de WhatsApp Business API</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                <input
                                    type="checkbox"
                                    name="whatsapp_enabled"
                                    checked={formData.whatsapp_enabled}
                                    onChange={handleChange}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <label className="text-sm font-medium cursor-pointer">Habilitar WhatsApp Bot</label>
                                    <p className="text-xs text-muted-foreground">Activa el bot automático para nuevos mensajes</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                                <p className="text-xs md:text-sm text-blue-900 mb-2">
                                    <strong>Nota:</strong> Los siguientes valores son informativos. Las credenciales reales (tokens, secrets) deben configurarse en las variables de entorno de Supabase por seguridad.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phone Number ID</label>
                                    <input
                                        type="text"
                                        name="whatsapp_phone_id"
                                        value={formData.whatsapp_phone_id}
                                        onChange={handleChange}
                                        placeholder="123456789012345"
                                        className="w-full p-2 md:p-3 border rounded-lg text-sm min-h-[44px] bg-muted/30"
                                        readOnly
                                    />
                                    <p className="text-xs text-muted-foreground">Solo lectura - configurar en Supabase Secrets</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">WhatsApp Business Account ID</label>
                                    <input
                                        type="text"
                                        name="whatsapp_waba_id"
                                        value={formData.whatsapp_waba_id}
                                        onChange={handleChange}
                                        placeholder="987654321098765"
                                        className="w-full p-2 md:p-3 border rounded-lg text-sm min-h-[44px] bg-muted/30"
                                        readOnly
                                    />
                                    <p className="text-xs text-muted-foreground">Solo lectura - configurar en Supabase Secrets</p>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium">Meta Pixel ID (Opcional)</label>
                                    <input
                                        type="text"
                                        name="meta_pixel_id"
                                        value={formData.meta_pixel_id}
                                        onChange={handleChange}
                                        placeholder="1234567890123456"
                                        className="w-full p-2 md:p-3 border rounded-lg text-sm min-h-[44px]"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Automation Settings */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-primary" />
                                <CardTitle>Automatizaciones</CardTitle>
                            </div>
                            <CardDescription>Configuración de seguimientos automáticos</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Días para Seguimiento Automático</label>
                                <input
                                    type="number"
                                    name="default_followup_days"
                                    value={formData.default_followup_days}
                                    onChange={handleChange}
                                    min="1"
                                    max="30"
                                    className="w-full md:w-48 p-2 md:p-3 border rounded-lg text-sm min-h-[44px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Días de espera antes de enviar mensaje automático de seguimiento a leads sin respuesta
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Module Toggles */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                <CardTitle>Módulos del Sistema</CardTitle>
                            </div>
                            <CardDescription>Habilita o deshabilita funcionalidades</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                <input
                                    type="checkbox"
                                    name="clinic_enabled"
                                    checked={formData.clinic_enabled}
                                    onChange={handleChange}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <label className="text-sm font-medium cursor-pointer">Módulo de Clínica</label>
                                    <p className="text-xs text-muted-foreground">Historias clínicas y fórmulas ópticas</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                <input
                                    type="checkbox"
                                    name="appointments_enabled"
                                    checked={formData.appointments_enabled}
                                    onChange={handleChange}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <label className="text-sm font-medium cursor-pointer">Módulo de Agenda</label>
                                    <p className="text-xs text-muted-foreground">Gestión de citas y calendario</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end gap-3 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    <span>Guardar Cambios</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

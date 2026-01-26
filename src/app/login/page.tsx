'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Glasses, Loader2, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [resetMode, setResetMode] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            toast.error('Error al iniciar sesión', {
                description: error.message === 'Invalid login credentials'
                    ? 'Credenciales inválidas. Verifica tu email y contraseña.'
                    : error.message
            })
            setLoading(false)
        } else if (data.user) {
            // Check if profile exists, create if not
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .single()

            if (!profile) {
                // Create profile with default role
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    full_name: data.user.email?.split('@')[0] || 'Usuario',
                    role: 'vendedor',
                    email: data.user.email,
                    active: true
                })
            }

            toast.success('¡Bienvenido!', {
                description: 'Iniciando sesión...'
            })
            router.push('/dashboard')
            router.refresh()
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        })

        if (error) {
            toast.error('Error al enviar email', {
                description: error.message
            })
        } else {
            toast.success('Email enviado', {
                description: 'Revisa tu correo para restablecer tu contraseña.'
            })
            setResetMode(false)
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black p-4">
            <div className="w-full max-w-md">
                {/* Logo and Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary mb-4">
                        <Glasses className="h-8 w-8 md:h-10 md:w-10 text-black" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Lyon Visión</h1>
                    <p className="text-sm md:text-base text-gray-400">Sistema CRM</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">
                        {resetMode ? 'Restablecer Contraseña' : 'Iniciar Sesión'}
                    </h2>

                    <form onSubmit={resetMode ? handleResetPassword : handleLogin} className="space-y-4">
                        {/* Email Input */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="tu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input - Only show if not in reset mode */}
                        {!resetMode && (
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Procesando...</span>
                                </>
                            ) : (
                                <span>{resetMode ? 'Enviar Email' : 'Iniciar Sesión'}</span>
                            )}
                        </button>

                        {/* Toggle Reset Mode */}
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setResetMode(!resetMode)}
                                className="text-sm text-gray-600 hover:text-primary transition-colors"
                            >
                                {resetMode ? '← Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs md:text-sm text-gray-500 mt-6">
                    © 2026 Óptica Lyon Visión. Todos los derechos reservados.
                </p>
            </div>
        </div>
    )
}

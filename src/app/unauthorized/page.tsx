'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'

function UnauthorizedContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const error = searchParams.get('error')
        if (error === 'unauthorized') {
            toast.error('Acceso Denegado', {
                description: 'No tienes permisos para acceder a esta sección.'
            })
            // Redirect to dashboard after showing toast
            setTimeout(() => router.push('/dashboard'), 2000)
        }
    }, [searchParams, router])

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <ShieldAlert className="h-16 w-16 md:h-20 md:w-20 text-destructive mb-4" />
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Acceso Denegado</h1>
            <p className="text-muted-foreground mb-6 max-w-md">
                No tienes los permisos necesarios para acceder a esta página.
            </p>
            <button
                onClick={() => router.push('/dashboard')}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
                Volver al Dashboard
            </button>
        </div>
    )
}

export default function UnauthorizedPage() {
    return (
        <Suspense fallback={
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        }>
            <UnauthorizedContent />
        </Suspense>
    )
}

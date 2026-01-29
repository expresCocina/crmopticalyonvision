'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function NotificationPermission() {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [isSupported, setIsSupported] = useState(false)

    useEffect(() => {
        // Check if notifications are supported
        if ('Notification' in window) {
            setIsSupported(true)
            setPermission(Notification.permission)
        }
    }, [])

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            toast.error('Las notificaciones no están soportadas en este navegador')
            return
        }

        try {
            const result = await Notification.requestPermission()
            setPermission(result)

            if (result === 'granted') {
                toast.success('¡Notificaciones activadas! 🔔')

                // Test notification
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification('CRM Lyon Visión', {
                            body: 'Las notificaciones están activas',
                            icon: '/icons/icon-192x192.png',
                            vibrate: [200, 100, 200],
                            tag: 'test-notification'
                        } as any)
                    })
                }
            } else if (result === 'denied') {
                toast.error('Permisos denegados. Actívalos en la configuración del navegador.')
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error)
            toast.error('Error al solicitar permisos')
        }
    }

    if (!isSupported) {
        return null
    }

    if (permission === 'granted') {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4 text-green-500" />
                <span>Notificaciones activas</span>
            </div>
        )
    }

    return (
        <Button
            variant={permission === 'denied' ? 'destructive' : 'outline'}
            size="sm"
            onClick={requestPermission}
            className="gap-2"
        >
            <BellOff className="h-4 w-4" />
            {permission === 'denied' ? 'Permisos denegados' : 'Activar notificaciones'}
        </Button>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export function NotificationPermission() {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        // Check if notifications and service workers are supported
        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            setPermission(Notification.permission)

            // Check if already subscribed
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(subscription => {
                    setIsSubscribed(!!subscription)
                })
            })
        }
    }, [])

    const subscribeToPush = async () => {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            toast.error('Las notificaciones push no están soportadas en este navegador')
            return
        }

        if (!VAPID_PUBLIC_KEY) {
            toast.error('Error de configuración: VAPID key no encontrada')
            console.error('VAPID_PUBLIC_KEY is not set')
            return
        }

        try {
            // Request notification permission
            const result = await Notification.requestPermission()
            setPermission(result)

            if (result !== 'granted') {
                toast.error('Permisos denegados. Actívalos en la configuración del navegador.')
                return
            }

            // Wait for service worker to be ready
            const registration = await navigator.serviceWorker.ready

            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            })

            // Send subscription to backend
            const { error } = await supabase.functions.invoke('push-subscribe', {
                body: { subscription: subscription.toJSON() }
            })

            if (error) {
                console.error('Error storing subscription:', error)
                toast.error('Error al guardar la suscripción')
                return
            }

            setIsSubscribed(true)
            toast.success('¡Notificaciones push activadas! 🔔')

        } catch (error) {
            console.error('Error subscribing to push:', error)
            toast.error('Error al activar notificaciones push')
        }
    }

    if (!isSupported) {
        return null
    }

    if (permission === 'granted' && isSubscribed) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4 text-green-500" />
                <span className="hidden md:inline">Push activo</span>
            </div>
        )
    }

    return (
        <Button
            variant={permission === 'denied' ? 'destructive' : 'outline'}
            size="sm"
            onClick={subscribeToPush}
            className="gap-2"
        >
            <BellOff className="h-4 w-4" />
            <span className="hidden md:inline">
                {permission === 'denied' ? 'Permisos denegados' : 'Activar Push'}
            </span>
        </Button>
    )
}

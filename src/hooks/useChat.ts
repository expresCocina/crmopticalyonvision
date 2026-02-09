'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lead, Message } from '@/types/database'
import { toast } from 'sonner'

export function useChat() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [activeLeadId, setActiveLeadIdState] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [loadingLeads, setLoadingLeads] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const supabase = createClient()

    // 1. Fetch Leads (Conversations)
    useEffect(() => {
        const fetchLeads = async () => {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('last_interaction', { ascending: false })

            if (error) {
                console.error('Error loading chats:', error)
            } else {
                setLeads(data || [])
            }
            setLoadingLeads(false)
        }

        fetchLeads()

        // Subscribe to new leads or status updates
        const channel = supabase.channel('chat_leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setLeads(prev => [payload.new as Lead, ...prev])
                } else if (payload.eventType === 'UPDATE') {
                    setLeads(prev => {
                        const updated = prev.map(l => l.id === payload.new.id ? payload.new as Lead : l)
                        // Re-sort by last_interaction
                        return updated.sort((a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime())
                    })
                }
            })
            .subscribe()

        // Request Notification Permission on Mount
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission()
        }

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    // Helper: Play Sound
    const playNotificationSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3') // Short distinct ping
            audio.play().catch(e => console.error("Error playing sound:", e))
        } catch (e) {
            console.error("Audio error:", e)
        }
    }

    // Helper: Show System Notification
    const showNotification = (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                // Check if service worker is ready for mobile notifications (PWA)
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: '/icons/icon-192x192.png',
                        vibrate: [200, 100, 200],
                        tag: 'new-message'
                    } as any)
                }).catch(() => {
                    // Fallback to desktop notification
                    new Notification(title, {
                        body: body,
                        icon: '/icons/icon-192x192.png'
                    })
                })
            } catch (e) {
                new Notification(title, { body })
            }
        }
    }

    // 2. Fetch Messages for Active Lead (Logic kept same, just adding notification to Global Listener)
    // NOTE: The separate channel for 'chat_messages' might be redundant if we want global notifications. 
    // We need a global listener for ALL messages to notify even if chat is not active.

    // 1.1 Global Message Listener for Notifications (New)
    useEffect(() => {
        const channel = supabase.channel('global_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: "direction=eq.inbound" }, async (payload) => {
                const newMessage = payload.new as Message

                // If the message is from the active lead and window is focused, maybe just sound?
                // But for PWA, we usually want notification if app is in background.

                // Ideally we check document.hidden or if activeLeadId !== newMessage.lead_id
                const isHidden = document.hidden
                const isOtherChat = activeLeadId !== newMessage.lead_id

                if (isHidden || isOtherChat) {
                    playNotificationSound()

                    // Fetch lead name for better notification
                    const { data: lead } = await supabase.from('leads').select('full_name').eq('id', newMessage.lead_id).single()
                    const senderName = lead?.full_name || 'Nuevo Mensaje'

                    showNotification(`Mensaje de ${senderName}`, newMessage.content || '')
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, activeLeadId])

    // 2. Fetch Messages for Active Lead
    useEffect(() => {
        if (!activeLeadId) {
            setMessages([])
            return
        }

        const fetchMessages = async () => {
            setLoadingMessages(true)
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('lead_id', activeLeadId)
                .order('created_at', { ascending: true })

            if (error) toast.error("Error cargando mensajes")
            else setMessages(data || [])
            setLoadingMessages(false)
        }

        fetchMessages()

        // Subscribe to new messages for this lead
        const channel = supabase.channel(`chat_messages:${activeLeadId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${activeLeadId}` }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [activeLeadId, supabase])

    // 3. Send Message Function
    const sendMessage = async (content: string) => {
        if (!activeLeadId || !content.trim()) return

        try {
            // Call the whatsapp-outbound Edge Function to send the message
            const { data, error } = await supabase.functions.invoke('whatsapp-outbound', {
                body: {
                    lead_id: activeLeadId,
                    message: content
                }
            })

            if (error) {
                console.error('Error calling whatsapp-outbound:', error)
                toast.error("No se pudo enviar el mensaje a WhatsApp")
                return
            }

            if (!data?.success) {
                console.error('WhatsApp send failed:', data)
                toast.error("Error al enviar mensaje a WhatsApp")
                return
            }

            // Success - the Edge Function handles database insert and WhatsApp API call



        } catch (err) {
            console.error('Exception sending message:', err)
            toast.error("Error inesperado al enviar mensaje")
        }
    }

    // 3.1 Send Image with Caption
    const sendImageMessage = async (imageFile: File, caption?: string) => {
        if (!activeLeadId) return

        try {
            toast.loading('Subiendo imagen...')

            // 1. Upload image to Supabase Storage
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `${activeLeadId}/${Date.now()}.${fileExt}`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(fileName, imageFile, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                toast.dismiss()
                toast.error('Error al subir imagen')
                return
            }

            // 2. Get signed URL (válida por 7 días) para que WhatsApp pueda acceder
            const { data: signedData, error: signedError } = await supabase.storage
                .from('chat-media')
                .createSignedUrl(uploadData.path, 604800) // 7 días en segundos

            if (signedError || !signedData) {
                console.error('Signed URL error:', signedError)
                toast.dismiss()
                toast.error('Error al generar URL de imagen')
                return
            }

            const mediaUrl = signedData.signedUrl

            toast.dismiss()
            toast.loading('Enviando imagen...')

            // 3. Call Edge Function to send via WhatsApp
            const { data, error } = await supabase.functions.invoke('whatsapp-outbound', {
                body: {
                    lead_id: activeLeadId,
                    media_url: mediaUrl,
                    caption: caption || '',
                    type: 'image'
                }
            })

            toast.dismiss()

            if (error || !data?.success) {
                console.error('Error sending image:', error || data)
                toast.error('Error al enviar imagen')
                return
            }

            toast.success('Imagen enviada')

        } catch (err) {
            console.error('Exception sending image:', err)
            toast.dismiss()
            toast.error('Error inesperado al enviar imagen')
        }
    }

    // 3.2 Send Audio Message
    const sendAudioMessage = async (audioBlob: Blob) => {
        if (!activeLeadId) return

        try {
            toast.loading('Subiendo audio...')

            // Detect actual audio format from blob
            const audioType = audioBlob.type || 'audio/webm;codecs=opus'
            console.log('Audio blob type:', audioType)

            // Determine file extension based on MIME type
            let extension = 'webm'
            if (audioType.includes('mp4')) extension = 'mp4'
            else if (audioType.includes('aac')) extension = 'aac'
            else if (audioType.includes('mpeg') || audioType.includes('mp3')) extension = 'mp3'
            else if (audioType.includes('ogg')) extension = 'ogg'

            // 1. Upload audio to Supabase Storage
            const fileName = `${activeLeadId}/${Date.now()}.${extension}`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(fileName, audioBlob, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: audioType
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                toast.dismiss()
                toast.error('Error al subir audio')
                return
            }

            // 2. Get signed URL (válida por 7 días)
            const { data: signedData, error: signedError } = await supabase.storage
                .from('chat-media')
                .createSignedUrl(uploadData.path, 604800) // 7 días

            if (signedError || !signedData) {
                console.error('Signed URL error:', signedError)
                toast.dismiss()
                toast.error('Error al generar URL de audio')
                return
            }

            const mediaUrl = signedData.signedUrl

            toast.dismiss()
            toast.loading('Enviando audio...')

            // 3. Call Edge Function to send via WhatsApp
            const { data, error } = await supabase.functions.invoke('whatsapp-outbound', {
                body: {
                    lead_id: activeLeadId,
                    media_url: mediaUrl,
                    type: 'audio'
                }
            })

            toast.dismiss()

            if (error || !data?.success) {
                console.error('Error sending audio:', error || data)
                toast.error('Error al enviar audio')
                return
            }

            toast.success('Audio enviado')

        } catch (err) {
            console.error('Exception sending audio:', err)
            toast.dismiss()
            toast.error('Error inesperado al enviar audio')
        }
    }


    // 4. Set Active Lead & Mark as Read (Pipeline Move)
    const setActiveLeadId = async (id: string | null) => {
        setActiveLeadIdState(id)
        if (!id) return

        const lead = leads.find(l => l.id === id)
        if (lead) {
            // Reset unread count to 0
            const { error } = await supabase
                .from('leads')
                .update({ unread_count: 0 })
                .eq('id', id)

            if (error) console.error('Error updating lead unread count:', error)

            // Optimistic update for UI responsiveness
            setLeads(prev => prev.map(l => l.id === id ? { ...l, unread_count: 0 } : l))
        }
    }

    // 5. Toggle Bot Active/Inactive
    const toggleBot = async (leadId: string) => {
        const lead = leads.find(l => l.id === leadId)
        if (!lead) return

        const newBotActive = !lead.bot_active

        try {
            const { error } = await supabase
                .from('leads')
                .update({ bot_active: newBotActive })
                .eq('id', leadId)

            if (error) {
                toast.error('Error al cambiar estado del bot')
                console.error('Error toggling bot:', error)
                return
            }

            // Optimistic update
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, bot_active: newBotActive } : l))
            toast.success(newBotActive ? 'Bot activado' : 'Bot desactivado')
        } catch (err) {
            console.error('Exception toggling bot:', err)
            toast.error('Error inesperado')
        }
    }

    return {
        leads,
        activeLeadId,
        setActiveLeadId,
        messages,
        loadingLeads,
        loadingMessages,
        sendMessage,
        sendImageMessage,
        sendAudioMessage,
        toggleBot
    }
}

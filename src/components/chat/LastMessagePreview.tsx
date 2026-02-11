'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Image, Mic, FileText, Video } from 'lucide-react'

interface LastMessagePreviewProps {
    leadId: string
    className?: string
}

export function LastMessagePreview({ leadId, className }: LastMessagePreviewProps) {
    const [lastMessage, setLastMessage] = useState<{
        content: string | null
        type: string
        direction: 'inbound' | 'outbound'
    } | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchLastMessage = async () => {
            const { data } = await supabase
                .from('messages')
                .select('content, type, direction')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (data) {
                setLastMessage(data)
            }
        }

        fetchLastMessage()

        // Subscribe to new messages for this lead
        const channel = supabase
            .channel(`last_message_${leadId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `lead_id=eq.${leadId}`
            }, (payload) => {
                setLastMessage({
                    content: payload.new.content,
                    type: payload.new.type,
                    direction: payload.new.direction
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [leadId, supabase])

    if (!lastMessage) {
        return <span className={className}>Sin mensajes</span>
    }

    const getMessageIcon = () => {
        switch (lastMessage.type) {
            case 'image':
                return <Image className="h-3 w-3" />
            case 'audio':
            case 'voice':
                return <Mic className="h-3 w-3" />
            case 'video':
                return <Video className="h-3 w-3" />
            case 'document':
                return <FileText className="h-3 w-3" />
            default:
                return null
        }
    }

    const getMessagePreview = () => {
        const prefix = lastMessage.direction === 'outbound' ? 'Tú: ' : ''

        switch (lastMessage.type) {
            case 'image':
                return `${prefix}📷 Foto`
            case 'audio':
            case 'voice':
                return `${prefix}🎤 Audio`
            case 'video':
                return `${prefix}🎥 Video`
            case 'document':
                return `${prefix}📄 Documento`
            case 'text':
            default:
                const content = lastMessage.content || 'Mensaje'
                const truncated = content.length > 35 ? content.substring(0, 35) + '...' : content
                return `${prefix}${truncated}`
        }
    }

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {getMessageIcon()}
            <span className="truncate">{getMessagePreview()}</span>
        </div>
    )
}

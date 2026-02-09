'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface AudioRecorderProps {
    onRecordingComplete: (audioBlob: Blob) => void
    disabled?: boolean
}

export function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [audioURL, setAudioURL] = useState<string | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            })

            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' })
                const url = URL.createObjectURL(audioBlob)
                setAudioURL(url)

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
            setRecordingTime(0)

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1)
            }, 1000)

        } catch (error) {
            console.error('Error accessing microphone:', error)
            toast.error('No se pudo acceder al micrófono')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)

            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }

    const sendAudio = () => {
        if (chunksRef.current.length > 0) {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' })
            onRecordingComplete(audioBlob)

            // Reset
            setAudioURL(null)
            setRecordingTime(0)
            chunksRef.current = []
        }
    }

    const cancelRecording = () => {
        setAudioURL(null)
        setRecordingTime(0)
        chunksRef.current = []
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // If there's a recorded audio, show preview
    if (audioURL) {
        return (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <audio src={audioURL} controls className="flex-1 h-8" />
                <Button size="sm" onClick={sendAudio} variant="default">
                    Enviar
                </Button>
                <Button size="sm" onClick={cancelRecording} variant="ghost">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            {isRecording && (
                <span className="text-sm text-muted-foreground animate-pulse">
                    {formatTime(recordingTime)}
                </span>
            )}
            <Button
                type="button"
                size="icon"
                variant={isRecording ? "destructive" : "ghost"}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled}
                title={isRecording ? "Detener grabación" : "Grabar audio"}
            >
                {isRecording ? (
                    <Square className="h-4 w-4" />
                ) : (
                    <Mic className="h-4 w-4" />
                )}
            </Button>
        </div>
    )
}

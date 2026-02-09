'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Image as ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'

interface MediaUploadButtonProps {
    onImageSelect: (file: File, caption?: string) => void
    disabled?: boolean
}

export function MediaUploadButton({ onImageSelect, disabled }: MediaUploadButtonProps) {
    const [showDialog, setShowDialog] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [caption, setCaption] = useState('')
    const [preview, setPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imágenes')
            return
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no debe superar 5MB')
            return
        }

        setSelectedFile(file)

        // Create preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        setShowDialog(true)
    }

    const handleSend = () => {
        if (selectedFile) {
            onImageSelect(selectedFile, caption)
            handleClose()
        }
    }

    const handleClose = () => {
        setShowDialog(false)
        setSelectedFile(null)
        setCaption('')
        setPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
            />
            <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                title="Enviar imagen"
            >
                <ImageIcon className="h-4 w-4" />
            </Button>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Enviar Imagen</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {preview && (
                            <div className="relative">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full h-auto max-h-64 object-contain rounded-lg border"
                                />
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="absolute top-2 right-2"
                                    onClick={handleClose}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="caption">Mensaje (opcional)</Label>
                            <Textarea
                                id="caption"
                                placeholder="Escribe un mensaje para acompañar la imagen..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSend}>
                            Enviar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

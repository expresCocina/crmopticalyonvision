import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
    try {
        const url = new URL(req.url)
        const imageUrl = url.searchParams.get('url')

        if (!imageUrl) {
            return new Response('Missing url parameter', { status: 400 })
        }

        // Download image from WhatsApp with authentication
        const response = await fetch(imageUrl, {
            headers: {
                'Authorization': `Bearer ${Deno.env.get('WHATSAPP_API_TOKEN')}`
            }
        })

        if (!response.ok) {
            console.error('Failed to fetch image:', await response.text())
            return new Response('Failed to fetch image', { status: response.status })
        }

        const imageBlob = await response.blob()

        // Return image with proper headers
        return new Response(imageBlob, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*'
            }
        })
    } catch (error) {
        console.error('Error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
})

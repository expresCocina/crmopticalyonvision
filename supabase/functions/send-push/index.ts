import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { title, body, leadId, userId } = await req.json()

        if (!title || !body) {
            return new Response(JSON.stringify({ error: 'Title and body are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Configure web-push with VAPID keys
        const vapidPublicKey = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
        const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@optica-lyon.com'

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.error('VAPID keys not configured')
            return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        webpush.setVapidDetails(
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey
        )

        // Get all push subscriptions (or filter by userId if provided)
        let query = supabaseAdmin.from('push_subscriptions').select('*')

        if (userId) {
            query = query.eq('user_id', userId)
        }

        const { data: subscriptions, error: subError } = await query

        if (subError) {
            console.error('Error fetching subscriptions:', subError)
            return new Response(JSON.stringify({ error: subError.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Send push notification to all subscriptions
        const payload = JSON.stringify({
            title,
            body,
            url: leadId ? `/?lead=${leadId}` : '/',
            leadId,
            tag: 'new-message'
        })

        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    const pushSubscription = {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth
                        }
                    }

                    await webpush.sendNotification(pushSubscription, payload)
                    return { success: true, endpoint: sub.endpoint }
                } catch (error: any) {
                    console.error('Error sending to subscription:', error)

                    // If subscription is invalid (410 Gone), delete it
                    if (error.statusCode === 410) {
                        await supabaseAdmin
                            .from('push_subscriptions')
                            .delete()
                            .eq('endpoint', sub.endpoint)
                    }

                    return { success: false, endpoint: sub.endpoint, error: error.message }
                }
            })
        )

        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
        const failed = results.length - successful

        return new Response(JSON.stringify({
            message: 'Push notifications sent',
            successful,
            failed,
            total: results.length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

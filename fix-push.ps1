# Script to fix push notifications in whatsapp-inbound

$file = "supabase\functions\whatsapp-inbound\index.ts"
$content = Get-Content $file -Raw

# Replace the problematic push notification block
$oldCode = @"
        // ENVIAR NOTIFICACIÓN PUSH
        try {
            const { data: lead } = await supabase.from('leads').select('full_name').eq('id', leadId).single()
            const senderName = lead?.full_name || 'Nuevo Mensaje'
            
            fetch(`$`{Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
                method: 'POST',
                headers: {
                    'Authorization': ``Bearer $`{Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}``,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: ``Mensaje de $`{senderName}``,
                    body: messageContent.substring(0, 100),
                    leadId: leadId
                })
            })
        } catch (pushError) {
            console.error('Error sending push notification:', pushError)
            // Don't fail the whole request if push fails
        }
"@

$newCode = @"
        // ENVIAR NOTIFICACIÓN PUSH (fire-and-forget - no bloquea)
        Promise.resolve().then(async () => {
            try {
                const { data: lead } = await supabase.from('leads').select('full_name').eq('id', leadId).single()
                const senderName = lead?.full_name || 'Nuevo Mensaje'
                
                await fetch(`$`{Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
                    method: 'POST',
                    headers: {
                        'Authorization': ``Bearer $`{Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}``,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: ``Mensaje de $`{senderName}``,
                        body: messageContent.substring(0, 100),
                        leadId: leadId
                    })
                })
            } catch (err) {
                console.error('[Push] Error (non-blocking):', err)
            }
        }).catch(err => console.error('[Push] Promise error:', err))
"@

$newContent = $content -replace [regex]::Escape($oldCode), $newCode

Set-Content $file -Value $newContent -NoNewline

Write-Host "✅ Push notification code updated successfully!"
Write-Host "Now run: git add . && git commit -m 'fix: non-blocking push' && git push"

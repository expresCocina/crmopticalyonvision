# WhatsApp Edge Functions - Deployment Guide

## Overview
Two Supabase Edge Functions for WhatsApp Cloud API integration:
- `whatsapp-inbound`: Webhook for receiving messages from Meta
- `whatsapp-outbound`: API for sending messages to WhatsApp users

## Prerequisites
1. Supabase project with database schema deployed
2. WhatsApp Business Account with Cloud API access
3. Supabase CLI installed: `npm install -g supabase`

## Step 1: Configure Secrets in Supabase

Go to Supabase Dashboard → Edge Functions → Secrets and add:

```bash
# WhatsApp Verification Token (create your own random string)
WHATSAPP_VERIFY_TOKEN=your_random_verify_token_here

# WhatsApp Access Token (from Meta Business Suite)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token

# WhatsApp Phone Number ID (from Meta Business Suite)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Supabase (auto-populated, verify they exist)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 2: Deploy Edge Functions

From project root:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy whatsapp-inbound
supabase functions deploy whatsapp-inbound --no-verify-jwt

# Deploy whatsapp-outbound
supabase functions deploy whatsapp-outbound
```

**Important**: `--no-verify-jwt` flag is required for `whatsapp-inbound` because Meta webhooks don't send JWT tokens.

## Step 3: Get Webhook URL

After deployment, your webhook URL will be:
```
https://your-project.supabase.co/functions/v1/whatsapp-inbound
```

## Step 4: Configure Meta Webhook

1. Go to Meta Business Suite → WhatsApp → Configuration
2. Add Webhook URL: `https://your-project.supabase.co/functions/v1/whatsapp-inbound`
3. Add Verify Token: (same as `WHATSAPP_VERIFY_TOKEN` secret)
4. Subscribe to webhook fields:
   - `messages`
   - `message_status` (optional)

## Step 5: Test Webhook Verification

Meta will send a GET request to verify. Check logs:

```bash
supabase functions logs whatsapp-inbound
```

You should see: "Webhook verified successfully"

## Step 6: Test Inbound Messages

Send a WhatsApp message to your business number. Check:

1. **Edge Function logs**:
```bash
supabase functions logs whatsapp-inbound --tail
```

2. **Database**:
```sql
-- Check new lead created
SELECT * FROM leads WHERE source = 'whatsapp' ORDER BY created_at DESC LIMIT 1;

-- Check message saved
SELECT * FROM messages ORDER BY created_at DESC LIMIT 1;
```

## Step 7: Test Outbound Messages

### Using curl:

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/whatsapp-outbound \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "uuid-of-lead",
    "message": "Hola! Este es un mensaje de prueba desde el CRM."
  }'
```

### From Frontend (Next.js):

```typescript
const sendWhatsAppMessage = async (leadId: string, message: string) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/whatsapp-outbound`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead_id: leadId, message })
    }
  )
  return response.json()
}
```

## Troubleshooting

### Webhook not receiving messages
- Check Meta webhook configuration
- Verify `WHATSAPP_VERIFY_TOKEN` matches
- Check Edge Function logs for errors

### Outbound messages failing
- Verify `WHATSAPP_ACCESS_TOKEN` is valid
- Check `WHATSAPP_PHONE_NUMBER_ID` is correct
- Ensure phone number is verified in Meta Business Suite

### Database errors
- Verify RLS policies allow service role access
- Check that `leads` and `messages` tables exist
- Ensure `system_settings` table exists

## Security Notes

✅ **Good Practices**:
- All secrets stored in Supabase Edge Functions (never in frontend)
- `whatsapp-inbound` is public (Meta requirement)
- `whatsapp-outbound` requires authentication
- Service role key used server-side only

❌ **Never**:
- Expose WhatsApp tokens in frontend code
- Commit secrets to git
- Use anon key for admin operations

## Monitoring

View real-time logs:
```bash
# Inbound webhook
supabase functions logs whatsapp-inbound --tail

# Outbound messages
supabase functions logs whatsapp-outbound --tail
```

## Next Steps

1. Enable WhatsApp in Settings page (`/settings`)
2. Implement bot logic in `whatsapp-inbound` for auto-responses
3. Add message templates for common responses
4. Set up message status webhooks for delivery tracking

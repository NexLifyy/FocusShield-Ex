import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Paddle Webhook Secret ──
const PADDLE_WEBHOOK_SECRET = 'ntfset_01kxrneyhx38byacse6bjztfer';

// ── Verify Paddle HMAC-SHA256 Signature ──
async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!signatureHeader) return false;

  // Header format: ts=TIMESTAMP;h1=HASH
  const parts = Object.fromEntries(
    signatureHeader.split(';').map((p) => p.split('=') as [string, string])
  );
  const ts = parts['ts'];
  const h1 = parts['h1'];
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(PADDLE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computedHex === h1;
}

// ── Extract customer email from Paddle event ──
function extractEmail(event: Record<string, unknown>): string | null {
  try {
    const data = event.data as Record<string, unknown>;
    // transaction.completed / subscription.created share this path
    const customer = data?.customer as Record<string, unknown> | undefined;
    if (customer?.email) return customer.email as string;

    // Fallback: check address / billing details
    const address = data?.address as Record<string, unknown> | undefined;
    if (address?.email) return address.email as string;

    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('Paddle-Signature');

  // ── Verify signature ──
  const valid = await verifyPaddleSignature(rawBody, signatureHeader);
  if (!valid) {
    console.error('[paddle-webhook] Invalid signature');
    return new Response('Unauthorized', { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const eventType = event.event_type as string;
  console.log('[paddle-webhook] Received event:', eventType);

  // ── Only handle relevant events ──
  const relevantEvents = [
    'transaction.completed',
    'subscription.created',
    'subscription.activated',
  ];
  if (!relevantEvents.includes(eventType)) {
    return new Response('OK - Event ignored', { status: 200 });
  }

  const email = extractEmail(event);
  if (!email) {
    console.error('[paddle-webhook] No email found in event:', JSON.stringify(event));
    return new Response('OK - No email found', { status: 200 });
  }

  // ── Connect to Supabase with service role (bypasses RLS) ──
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // ── Find user by email in auth.users ──
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('[paddle-webhook] Failed to list users:', userError);
    return new Response('Internal Error', { status: 500 });
  }

  const user = users.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    console.warn('[paddle-webhook] No Supabase user found for email:', email);
    // Still return 200 so Paddle doesn't retry — the user may not have signed up yet
    return new Response('OK - User not found', { status: 200 });
  }

  // ── Update profiles table: is_premium = true ──
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_premium: true, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateError) {
    console.error('[paddle-webhook] Failed to update profile:', updateError);
    return new Response('Internal Error', { status: 500 });
  }

  console.log(`[paddle-webhook] ✅ Granted Pro to ${email} (uid: ${user.id})`);
  return new Response('OK', { status: 200 });
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Paddle Webhook Secret ──
const PADDLE_WEBHOOK_SECRET = 'ntfset_01kxrneyhx38byacse6bjztfer';

// ── Events that GRANT Pro access ──
const GRANT_EVENTS = new Set([
  'transaction.completed',   // Lifetime one-time payment
  'subscription.created',    // New subscription started
  'subscription.activated',  // Trial converted to paid
  'subscription.resumed',    // Paused subscription resumed
]);

// ── Events that REVOKE Pro access ──
const REVOKE_EVENTS = new Set([
  'subscription.canceled',   // User canceled subscription
  'subscription.expired',    // Subscription fully expired
  'subscription.paused',     // Payment paused (Dunning)
]);

// ── All events we care about ──
const HANDLED_EVENTS = new Set([...GRANT_EVENTS, ...REVOKE_EVENTS]);

// ── Verify Paddle HMAC-SHA256 Signature ──
async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!signatureHeader) return false;

  // Header format: ts=TIMESTAMP;h1=HASH
  const parts = Object.fromEntries(
    signatureHeader.split(';').map((p) => {
      const idx = p.indexOf('=');
      return [p.slice(0, idx), p.slice(idx + 1)] as [string, string];
    })
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

    // Primary path: data.customer.email (subscriptions + transactions)
    const customer = data?.customer as Record<string, unknown> | undefined;
    if (customer?.email) return customer.email as string;

    // Fallback: data.items[0].price.billing_cycle (some events nest differently)
    const billingDetails = data?.billing_details as Record<string, unknown> | undefined;
    if (billingDetails?.email) return billingDetails.email as string;

    return null;
  } catch {
    return null;
  }
}

// ── Efficient user lookup by email via profiles table ──
async function findUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  // Query profiles table directly — much faster than listUsers()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('[paddle-webhook] Profile lookup error:', error);
    return null;
  }
  return data?.id ?? null;
}

// ── Set premium status in Supabase ──
async function setPremiumStatus(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  isPremium: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_premium: isPremium, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('[paddle-webhook] Failed to update profile:', error);
    return false;
  }
  return true;
}

// ── Main Handler ──
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('Paddle-Signature');

  // Verify Paddle signature
  const valid = await verifyPaddleSignature(rawBody, signatureHeader);
  if (!valid) {
    console.error('[paddle-webhook] Invalid signature — possible spoofed request');
    return new Response('Unauthorized', { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const eventType = event.event_type as string;
  console.log('[paddle-webhook] Received:', eventType);

  // Ignore events we don't handle
  if (!HANDLED_EVENTS.has(eventType)) {
    console.log('[paddle-webhook] Ignoring unhandled event:', eventType);
    return new Response('OK', { status: 200 });
  }

  const email = extractEmail(event);
  if (!email) {
    console.error('[paddle-webhook] No email in event:', eventType);
    // Return 200 so Paddle doesn't retry — not recoverable
    return new Response('OK - No email found', { status: 200 });
  }

  // Connect to Supabase with service role (bypasses RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Efficient email → user ID lookup
  const userId = await findUserIdByEmail(supabase, email);
  if (!userId) {
    console.warn('[paddle-webhook] No user found for email:', email, '| Event:', eventType);
    // Return 200 — user may not have signed up to website yet
    return new Response('OK - User not found', { status: 200 });
  }

  // Determine action
  const shouldGrant = GRANT_EVENTS.has(eventType);
  const action = shouldGrant ? 'GRANT' : 'REVOKE';
  console.log(`[paddle-webhook] ${action} Pro → ${email} (${eventType})`);

  const success = await setPremiumStatus(supabase, userId, shouldGrant);
  if (!success) {
    return new Response('Internal Error', { status: 500 });
  }

  console.log(`[paddle-webhook] ✅ ${action} Pro complete for ${email} (uid: ${userId})`);
  return new Response('OK', { status: 200 });
});

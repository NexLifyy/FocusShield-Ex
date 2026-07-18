import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Secrets from Supabase environment variables ──
const PADDLE_API_KEY = Deno.env.get('PADDLE_API_KEY')!;
const PADDLE_WEBHOOK_SECRET = Deno.env.get('PADDLE_WEBHOOK_SECRET')!;

// ── Price ID → Plan type map ──
const PRICE_TO_PLAN: Record<string, string> = {
  'pri_01kxrkpy9smm7aknsyzwfs6fws': 'monthly',
  'pri_01kxrkr5p6f3mz1eghb3qn18hv': 'yearly',
  'pri_01kxrks7p2r4g8wee3kmkvx9f3': 'lifetime',
};

// ── Events that GRANT Pro access ──
const GRANT_EVENTS = new Set([
  'transaction.completed',
  'subscription.created',
  'subscription.activated',
  'subscription.resumed',
]);

// ── Events that REVOKE Pro access ──
const REVOKE_EVENTS = new Set([
  'subscription.canceled',
  'subscription.paused',
]);

// ── Events that UPDATE plan type only (still Pro) ──
const UPDATE_EVENTS = new Set([
  'subscription.updated',
]);

const HANDLED_EVENTS = new Set([...GRANT_EVENTS, ...REVOKE_EVENTS, ...UPDATE_EVENTS]);

// ── Verify Paddle HMAC-SHA256 Signature ──
async function verifyPaddleSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(';').map((p) => {
      const idx = p.indexOf('=');
      return [p.slice(0, idx), p.slice(idx + 1)] as [string, string];
    })
  );
  const ts = parts['ts'], h1 = parts['h1'];
  if (!ts || !h1) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(PADDLE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`${ts}:${rawBody}`));
  const computedHex = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return computedHex === h1;
}

// ── Extract customer email ──
function extractEmail(event: Record<string, unknown>): string | null {
  try {
    const data = event.data as Record<string, unknown>;
    const customer = data?.customer as Record<string, unknown> | undefined;
    if (customer?.email) return customer.email as string;
    const billingDetails = data?.billing_details as Record<string, unknown> | undefined;
    if (billingDetails?.email) return billingDetails.email as string;
    return null;
  } catch { return null; }
}

// ── Extract subscription ID and plan type from event ──
function extractPlanInfo(event: Record<string, unknown>): { subscriptionId: string | null; planType: string | null } {
  try {
    const data = event.data as Record<string, unknown>;
    const eventType = event.event_type as string;

    // For transaction.completed (lifetime one-time)
    if (eventType === 'transaction.completed') {
      const items = data?.items as Array<Record<string, unknown>> | undefined;
      const priceId = (items?.[0]?.price as Record<string, unknown>)?.id as string | undefined;
      return { subscriptionId: null, planType: priceId ? (PRICE_TO_PLAN[priceId] ?? null) : 'lifetime' };
    }

    // For subscription events
    const subscriptionId = data?.id as string | null ?? null;
    const items = data?.items as Array<Record<string, unknown>> | undefined;
    const priceId = (items?.[0]?.price as Record<string, unknown>)?.id as string | undefined;
    const planType = priceId ? (PRICE_TO_PLAN[priceId] ?? null) : null;
    return { subscriptionId, planType };
  } catch {
    return { subscriptionId: null, planType: null };
  }
}

// ── Find user ID by email via profiles table ──
async function findUserIdByEmail(supabase: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle();
  if (error) { console.error('[webhook] Profile lookup error:', error); return null; }
  return data?.id ?? null;
}

// ── Main Handler ──
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('Paddle-Signature');

  if (!await verifyPaddleSignature(rawBody, signatureHeader)) {
    console.error('[webhook] Invalid signature');
    return new Response('Unauthorized', { status: 401 });
  }

  let event: Record<string, unknown>;
  try { event = JSON.parse(rawBody); }
  catch { return new Response('Bad Request', { status: 400 }); }

  const eventType = event.event_type as string;
  console.log('[webhook] Event:', eventType);

  if (!HANDLED_EVENTS.has(eventType)) {
    console.log('[webhook] Ignored:', eventType);
    return new Response('OK', { status: 200 });
  }

  const email = extractEmail(event);
  if (!email) {
    console.error('[webhook] No email found in event:', eventType);
    return new Response('OK - No email', { status: 200 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const userId = await findUserIdByEmail(supabase, email);
  if (!userId) {
    console.warn('[webhook] User not found for email:', email);
    return new Response('OK - User not found', { status: 200 });
  }

  const { subscriptionId, planType } = extractPlanInfo(event);

  if (GRANT_EVENTS.has(eventType)) {
    // Grant Pro + save plan info
    const { error } = await supabase.from('profiles').update({
      is_premium: true,
      plan_type: planType ?? 'monthly',
      subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (error) { console.error('[webhook] Grant update failed:', error); return new Response('Internal Error', { status: 500 }); }
    console.log(`[webhook] ✅ GRANT Pro (${planType}) → ${email}`);

  } else if (REVOKE_EVENTS.has(eventType)) {
    // Revoke Pro + clear plan info
    const { error } = await supabase.from('profiles').update({
      is_premium: false,
      plan_type: 'free',
      subscription_id: null,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (error) { console.error('[webhook] Revoke update failed:', error); return new Response('Internal Error', { status: 500 }); }
    console.log(`[webhook] ✅ REVOKE Pro → ${email}`);

  } else if (UPDATE_EVENTS.has(eventType)) {
    // Plan changed (monthly ↔ yearly) — update plan_type only, keep is_premium = true
    const { error } = await supabase.from('profiles').update({
      plan_type: planType ?? 'monthly',
      subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (error) { console.error('[webhook] Plan update failed:', error); return new Response('Internal Error', { status: 500 }); }
    console.log(`[webhook] ✅ UPDATE plan to (${planType}) → ${email}`);
  }

  return new Response('OK', { status: 200 });
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PADDLE_API_KEY = Deno.env.get('PADDLE_API_KEY')!;
const PADDLE_API_BASE = 'https://sandbox-api.paddle.com';

// Price ID map
const PRICE_IDS: Record<string, string> = {
  monthly:  'pri_01kxrkpy9smm7aknsyzwfs6fws',
  yearly:   'pri_01kxrkr5p6f3mz1eghb3qn18hv',
  lifetime: 'pri_01kxrks7p2r4g8wee3kmkvx9f3',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // ── Verify Supabase JWT ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response('Unauthorized', { status: 401 });

  // ── Parse target plan from request body ──
  let targetPlan: string;
  try {
    const body = await req.json();
    targetPlan = body.plan;
  } catch { return new Response('Bad Request', { status: 400 }); }

  if (!PRICE_IDS[targetPlan]) return new Response('Invalid plan', { status: 400 });

  // ── Get current subscription from profile ──
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('subscription_id, plan_type').eq('id', user.id).maybeSingle();

  if (!profile?.subscription_id) return new Response('No active subscription to update', { status: 400 });
  if (profile.plan_type === targetPlan) return new Response('Already on this plan', { status: 400 });

  // ── Upgrading to Lifetime: cancel sub + return checkout intent ──
  // Lifetime is a one-time purchase, not a subscription update
  if (targetPlan === 'lifetime') {
    return new Response(JSON.stringify({
      success: true,
      action: 'open_checkout',
      priceId: PRICE_IDS.lifetime,
      message: 'Cancel your subscription first, then complete the lifetime purchase.',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // ── Update subscription via Paddle API (monthly ↔ yearly) ──
  const paddleRes = await fetch(`${PADDLE_API_BASE}/subscriptions/${profile.subscription_id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ price_id: PRICE_IDS[targetPlan], quantity: 1 }],
      proration_billing_mode: 'prorated_immediately',
    }),
  });

  if (!paddleRes.ok) {
    const err = await paddleRes.text();
    console.error('[update-subscription] Paddle API error:', err);
    return new Response('Failed to update subscription', { status: 500 });
  }

  console.log(`[update-subscription] ✅ Updated sub to ${targetPlan} for user ${user.id}`);
  // Webhook subscription.updated will fire and update plan_type in DB
  return new Response(JSON.stringify({ success: true, message: `Plan updated to ${targetPlan}` }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
});

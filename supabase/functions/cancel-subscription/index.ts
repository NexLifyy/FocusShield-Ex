import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PADDLE_API_KEY = Deno.env.get('PADDLE_API_KEY')!;
const PADDLE_API_BASE = 'https://sandbox-api.paddle.com';

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

  // ── Get subscription_id + plan_type from profile ──
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles').select('subscription_id, plan_type').eq('id', user.id).maybeSingle();

  if (profileError || !profile) return new Response('Profile not found', { status: 404 });
  if (!profile.subscription_id) return new Response('No active subscription', { status: 400 });
  if (profile.plan_type === 'lifetime') return new Response('Lifetime plan cannot be canceled', { status: 400 });

  // ── Call Paddle API to cancel the subscription ──
  const paddleRes = await fetch(`${PADDLE_API_BASE}/subscriptions/${profile.subscription_id}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ effective_from: 'next_billing_period' }), // cancels at end of period
  });

  if (!paddleRes.ok) {
    const err = await paddleRes.text();
    console.error('[cancel-subscription] Paddle API error:', err);
    return new Response('Failed to cancel subscription', { status: 500 });
  }

  console.log(`[cancel-subscription] ✅ Canceled sub ${profile.subscription_id} for user ${user.id}`);
  // Note: is_premium is set to false when webhook fires subscription.canceled
  return new Response(JSON.stringify({ success: true, message: 'Subscription canceled. Access continues until end of billing period.' }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
});

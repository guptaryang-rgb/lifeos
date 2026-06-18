import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Price ID for the Premium subscription (set in Stripe Dashboard)
const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_monthly';

// Lazy Stripe initialization to avoid crash when key is not set
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const Stripe = require('stripe').default;
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

export async function POST(request: NextRequest) {
  try {
    const email = await getAuthenticatedUser();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripe();
    if (!stripe) {
      // Demo mode — Stripe not configured
      return NextResponse.json({ 
        url: null,
        demo: true,
        message: 'Stripe is not configured. Premium activated in demo mode.' 
      });
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({ where: { email } });
    let customerId = user?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { lifeos_user: 'true' },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { email },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: PREMIUM_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?upgraded=true`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}?cancelled=true`,
      metadata: { email },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

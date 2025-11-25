// Server-side Stripe instance - DO NOT import this in client components!
// For client-side Stripe config, import from '@/lib/stripe-config'

import Stripe from 'stripe';
import { STRIPE_CONFIG } from './stripe-config';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
});

// Re-export config for convenience in server-side code
export { STRIPE_CONFIG };

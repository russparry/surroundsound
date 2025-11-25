import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
});

// Stripe configuration
export const STRIPE_CONFIG = {
  PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '',
  PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  MONTHLY_PRICE: 4.99,
};

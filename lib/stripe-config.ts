// Client-side Stripe configuration
// This file is safe to import in client components

export const STRIPE_CONFIG = {
  PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '',
  PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  MONTHLY_PRICE: 4.99,
};

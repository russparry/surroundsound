# Supabase Database Setup Guide

This guide will help you set up the Supabase database for SyncSound.

## Prerequisites

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon (public) key from the project settings

## Database Schema

Run the following SQL in your Supabase SQL Editor (available in the Supabase dashboard):

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  birthday DATE NOT NULL,
  has_active_subscription BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on email for faster lookups
CREATE INDEX users_email_idx ON users(email);

-- Create index on stripe_customer_id for faster lookups
CREATE INDEX users_stripe_customer_id_idx ON users(stripe_customer_id);
```

## Verification

After running the SQL above, verify the setup:

1. Go to the "Table Editor" in Supabase dashboard
2. You should see a `users` table with the following columns:
   - `id` (uuid)
   - `email` (text)
   - `full_name` (text)
   - `birthday` (date)
   - `has_active_subscription` (boolean)
   - `stripe_customer_id` (text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

## Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing

1. Try registering a new user through the app
2. Check the Supabase "Table Editor" to see if the user was created
3. The user should appear in both:
   - `auth.users` table (managed by Supabase Auth)
   - `users` table (your custom profile table)

## Stripe Integration (Optional for Testing)

The `stripe_customer_id` field will be automatically populated when a user subscribes through Stripe. The `has_active_subscription` field will be updated via Stripe webhooks (to be implemented).

For now, you can manually set `has_active_subscription` to `true` in the Supabase Table Editor to test the subscription flow without actually processing payments.

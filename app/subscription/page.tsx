'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { STRIPE_CONFIG } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
    }

    // Show success message if payment was successful
    if (searchParams.get('success') === 'true') {
      setSuccessMessage('Payment successful! Your subscription is now active.');
      refreshUserProfile();
    }

    // Show error if payment was canceled
    if (searchParams.get('canceled') === 'true') {
      setError('Payment was canceled. Please try again.');
    }
  }, [user, authLoading, searchParams, router, refreshUserProfile]);

  const handleSubscribe = async () => {
    if (!user || !userProfile) return;

    setLoading(true);
    setError('');

    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: userProfile.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout using the URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleContinueToApp = () => {
    router.push('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  // If user already has active subscription
  if (userProfile.has_active_subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-500 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">You're All Set!</h1>
            <p className="text-gray-600">Welcome, {userProfile.full_name}!</p>
            <p className="text-gray-500 text-sm mt-2">
              You have an active subscription. Enjoy SyncSound!
            </p>
          </div>

          <button
            onClick={handleContinueToApp}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200"
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">SyncSound Premium</h1>
          <p className="text-gray-600">Subscribe to unlock all features</p>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-purple-700 mb-2">
              ${STRIPE_CONFIG.MONTHLY_PRICE}
              <span className="text-2xl text-purple-600">/month</span>
            </div>
            <p className="text-purple-600 text-sm">Billed monthly, cancel anytime</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-green-600 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-gray-700">Unlimited room creation</span>
          </div>
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-green-600 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-gray-700">Sync music across all your devices</span>
          </div>
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-green-600 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-gray-700">Invite unlimited guests</span>
          </div>
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-green-600 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-gray-700">Premium support</span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm font-medium mb-2">Test Mode</p>
          <p className="text-yellow-700 text-xs">
            Use test card: 4242 4242 4242 4242
            <br />
            Expiry: Any future date (e.g., 12/25)
            <br />
            CVC: Any 3 digits (e.g., 123)
            <br />
            ZIP: Any 5 digits (e.g., 12345)
          </p>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {loading ? 'Loading...' : 'Subscribe Now'}
        </button>

        <button
          onClick={handleContinueToApp}
          className="w-full text-gray-600 hover:text-gray-700 font-medium py-2"
        >
          Continue without subscription
        </button>
      </div>
    </div>
  );
}

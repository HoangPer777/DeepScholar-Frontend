'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Network, ArrowRight } from 'lucide-react';
import { authService } from '../../services/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await authService.forgotPassword(email);
      setStatus('success');
      setMessage(res.detail || 'If an account with this email exists, a reset link has been sent.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to request password reset.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-8 border border-gray-100">
        <div className="text-center">
          <Link href={'/' as Route} className="inline-flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700">
            <Network className="w-6 h-6" />
            <span className="font-bold text-xl">SciAI</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Forgot Password</h2>
          <p className="text-gray-600 mt-2">Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        {status === 'success' ? (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm text-center">
            {message}
            <div className="mt-4">
              <Link href={'/login' as Route} className="text-blue-600 font-medium hover:underline">
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'error' && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {message}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter your email"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center text-sm">
              <Link href={'/login' as Route} className="text-gray-500 hover:text-gray-900">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

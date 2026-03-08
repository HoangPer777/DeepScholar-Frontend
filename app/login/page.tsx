'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
// @ts-ignore
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
// @ts-ignore
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import { authService } from '../../services/auth';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await authService.login({ email: formData.email, password: formData.password });
      router.push('/' as Route); // Redirect to home/dashboard
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      try {
        await authService.googleLogin(credentialResponse.credential);
        router.push('/' as Route);
      } catch (err: any) {
        setError(err.message || 'Google login failed.');
      }
    }
  };

  const handleFacebookSuccess = async (response: any) => {
    if (response.accessToken) {
      try {
        await authService.facebookLogin(response.accessToken);
        router.push('/' as Route);
      } catch (err: any) {
        setError(err.message || 'Facebook login failed.');
      }
    } else {
      setError('Facebook login cancelled or failed.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Left Side - Quote Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white rounded-full relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            <span className="text-white text-2xl font-bold">Scientific Platform</span>
          </div>
          <div className="mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full inline-flex items-center gap-2 text-white text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Multi-Agent AI Integration Active
          </div>
        </div>

        {/* Quote */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-white leading-tight">
              Science is not a body of knowledge, but a way of thinking.
            </h1>
            <p className="text-xl text-white/80 italic">— Carl Sagan</p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-white/60 text-sm">
          © 2024 Scientific Platform. Advancing human understanding.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 border-3 border-white rounded-full relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Scientific Platform
              </span>
            </div>
          </div>

          {/* Form Header */}
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-600">Please enter your credentials to access your lab.</p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email or Username
              </label>
              <input
                id="email"
                type="text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="Enter your email or username"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                href={'/forgot-password' as Route}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 group"
            >
              Log in
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4 h-[44px]">
            <div className="flex items-center justify-center rounded-lg overflow-hidden">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setError('Google Login Failed');
                }}
                useOneTap
                theme="outline"
                shape="rectangular"
                text="signin_with"
                size="large"
                width="100%"
              />
            </div>

            <FacebookLogin
              appId={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "1234567890-mockappid"}
              fields="name,email,picture"
              scope="public_profile,email"
              callback={handleFacebookSuccess}
              render={(renderProps: any) => (
                <button
                  type="button"
                  onClick={renderProps.onClick}
                  className="flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Facebook</span>
                </button>
              )}
            />
          </div>

          {/* Sign Up Link */}
          <div className="text-center text-sm text-gray-600">
            New to the platform?{' '}
            <Link href={'/signup' as Route} className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
              Sign up for free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

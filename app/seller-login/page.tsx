'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Corrected path (2 levels up)
import { useAuth } from '../context/AuthContext'; // Corrected path (1 level up)
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SellerLoginPage() {
  const router = useRouter();
  const { user, login, mounted } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in as a seller, redirect directly to dashboard
  useEffect(() => {
    if (mounted && user && user.role === 'SELLER') {
      router.push(`/seller/add-product?brand=${encodeURIComponent(user.brandName || '')}`);
    }
  }, [user, mounted, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      alert('Please fill out all fields.');
      setLoading(false);
      return;
    }

    try {
      // Authenticate against the "brands" table
      const { data: brandUser, error } = await supabase
        .from('brands')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle();

      if (error) throw error;

      if (!brandUser) {
        alert('Invalid email or password. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Log in as SELLER
      login({
        email: brandUser.email,
        role: 'SELLER',
        brandName: brandUser.brand_name,
        firstName: brandUser.first_name,
        lastName: brandUser.last_name,
      });

      alert(`Welcome back, ${brandUser.brand_name}!`);
      router.push(`/seller/add-product?brand=${encodeURIComponent(brandUser.brand_name)}`);
    } catch (err: any) {
      console.error('Seller login failed:', err);
      alert('Login error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading portal...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center items-center px-6">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-gray-200 shadow-lg text-center">
        
        {/* Logo */}
        <Link href="/" className="font-serif text-sm tracking-[0.25em] font-black text-gray-400 block mb-6 hover:opacity-85 transition">
          OAKLAHOME
        </Link>

        <h1 className="text-2xl font-serif font-semibold text-gray-950 tracking-tight mb-2">
          Sign in to your brand portal
        </h1>
        <p className="text-sm text-gray-500 mb-8">Fulfill bulk orders and manage your wholesale catalog.</p>

        <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Business Email address</label>
            <input
              type="email"
              placeholder="e.g., brand@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition duration-150 shadow"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wider">
          <p>
            New brand?{' '}
            <Link href="/seller-onboarding" className="text-blue-600 hover:underline">
              Apply to sell
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}
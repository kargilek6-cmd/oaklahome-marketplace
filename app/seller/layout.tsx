'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, mounted } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Skip authentication checks on the onboarding pages so new sellers can sign up
  const isOnboarding = pathname.includes('/seller/onboarding');

  useEffect(() => {
    if (mounted && !user && !isOnboarding) {
      // If an unlogged user tries to access `/seller` pages, redirect them to onboarding/signup
      router.push('/seller/onboarding');
    }
  }, [user, mounted, isOnboarding, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading portal...</p>
      </div>
    );
  }

  // If on the onboarding page, render without the sidebar
  if (isOnboarding) {
    return <>{children}</>;
  }

  // If not logged in yet, render a loading screen during redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Redirecting to portal...</p>
      </div>
    );
  }

  // Faire-style sidebar links
  const menuItems = [
    { name: 'Products Catalog', href: `/seller/add-product?brand=${encodeURIComponent(user.brandName || '')}`, icon: '📦' },
    { name: 'Add Product', href: `/seller/add-product/new?brand=${encodeURIComponent(user.brandName || '')}`, icon: '➕' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* FIXED LEFT SIDEBAR (FAIRE STYLE) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between fixed top-0 bottom-0 left-0 z-30 p-6">
        <div className="space-y-8">
          {/* Logo */}
          <Link href="/" className="font-serif text-lg tracking-[0.25em] font-black text-gray-950 block hover:opacity-80 transition">
            OAKLAHOME
          </Link>

          {/* Seller profile card */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Logged in as</p>
            <p className="font-black text-gray-800 text-sm truncate mt-0.5">{user.brandName}</p>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href.split('?')[0];
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold transition duration-150 ${
                    isActive 
                      ? 'bg-gray-950 text-white shadow' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout button at the bottom */}
        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition duration-150 text-left"
        >
          <span className="text-base">🚪</span>
          <span>Logout</span>
        </button>
      </aside>

      {/* MAIN CONTENT WORKSPACE (Padded to clear the fixed sidebar) */}
      <div className="flex-1 pl-64 min-h-screen">
        {children}
      </div>

    </div>
  );
}
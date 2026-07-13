'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, mounted } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || ''; // Fallback to empty string if null during initial SSR

  // Skip authentication checks on onboarding and login pages
  const isOnboarding = pathname.includes('/seller-onboarding');
  const isLogin = pathname.includes('/seller-login');

  // STRICT ROLE CHECK: Only users with the "SELLER" role can access the portal dashboard
  const isSeller = user && user.role === 'SELLER';

  useEffect(() => {
    if (mounted && !isSeller && !isOnboarding && !isLogin) {
      // CORRECTED: Redirects unauthenticated portal attempts to the Brand Login page (/seller-login)!
      router.push('/seller-login');
    }
  }, [user, isSeller, mounted, isOnboarding, isLogin, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading portal...</p>
      </div>
    );
  }

  // If on onboarding or login pages, render cleanly without the sidebar (ignores buyer session conflicts)
  if (isOnboarding || isLogin) {
    return <>{children}</>;
  }

  // If not logged in as a Seller, show redirecting state
  if (!isSeller) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Redirecting to login...</p>
      </div>
    );
  }

  // Sidebar links
  const menuItems = [
    { name: 'Products Catalog', href: `/seller/add-product?brand=${encodeURIComponent(user.brandName || '')}`, icon: '📦' },
    { name: 'Add Product', href: `/seller/add-product/new?brand=${encodeURIComponent(user.brandName || '')}`, icon: '➕' },
    { name: 'Incoming Orders', href: `/seller/orders?brand=${encodeURIComponent(user.brandName || '')}`, icon: '📋' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* FIXED LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between fixed top-0 bottom-0 left-0 z-30 p-6">
        <div className="space-y-8">
          {/* Logo */}
          <Link href="/" className="font-serif text-lg tracking-[0.25em] font-black text-gray-950 block hover:opacity-85 transition">
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

        {/* Logout button */}
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

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 pl-64 min-h-screen">
        {children}
      </div>

    </div>
  );
}
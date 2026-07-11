'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCart } from './context/CartContext';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // State to track search input
  const { cart, addToCart } = useCart();

  // Calculate the total number of items in the cart
  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*');

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // DYNAMIC SEARCH: Filter products by title OR brand name in real-time as the user types
  const filteredProducts = products.filter((product) => {
    const titleMatch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const brandMatch = product.brand_name
      ? product.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
      : false;
    return titleMatch || brandMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading marketplace...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* MINIMAL FAIRE-STYLE HEADER */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* 1. LOGO (Left) */}
          <Link href="/" className="font-serif text-lg tracking-[0.25em] font-black text-gray-900 hover:opacity-85 transition">
            OAKLAHOME
          </Link>

          {/* 2. MINIMAL ROUNDED SEARCH BAR (Middle) */}
          <div className="flex-grow max-w-xl mx-8 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              {/* Magnifying Glass SVG Icon */}
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search wholesale products or brands"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 hover:border-gray-300 rounded-full py-2.5 pl-11 pr-4 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-0 bg-gray-50/50 transition duration-150"
            />
          </div>

          {/* 3. NAVIGATION LINKS (Right) */}
          <div className="flex items-center space-x-6 text-sm font-semibold text-gray-700">
            {/* LINK CORRECTLY POINTING TO ONBOARDING FLOW */}
            <Link 
              href="/seller/onboarding" 
              className="hover:text-gray-900 transition"
            >
              Sign up to sell
            </Link>
            
            <button 
              onClick={() => alert("Sign In coming in a future step!")}
              className="hover:text-gray-900 transition"
            >
              Sign in
            </button>

            <button 
              onClick={() => alert("Sign Up to buy coming in a future step!")}
              className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-2.5 rounded-md transition duration-150"
            >
              Sign up to buy
            </button>

            {/* FLOATING CART ICON (Visible only if cart has items) */}
            {totalCartItems > 0 && (
              <Link 
                href="/cart" 
                className="bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition flex items-center space-x-2"
              >
                <span>🛒 Cart</span>
                <span className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs font-black">
                  {totalCartItems}
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* PRODUCT GRID SECTION */}
      <div className="max-w-7xl mx-auto py-12 px-6">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div>
                  {product.image_url && (
                    <div className="relative w-full h-56 bg-gray-50">
                      <img 
                        src={product.image_url} 
                        alt={product.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    {/* 1. PRICE & MSRP */}
                    <div className="flex items-baseline space-x-2">
                      <span className="text-lg font-black text-gray-950">
                        ₹{product.price ? product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </span>
                      <span className="text-xs text-gray-400 line-through">
                        MSRP ₹{(product.price * 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* 2. PRODUCT TITLE */}
                    <h3 className="text-base font-semibold text-gray-800 mt-2 line-clamp-2">
                      {product.title}
                    </h3>

                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  {/* 3. BRAND & MINIMUM ORDER */}
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                    <div>
                      {product.brand_name && (
                        <Link 
                          href={`/brand/${encodeURIComponent(product.brand_name)}`}
                          className="block text-sm font-bold text-gray-950 hover:underline hover:text-blue-600 transition"
                        >
                          {product.brand_name}
                        </Link>
                      )}
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        ₹{product.min_order_amount ? product.min_order_amount.toLocaleString('en-IN') : '0'} min
                      </p>
                    </div>
                    
                    {/* ADD TO CART BUTTON */}
                    <button
                      onClick={() => {
                        addToCart(product);
                        alert(`Added "${product.title}" to cart!`);
                      }}
                      className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition duration-150 active:scale-95"
                    >
                      + Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-xl p-12 text-center max-w-md mx-auto">
            <p className="text-gray-500 text-lg font-medium">No results found</p>
            <p className="text-gray-400 text-sm mt-1">We couldn't find any products matching "{searchQuery}".</p>
          </div>
        )}
      </div>
    </main>
  );
}
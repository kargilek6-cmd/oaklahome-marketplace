'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCart } from './context/CartContext';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading marketplace...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      {/* NAVIGATION HEADER */}
      <header className="max-w-6xl mx-auto mb-12 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-950 tracking-tight">
            Oaklahome Marketplace
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Wholesale B2B connection for local retailers.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link 
            href="/seller/add-product" 
            className="text-sm font-bold text-gray-600 hover:text-gray-900 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition"
          >
            Add Product
          </Link>
          
          {/* CART LINK BUTTON (WITH LIVE COUNTER) */}
          <Link 
            href="/cart" 
            className="bg-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 transition flex items-center space-x-2"
          >
            <span>🛒 View Cart</span>
            {totalCartItems > 0 && (
              <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-black">
                {totalCartItems}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div>
                  {product.image_url && (
                    <div className="relative w-full h-56">
                      <img 
                        src={product.image_url} 
                        alt={product.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    {/* PRICE & MSRP */}
                    <div className="flex items-baseline space-x-2">
                      <span className="text-lg font-black text-gray-950">
                        ₹{product.price ? product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </span>
                      <span className="text-xs text-gray-400 line-through">
                        MSRP ₹{(product.price * 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* PRODUCT TITLE */}
                    <h3 className="text-base font-semibold text-gray-800 mt-2 line-clamp-2">
                      {product.title}
                    </h3>

                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  {/* BRAND & MINIMUM ORDER */}
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
                      className="bg-gray-900 hover:bg-gray-1000 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition duration-150 active:scale-95"
                    >
                      + Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
            <p className="text-gray-500 text-lg">No products found in your database.</p>
            <p className="text-gray-400 text-sm mt-1">Add a row in your Supabase table to see it here!</p>
          </div>
        )}
      </div>
    </main>
  );
}
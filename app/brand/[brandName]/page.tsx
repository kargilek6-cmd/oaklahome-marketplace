'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Link from 'next/link';

export default function BrandPage() {
  const { brandName } = useParams();
  const decodedBrandName = brandName ? decodeURIComponent(brandName as string) : '';

  const { user, mounted } = useAuth();
  const { addToCart } = useCart();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBrandProducts() {
      if (!decodedBrandName) return;
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('brand_name', decodedBrandName);

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching brand products:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBrandProducts();
  }, [decodedBrandName]);

  const isUserLoggedIn = user !== null;

  if (!mounted || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-400 font-medium">Loading brand profile...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-center text-left">
        <div>
          <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
            ← Back to Marketplace
          </Link>
          <h1 className="text-4xl font-black text-gray-950 tracking-tight mt-4">
            {decodedBrandName} Storefront
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Browse all wholesale products available from {decodedBrandName}.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between animate-in fade-in"
              >
                <div>
                  {/* Image now links to the Product Page */}
                  {product.image_url && (
                    <Link href={`/product/${product.id}`} className="relative block w-full h-56 bg-gray-50 cursor-pointer">
                      <img 
                        src={product.image_url} 
                        alt={product.title} 
                        className="w-full h-full object-cover"
                      />
                    </Link>
                  )}
                  <div className="p-5 text-left">
                    {isUserLoggedIn ? (
                      <>
                        {/* Title now links to the Product Page */}
                        <Link href={`/product/${product.id}`} className="block text-xl font-bold text-gray-900 hover:underline hover:text-blue-600 transition">
                          {product.title}
                        </Link>
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                          {product.description}
                        </p>
                        
                        {/* Pricing Info */}
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                              Wholesale Price
                            </p>
                            <p className="text-2xl font-black text-gray-950">
                              ₹{product.price ? product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                              Brand Min. Order
                            </p>
                            <p className="text-base font-bold text-gray-700">
                              ₹{product.min_order_amount ? product.min_order_amount.toLocaleString('en-IN') : '0'} min
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline mb-3">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">
                            Pricing Protected 🔒
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-400 blur-[2px] select-none">{product.title}</h3>
                        <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                          {product.description}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0">
                  {isUserLoggedIn ? (
                    <button
                      onClick={() => {
                        addToCart(product);
                        alert(`Added "${product.title}" to cart!`);
                      }}
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs py-3 rounded-lg transition duration-150 cursor-pointer"
                    >
                      + Add to Cart
                    </button>
                  ) : (
                    <Link
                      href="/"
                      className="block text-center w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs py-3 rounded-lg transition duration-150"
                    >
                      Login to view pricing
                    </Link>
                  )}
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
            <p className="text-gray-500 text-lg">No products found for this brand.</p>
          </div>
        )}
      </div>
    </main>
  );
}
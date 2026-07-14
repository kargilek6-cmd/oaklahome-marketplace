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

  const [brandProfile, setBrandProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'about'>('products');
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  useEffect(() => {
    async function fetchBrandData() {
      if (!decodedBrandName) return;
      try {
        // 1. Fetch brand profile story details
        const { data: bData } = await supabase
          .from('brands')
          .select('*')
          .eq('brand_name', decodedBrandName)
          .maybeSingle();

        setBrandProfile(bData);

        // 2. Fetch brand catalog products
        const { data: pData, error: pError } = await supabase
          .from('products')
          .select('*')
          .eq('brand_name', decodedBrandName);

        if (pError) throw pError;
        setProducts(pData || []);
      } catch (err) {
        console.error('Error fetching brand data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBrandData();
  }, [decodedBrandName]);

  const isUserLoggedIn = user !== null;

  // Filter products locally based on search input
  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(localSearchQuery.toLowerCase())
  );

  const brandMin = products.length > 0 ? products[0].min_order_amount : 0;

  if (!mounted || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-400 font-medium">Loading storefront...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      
      {/* 1. FAIRE-STYLE COVER BANNER */}
      <div className="w-full h-64 bg-gray-150 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
        {brandProfile?.cover_photo_url ? (
          <img src={brandProfile.cover_photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-gray-300">
            <span className="text-4xl">🖼️</span>
            <p className="text-xs font-bold uppercase tracking-wider mt-1">Store banner photo</p>
          </div>
        )}
        <div className="absolute top-6 left-6 z-20">
          <Link href="/" className="bg-white/95 hover:bg-white text-gray-900 font-bold text-xs px-4 py-2.5 rounded-full shadow-md transition flex items-center space-x-1">
            <span>←</span> <span>Back to Market</span>
          </Link>
        </div>
      </div>

      {/* 2. OVERLAPPING PROFILE SECTION */}
      <div className="max-w-7xl mx-auto px-6 relative pb-12">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between -mt-12 gap-6">
          <div className="flex items-end space-x-6 text-left">
            {/* Overlapping Circle Logo */}
            <div className="w-24 h-24 bg-white border-4 border-white rounded-full overflow-hidden shadow-md flex items-center justify-center flex-shrink-0 z-10">
              {brandProfile?.profile_photo_url ? (
                <img src={brandProfile.profile_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-gray-300">👤</span>
              )}
            </div>
            <div className="pb-2">
              <h1 className="text-3xl font-black text-gray-950 tracking-tight">
                {decodedBrandName}
              </h1>
              <p className="text-sm text-gray-400 font-semibold mt-0.5">
                India • 4.8 ★ (12 brand reviews)
              </p>
              <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-wider bg-gray-50 border border-gray-150 rounded px-2.5 py-1 inline-block">
                ₹{brandMin?.toLocaleString('en-IN')} Minimum Order
              </p>
            </div>
          </div>

          {/* Social CTAs */}
          <div className="flex space-x-3 pb-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none border border-gray-200 hover:bg-gray-50 font-bold text-xs px-5 py-3 rounded-xl transition cursor-not-allowed">
              💬 Message brand
            </button>
            <button className="flex-1 md:flex-none bg-gray-950 hover:bg-gray-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow">
              Follow Brand
            </button>
          </div>
        </div>

        {/* 3. OAKLAHOME MARKET EVENT ALERT BANNER (Matches Faire Promo Strip) */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 mt-10 text-left flex justify-between items-center text-sm font-semibold text-amber-800">
          <div className="flex items-center space-x-2">
            <span>✨</span>
            <p><strong>{decodedBrandName}</strong> is participating in Oaklahome Markets. Free delivery on orders over ₹15,000.</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-white border border-amber-100 px-3 py-1.5 rounded-full cursor-pointer hover:bg-amber-50 transition">
            + Add to List
          </span>
        </div>

        {/* 4. TABS BAR & SEARCH INNER STOREFRONT */}
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-100 mt-12 mb-8 text-sm font-bold text-gray-400 gap-4">
          <div className="flex space-x-8 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('products')}
              className={`pb-4 border-b-2 transition cursor-pointer ${
                activeTab === 'products' ? 'border-gray-950 text-gray-950 font-black' : 'border-transparent hover:text-gray-600'
              }`}
            >
              All products ({products.length})
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={`pb-4 border-b-2 transition cursor-pointer ${
                activeTab === 'about' ? 'border-gray-950 text-gray-950 font-black' : 'border-transparent hover:text-gray-600'
              }`}
            >
              About Brand
            </button>
          </div>

          {/* Inner Store Search Field */}
          {activeTab === 'products' && (
            <div className="relative w-full md:w-64 mb-3 md:mb-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">🔍</span>
              <input
                type="text"
                placeholder={`Search ${decodedBrandName}...`}
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="w-full border border-gray-200 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-gray-400 font-medium"
              />
            </div>
          )}
        </div>

        {/* 5. TAB VIEW INNER PANELS */}
        <div className="mt-8 text-left">
          {activeTab === 'products' ? (
            /* Products Grid Panel */
            filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Image links to the Product Details Page PDP! */}
                      {product.image_url && (
                        <Link href={`/product/${product.id}`} className="relative block w-full h-56 bg-gray-50 cursor-pointer">
                          <img 
                            src={product.image_url} 
                            alt={product.title} 
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      )}
                      <div className="p-5">
                        {isUserLoggedIn ? (
                          <>
                            {/* Title links to the Product Details Page PDP! */}
                            <Link href={`/product/${product.id}`} className="block text-xl font-bold text-gray-950 hover:underline">
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
              <div className="py-20 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 p-8 max-w-md mx-auto">
                <p className="text-gray-500 font-bold text-lg">No products found</p>
                <p className="text-gray-400 text-sm mt-1">No products match your inner search query.</p>
              </div>
            )
          ) : (
            /* About Brand Story Panel */
            <div className="max-w-3xl space-y-8 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wider">Our Story</h3>
                <p className="text-sm text-gray-600 leading-relaxed mt-4 whitespace-pre-wrap">
                  {brandProfile?.brand_story || 'This brand is setting up their story profile. Read back soon!'}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wider">Brand Values</h3>
                <p className="text-sm text-gray-600 mt-4 font-semibold">
                  🌿 {brandProfile?.brand_values || 'Organic, Handmade, Sustainably sourced.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100 text-sm font-semibold text-gray-800">
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Year Established</p>
                  <p className="mt-1">{brandProfile?.established_year || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Primary category</p>
                  <p className="mt-1">{brandProfile?.category || 'General Wholesale'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
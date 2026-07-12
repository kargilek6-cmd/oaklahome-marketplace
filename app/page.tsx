'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext'; // Import our auth hook
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]); // New state for onboarding brands
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // Track active category filter
  
  const { cart, addToCart } = useCart();
  const { user, login, logout } = useAuth();

  // AUTH MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Calculate the total number of items in the cart
  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    async function fetchMarketplaceData() {
      try {
        // 1. Fetch products from Supabase
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('*');
        if (prodError) throw prodError;
        setProducts(prodData || []);

        // 2. Fetch onboarded brands from Supabase
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('*');
        if (brandError) throw brandError;
        setBrands(brandData || []);

      } catch (error) {
        console.error('Error fetching marketplace data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMarketplaceData();
  }, []);

  // Handle Authentication (Sign In & Sign Up to Buy)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    if (!authEmail || !authPassword || (modalType === 'signup' && !authPhone)) {
      alert('Please fill out all required fields.');
      setAuthLoading(false);
      return;
    }

    try {
      if (modalType === 'signup') {
        // ================= BUYER SIGN UP =================
        const { data: existingBuyer } = await supabase
          .from('buyers')
          .select('*')
          .eq('email', authEmail)
          .maybeSingle();

        if (existingBuyer) {
          alert('An account with this email already exists. Please sign in.');
          setModalType('signin');
          setAuthLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.from('buyers').insert([
          {
            email: authEmail,
            phone: authPhone,
            password: authPassword,
          },
        ]);

        if (signUpError) throw signUpError;

        login({
          email: authEmail,
          role: 'BUYER',
        });

        alert('Account created successfully! Welcome to Oaklahome.');
        setIsModalOpen(false);
      } else {
        // ================= UNIFIED SIGN IN =================
        const { data: buyerUser } = await supabase
          .from('buyers')
          .select('*')
          .eq('email', authEmail)
          .eq('password', authPassword)
          .maybeSingle();

        if (buyerUser) {
          login({
            email: buyerUser.email,
            role: 'BUYER',
          });
          setIsModalOpen(false);
          alert('Logged in as Retailer!');
          setAuthLoading(false);
          return;
        }

        const { data: brandUser } = await supabase
          .from('brands')
          .select('*')
          .eq('email', authEmail)
          .eq('password', authPassword)
          .maybeSingle();

        if (brandUser) {
          login({
            email: brandUser.email,
            role: 'SELLER',
            brandName: brandUser.brand_name,
            firstName: brandUser.first_name,
            lastName: brandUser.last_name,
          });
          setIsModalOpen(false);
          alert(`Welcome back, ${brandUser.brand_name}!`);
          setAuthLoading(false);
          return;
        }

        alert('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      console.error('Authentication failed:', err);
      alert('Authentication error: ' + err.message);
    } finally {
      setAuthLoading(false);
      setAuthEmail('');
      setAuthPhone('');
      setAuthPassword('');
    }
  };

  const openAuthModal = (type: 'signin' | 'signup') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  // Filter brands by the active category capsule
  const filteredBrands = brands.filter((brand) => {
    const brandCategory = brand.category || 'Home decor';
    return selectedCategory === 'all' || brandCategory.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Filter products by search query
  const searchedProducts = products.filter((product) => {
    const titleMatch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const brandMatch = product.brand_name
      ? product.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
      : false;
    return titleMatch || brandMatch;
  });

  const categories = [
    'All', 'Home decor', 'Apparel', 'Accessories', 'Footwear', 
    'Beauty & wellness', 'Food & drink', 'Paper & novelty', 
    'Pets', 'Jewelry', 'Something else'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading marketplace...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      
      {/* MINIMAL HEADER */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="font-serif text-lg tracking-[0.25em] font-black text-gray-900 hover:opacity-85 transition">
            OAKLAHOME
          </Link>

          {/* Search bar */}
          <div className="flex-grow max-w-xl mx-8 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
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

          {/* Navigation Links */}
          <div className="flex items-center space-x-6 text-sm font-semibold text-gray-700">
            {user ? (
              <>
                {user.role === 'SELLER' ? (
                  <>
                    <span className="text-gray-400 font-medium">
                      Welcome, <strong className="text-gray-950">{user.brandName}</strong>
                    </span>
                    <Link 
                      href={`/seller/add-product?brand=${encodeURIComponent(user.brandName || '')}`}
                      className="bg-gray-950 hover:bg-gray-800 text-white font-bold px-4 py-2.5 rounded-md transition duration-150 shadow"
                    >
                      Go to Portal 📦
                    </Link>
                  </>
                ) : (
                  <>
                    <span className="text-gray-400 font-medium">
                      Retailer: <strong className="text-gray-950">{user.email.split('@')[0]}</strong>
                    </span>
                    <button 
                      onClick={logout}
                      className="text-red-500 hover:text-red-700 hover:underline transition"
                    >
                      Sign out
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <Link 
                  href="/seller/onboarding" 
                  className="hover:text-gray-900 transition"
                >
                  Sign up to sell
                </Link>
                
                <button 
                  onClick={() => openAuthModal('signin')}
                  className="hover:text-gray-900 transition"
                >
                  Sign in
                </button>

                <button 
                  onClick={() => openAuthModal('signup')}
                  className="bg-gray-950 hover:bg-gray-800 text-white font-bold px-4 py-2.5 rounded-md transition duration-150"
                >
                  Sign up to buy
                </button>
              </>
            )}

            {/* Floating Cart Icon */}
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

      {/* HERO VIDEO BANNER */}
      <div 
        className="relative w-full h-[550px] bg-cover bg-center overflow-hidden flex items-center"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&auto=format&fit=crop&q=80')",
          backgroundColor: '#0a0a0a'
        }}
      >
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-85">
          <source src="https://player.vimeo.com/external/661631215.hd.mp4?s=aae0f79bd28f0b6dd91e7f236f72d6f548bcb47f&profile_id=175" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/50 to-transparent z-10" />

        <div className="absolute inset-0 z-20 flex items-center px-12 md:px-24 max-w-7xl mx-auto w-full">
          <div className="max-w-4xl text-white space-y-6">
            <h2 
              className="text-5xl md:text-6xl font-light leading-none tracking-tight text-white"
              style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
            >
              Find your next bestseller
            </h2>
            <p className="text-base md:text-lg text-neutral-200 tracking-wide font-light leading-relaxed">
              Sign up to unlock wholesale pricing with over 100 curated brands.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-4">
              <button 
                onClick={() => openAuthModal('signup')}
                className="bg-white hover:bg-neutral-100 text-gray-950 font-bold px-8 py-3.5 rounded text-xs uppercase tracking-widest transition duration-150 shadow-lg"
              >
                Sign up to buy
              </button>
              <div className="text-xs font-semibold text-neutral-300 uppercase tracking-widest">
                Are you a brand?{' '}
                <Link href="/seller/onboarding" className="text-white underline hover:text-neutral-100 transition font-bold">
                  Sign up to sell
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 1: THE "FEATURED BRANDS" SECTION ================= */}
      <section className="max-w-7xl mx-auto py-16 px-6">
        <h2 
          className="text-3xl font-light text-gray-950 mb-8"
          style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
        >
          Featured brands
        </h2>

        {/* HORIZONTAL CAPSULES */}
        <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-none">
          {categories.map((catName) => {
            const isActive = selectedCategory.toLowerCase() === catName.toLowerCase();
            return (
              <button
                key={catName}
                onClick={() => setSelectedCategory(catName)}
                className={`px-5 py-2.5 border rounded-full text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer flex-shrink-0 ${
                  isActive 
                    ? 'bg-gray-950 border-gray-950 text-white shadow-sm hover:bg-gray-800' 
                    : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700 bg-white'
                }`}
              >
                {catName}
              </button>
            );
          })}
        </div>

        {/* BRANDS LIST */}
        <div className="mt-12">
          {filteredBrands.length > 0 ? (
            <div className="space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {filteredBrands.map((brand) => (
                  <div key={brand.id} className="group overflow-hidden">
                    <Link href={`/brand/${encodeURIComponent(brand.brand_name)}`} className="block w-full h-64 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative shadow-sm hover:shadow-md transition">
                      <img 
                        src={brand.cover_photo_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600'} 
                        alt={brand.brand_name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </Link>
                    <div className="mt-3">
                      <Link 
                        href={`/brand/${encodeURIComponent(brand.brand_name)}`}
                        className="font-bold text-sm text-gray-900 hover:underline hover:text-blue-600 transition"
                      >
                        {brand.brand_name}
                      </Link>
                      <p className="text-xs text-gray-500 font-medium mt-1">Swoosh, India</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-12 text-center max-w-md mx-auto">
              <p className="text-gray-500 text-lg font-medium">No brands found</p>
              <p className="text-gray-400 text-sm mt-1">We couldn't find any brands matching "{selectedCategory}" in this category.</p>
            </div>
          )}
        </div>
      </section>

      {/* ================= SECTION 2: THE "WE'RE OAKLAHOME" ABOUT BANNER ================= */}
      <section className="bg-[#3c2529] py-16 px-6 border-b border-gray-100 text-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
              <h2 
                className="text-3xl md:text-4xl font-light text-[#dfc28c]"
                style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
              >
                We’re Oaklahome.
              </h2>
              <p className="text-xl md:text-2xl font-bold tracking-tight">
                The platform for retailers.
              </p>
            </div>
            <div>
              <p className="text-base md:text-lg text-neutral-200 font-light leading-relaxed">
                We make it easy for you to discover new products and connect with brands that make your shop stand out.
              </p>
            </div>
          </div>

          <div className="w-full h-[450px] rounded-xl overflow-hidden shadow-xl border border-white/5">
            <img 
              src="https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1600&auto=format&fit=crop&q=80" 
              alt="Cozy boutique shop storefront" 
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* ================= NEW SECTION 3: THE "FOR ANY RETAILER" OLIVE GREEN PROMO BANNER (UPDATED WITH HOME DECOR PHOTOS!) ================= */}
      <section className="bg-[#4a5015] py-16 px-12 text-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 items-center text-center">
          
          {/* Left Square Image: Cozy minimalist home-decor shelves with pottery and books */}
          <div className="w-56 h-56 md:w-64 md:h-64 rounded-xl overflow-hidden shadow-lg border border-white/5 mx-auto">
            <img 
              src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80" 
              alt="Cozy minimalist home-decor shelves with pottery and books" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Center B2B Text Block */}
          <div className="space-y-4 max-w-md mx-auto">
            <h2 
              className="text-3xl font-light text-white leading-tight"
              style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
            >
              For any retailer, no matter what you sell.
            </h2>
            <p className="text-sm text-neutral-100 font-light leading-relaxed">
              Whether you buy for a clothing boutique or a grocery shop, find all the products you need on Oaklahome.
            </p>
            <button
              onClick={() => openAuthModal('signup')}
              className="bg-white hover:bg-neutral-50 text-gray-950 font-bold px-6 py-3 rounded text-[10px] uppercase tracking-widest transition duration-150 shadow-md inline-block mt-4"
            >
              Sign up to buy
            </button>
          </div>

          {/* Right Square Image: Warm oak wooden designer armchair */}
          <div className="w-56 h-56 md:w-64 md:h-64 rounded-xl overflow-hidden shadow-lg border border-white/5 mx-auto">
            <img 
              src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&auto=format&fit=crop&q=80" 
              alt="Warm oak wooden designer armchair" 
              className="w-full h-full object-cover"
            />
          </div>

        </div>
      </section>

      {/* ================= SECTION 4: THE PRODUCTS CATALOG GRID ================= */}
      <section className="max-w-7xl mx-auto py-16 px-6">
        <h2 
          className="text-3xl font-light text-gray-950 mb-8"
          style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
        >
          Explore wholesale products
        </h2>

        <div className="mt-12">
          {searchedProducts.length > 0 ? (
            <div className="space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {searchedProducts.map((product) => (
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
                        <div className="flex items-baseline space-x-2">
                          <span className="text-lg font-black text-gray-950">
                            ₹{product.price ? product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            MSRP ₹{(product.price * 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-gray-800 mt-2 line-clamp-2">
                          {product.title}
                        </h3>

                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
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
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-12 text-center max-w-md mx-auto">
              <p className="text-gray-500 text-lg font-medium">No results found</p>
              <p className="text-gray-400 text-sm mt-1">We couldn't find any products matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* POPUP AUTH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-6">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-gray-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold p-2"
            >
              ✕
            </button>

            <div className="text-center">
              <span className="font-serif text-sm tracking-[0.25em] font-black text-gray-400 block mb-6">
                OAKLAHOME
              </span>
              <h2 className="text-2xl font-serif font-semibold text-gray-950 tracking-tight leading-none mb-6">
                {modalType === 'signin' ? 'Sign in to Oaklahome' : 'Sign up to buy wholesale'}
              </h2>

              <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email address *</label>
                  <input
                    type="email"
                    placeholder="e.g., storeowner@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                    required
                  />
                </div>

                {modalType === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone number *</label>
                    <div className="flex border border-gray-200 rounded bg-gray-50/30 overflow-hidden">
                      <span className="bg-gray-100 px-4 py-3 text-sm text-gray-500 border-r border-gray-200">+91</span>
                      <input
                        type="tel"
                        placeholder="98765 43210"
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        className="w-full px-4 py-3 text-sm text-gray-900 focus:outline-none bg-transparent"
                        required={modalType === 'signup'}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password *</label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition duration-150 shadow"
                >
                  {authLoading ? 'Processing...' : 'Next'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                {modalType === 'signin' ? (
                  <p>
                    New to Oaklahome?{' '}
                    <button 
                      onClick={() => setModalType('signup')}
                      className="text-blue-600 hover:underline"
                    >
                      Sign up to buy
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button 
                      onClick={() => setModalType('signin')}
                      className="text-blue-600 hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}
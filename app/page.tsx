'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext'; // Import our auth hook
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // Track active category filter
  
  const { cart, addToCart } = useCart();
  const { user, login, logout } = useAuth();

  // AUTH MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'signin' | 'signup'>('signin');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone'); 
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // USER DROPDOWN STATE
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // OTP MOCK STATES
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');

  // Calculate the total number of items in the cart
  const totalCartItems = cart.reduce((total: number, item: any) => total + item.quantity, 0);

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

  // Handle OTP Sending
  const handleSendOtp = () => {
    if (!authPhone || authPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    setAuthLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    setAuthLoading(false);
  };

  // Handle Authentication (Sign In & Sign Up to Buy)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (authMethod === 'phone') {
        if (enteredOtp !== generatedOtp) {
          alert('Invalid OTP. Please enter the correct code.');
          setAuthLoading(false);
          return;
        }

        if (modalType === 'signup') {
          // ------- BUYER SIGN UP via PHONE -------
          const { data: existingBuyer } = await supabase
            .from('buyers')
            .select('*')
            .eq('phone', authPhone)
            .maybeSingle();

          if (existingBuyer) {
            alert('An account with this mobile number already exists. Please sign in.');
            setModalType('signin');
            setAuthLoading(false);
            return;
          }

          const { error: signUpError } = await supabase.from('buyers').insert([
            {
              email: `user_${authPhone}@oaklahome.com`, 
              phone: authPhone,
              password: 'phone_otp_user', 
            },
          ]);

          if (signUpError) throw signUpError;

          login({
            email: `${authPhone}@mobile`,
            phone: authPhone,
            role: 'BUYER',
            firstName: 'kargil', 
          });

          alert('Account verified successfully! Welcome to Oaklahome.');
          setIsModalOpen(false);
        } else {
          // ------- BUYER-ONLY SIGN IN via PHONE -------
          const { data: buyerUser } = await supabase
            .from('buyers')
            .select('*')
            .eq('phone', authPhone)
            .maybeSingle();

          if (buyerUser) {
            login({
              email: buyerUser.email,
              phone: buyerUser.phone,
              role: 'BUYER',
              firstName: 'kargil',
            });
            setIsModalOpen(false);
            alert('Logged in as Retailer!');
            setAuthLoading(false);
            return;
          }

          alert('No registered buyer account found with this phone number. Brands must sign in at /seller-login.');
        }
      } else {
        if (!authEmail || !authPassword) {
          alert('Please fill out all required fields.');
          setAuthLoading(false);
          return;
        }

        if (modalType === 'signup') {
          // ------- BUYER SIGN UP via EMAIL -------
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
              phone: '',
              password: authPassword,
            },
          ]);

          if (signUpError) throw signUpError;

          login({
            email: authEmail,
            role: 'BUYER',
            firstName: 'kargil',
          });

          alert('Account created successfully! Welcome to Oaklahome.');
          setIsModalOpen(false);
        } else {
          // ------- BUYER-ONLY SIGN IN via EMAIL -------
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
              firstName: 'kargil',
            });
            setIsModalOpen(false);
            alert('Logged in as Retailer!');
            setAuthLoading(false);
            return;
          }

          alert('Invalid email or password. Brands must sign in at /seller-login.');
        }
      }
    } catch (err: any) {
      console.error('Authentication failed:', err);
      alert('Authentication error: ' + err.message);
    } finally {
      setAuthLoading(false);
      setAuthEmail('');
      setAuthPhone('');
      setAuthPassword('');
      setEnteredOtp('');
      setOtpSent(false);
    }
  };

  const openAuthModal = (type: 'signin' | 'signup') => {
    setModalType(type);
    setAuthMethod('phone'); 
    setOtpSent(false);
    setAuthPhone('');
    setAuthEmail('');
    setAuthPassword('');
    setEnteredOtp('');
    setIsModalOpen(true);
  };

  const filteredBrands = brands.filter((brand) => {
    const brandCategory = brand.category || 'Home decor';
    return selectedCategory === 'all' || brandCategory.toLowerCase() === selectedCategory.toLowerCase();
  });

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

  // Visual Category Circles for Logged-In Buyer
  const loggedInCategories = [
    { name: 'Paintings', img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150' },
    { name: 'Furniture', img: 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=150' },
    { name: 'Tabletop decor', img: 'https://images.unsplash.com/photo-1606744824163-985d376605aa?w=150' },
    { name: 'Decorative objects', img: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=150' },
    { name: 'Wall art', img: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=150' }
  ];

  const isBuyerLoggedIn = user && user.role === 'BUYER';

  return (
    <main className="min-h-screen bg-white">
      
      {/* ================= OPTIMIZED RESPONSIVE HEADER ================= */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
          
          {/* Top Row: Logo (Left) and Mobile Icons (Right) */}
          <div className="flex items-center justify-between w-full md:w-auto">
            {/* Logo */}
            <Link href="/" className="font-serif text-base md:text-lg tracking-[0.25em] font-black text-gray-900 hover:opacity-85 transition">
              OAKLAHOME
            </Link>

            {/* Mobile-Only Icons Panel (Hidden on Desktop) */}
            <div className="flex md:hidden items-center space-x-3.5">
              {user ? (
                <>
                  {user.role === 'SELLER' ? (
                    <Link 
                      href={`/seller/add-product?brand=${encodeURIComponent(user.brandName || '')}`}
                      className="bg-gray-950 text-white font-bold text-[10px] px-2.5 py-1.5 rounded shadow uppercase tracking-wider"
                    >
                      Portal 📦
                    </Link>
                  ) : (
                    <>
                      {/* Mobile Profile Dropdown */}
                      <div className="relative">
                        <button 
                          onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                          className="w-7 h-7 rounded-full bg-gray-900 text-white font-bold text-xs flex items-center justify-center uppercase"
                        >
                          {user.firstName ? user.firstName[0] : 'K'}
                        </button>
                        {isUserDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50 text-left">
                            <ul className="text-xs font-bold text-gray-600">
                              <li><Link href="/" className="block px-4 py-2 hover:bg-gray-50">Orders</Link></li>
                              <li><Link href="/" className="block px-4 py-2 hover:bg-gray-50">Invoices</Link></li>
                              <li>
                                <button 
                                  onClick={() => {
                                    logout();
                                    setIsUserDropdownOpen(false);
                                  }} 
                                  className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 font-bold"
                                >
                                  Sign out
                                </button>
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-2.5">
                  <button 
                    onClick={() => openAuthModal('signin')}
                    className="text-xs font-bold text-gray-700 hover:text-gray-900 transition"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => openAuthModal('signup')}
                    className="bg-gray-950 hover:bg-gray-800 text-white font-bold text-[10px] px-3 py-1.5 rounded transition duration-150"
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {/* Floating Mobile Cart */}
              {totalCartItems > 0 && (
                <Link 
                  href="/cart" 
                  className="bg-blue-50 text-blue-700 p-2 rounded-xl flex items-center space-x-1"
                >
                  <span>🛒</span>
                  <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.2 text-[9px] font-black">
                    {totalCartItems}
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* Search bar (Full-width on mobile, centered on desktop) */}
          <div className="w-full md:flex-grow md:max-w-xl md:mx-8 relative">
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
              className="w-full border border-gray-200 hover:border-gray-300 rounded-full py-2 md:py-2.5 pl-11 pr-4 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-0 bg-gray-50/50 transition duration-150"
            />
          </div>

          {/* Desktop Menu (Hidden on mobile) */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-semibold text-gray-700">
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
                      Retailer: <strong className="text-gray-950">{user.email ? user.email.split('@')[0] : user.phone}</strong>
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
                  href="/seller-onboarding" 
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

      {/* ================= HERO VIDEO BANNER ================= */}
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
                <Link href="/seller-onboarding" className="text-white underline hover:text-neutral-100 transition font-bold">
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

      {/* ================= SECTION 3: THE "FOR ANY RETAILER" OLIVE GREEN PROMO BANNER ================= */}
      <section className="bg-[#4a5015] py-16 px-12 text-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 items-center text-center">
          
          <div className="w-56 h-56 md:w-64 md:h-64 rounded-xl overflow-hidden shadow-lg border border-white/5 mx-auto">
            <img 
              src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80" 
              alt="Cozy minimalist home-decor shelves with pottery and books" 
              className="w-full h-full object-cover"
            />
          </div>

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

      {/* SECTION 5: FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-16 px-6 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
            <div className="md:col-span-2 space-y-6">
              <h3 
                className="text-3xl font-light text-gray-900 leading-tight max-w-md"
                style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
              >
                The best selection of brands for your store, all in one place
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => openAuthModal('signup')}
                  className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-6 py-3 border border-gray-200 rounded text-xs uppercase tracking-widest transition duration-150 shadow-sm"
                >
                  Sign up to buy
                </button>
                <Link
                  href="/seller-onboarding"
                  className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-6 py-3 border border-gray-200 rounded text-xs uppercase tracking-widest transition duration-150 shadow-sm text-center"
                >
                  Sign up to sell
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Company
              </h4>
              <ul className="space-y-3 text-sm text-gray-500 font-medium">
                <li><Link href="/" className="hover:text-gray-900 transition">About us</Link></li>
                <li><Link href="/" className="hover:text-gray-900 transition">Newsroom</Link></li>
                <li><Link href="/" className="hover:text-gray-900 transition">Careers</Link></li>
                <li><Link href="/" className="hover:text-gray-900 transition">Affiliates</Link></li>
                <li><Link href="/" className="hover:text-gray-900 transition">Blog</Link></li>
                <li><Link href="/" className="hover:text-gray-900 transition">Hub</Link></li>
              </ul>
            </div>

            <div className="space-y-6 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Explore
                </h4>
                <ul className="space-y-3 text-sm text-gray-500 font-medium">
                  <li><Link href="/" className="hover:text-gray-900 transition">Help center</Link></li>
                  <li><Link href="/" className="hover:text-gray-900 transition">Oaklahome Markets</Link></li>
                  <li><Link href="/seller-onboarding" className="hover:text-gray-900 transition">Sign up to sell</Link></li>
                  <li><Link href="/" className="hover:text-gray-900 transition">POS integration</Link></li>
                  <li><Link href="/" className="hover:text-gray-900 transition">How Oaklahome works</Link></li>
                  <li><Link href="/" className="hover:text-gray-900 transition">Large retailers</Link></li>
                  <li><Link href="/" className="hover:text-gray-900 transition">Refer a brand</Link></li>
                </ul>
              </div>

              <div className="flex items-center space-x-6 pt-6 border-t border-gray-50 md:border-none">
                <Link href="/" className="text-gray-500 hover:text-gray-900 transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.01 3.71.054 1.139.052 1.9.24 2.502.542a4.413 4.413 0 011.583 1.503c.3.6.49 1.363.542 2.502.044.925.054 1.28.054 3.71s-.01 2.784-.054 3.71c-.052 1.139-.24 1.9-.542 2.502a4.413 4.413 0 01-1.503 1.583c-.6.3-1.363-.49-2.502.542-.925.044-1.28.054-3.71.054s-2.784-.01-3.71-.054c-1.139-.052-1.9-.24-2.502-.542a4.413 4.413 0 01-1.583-1.503c-.3-.6-.49-1.363-.542-2.502C2.01 14.821 2 14.466 2 12s.01-2.784.054-3.71c.052-1.139.24-1.9.542-2.502a4.413 4.413 0 011.503-1.583c.6-.3 1.363-.49 2.502-.542.925-.044 1.28-.054 3.71-.054zM12 6.865a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27zm0 1.802a3.333 3.333 0 110 6.666 3.333 3.333 0 010-6.666zm5.338-3.205a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link href="/" className="text-gray-500 hover:text-gray-900 transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link href="/" className="text-gray-500 hover:text-gray-900 transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-4">
            <div>
              <span>©2026 Oaklahome Wholesale, Inc.</span>
              <span className="mx-2">•</span>
              <Link href="/" className="hover:text-gray-600 transition">Terms of Service</Link>
              <span className="mx-2">•</span>
              <Link href="/" className="hover:text-gray-600 transition">Privacy Policy</Link>
              <span className="mx-2">•</span>
              <Link href="/" className="hover:text-gray-600 transition">Cookie Policy</Link>
              <span className="mx-2">•</span>
              <Link href="/" className="hover:text-gray-600 transition">IP Policy</Link>
              <span className="mx-2">•</span>
              <Link href="/" className="hover:text-gray-600 transition">Accessibility Policy</Link>
              <span className="mx-2">•</span>
              <Link href="/" className="hover:text-gray-600 transition">Sitemap</Link>
            </div>
            <p className="font-medium text-gray-500 tracking-wide">
              *Sign up to get 50% off your order, up to ₹10,000.
            </p>
          </div>
        </div>
      </footer>

      {/* POPUP AUTH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-6">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-gray-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            
            <button 
              onClick={() => {
                setIsModalOpen(false);
                setOtpSent(false);
                setEnteredOtp('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold p-2"
            >
              ✕
            </button>

            <div className="text-center">
              <span className="font-serif text-sm tracking-[0.25em] font-black text-gray-400 block mb-6">
                OAKLAHOME
              </span>
              <h2 className="text-2xl font-serif font-semibold text-gray-950 tracking-tight leading-none mb-4">
                {modalType === 'signin' ? 'Sign in to Oaklahome' : 'Sign up to buy wholesale'}
              </h2>

              {!otpSent && (
                <div className="flex border-b border-gray-100 mb-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setAuthMethod('phone')}
                    className={`flex-1 pb-3 text-center border-b-2 transition ${
                      authMethod === 'phone' ? 'border-gray-950 text-gray-950' : 'border-transparent hover:text-gray-600'
                    }`}
                  >
                    📱 Mobile OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMethod('email')}
                    className={`flex-1 pb-3 text-center border-b-2 transition ${
                      authMethod === 'email' ? 'border-gray-950 text-gray-950' : 'border-transparent hover:text-gray-600'
                    }`}
                  >
                    ✉️ Email & Pass
                  </button>
                </div>
              )}

              {otpSent && authMethod === 'phone' && (
                <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl p-4 mb-6 text-sm font-semibold text-left animate-in fade-in duration-200">
                  <p>✨ Demo OTP sent successfully!</p>
                  <p className="text-xs text-green-600 font-normal mt-1">
                    Use verification code: <strong className="font-bold text-green-800 text-sm">{generatedOtp}</strong>
                  </p>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
                {authMethod === 'phone' && (
                  <>
                    {!otpSent ? (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mobile Phone Number *</label>
                        <div className="flex border border-gray-200 rounded bg-gray-50/30 overflow-hidden focus-within:ring-1 focus-within:ring-gray-400">
                          <span className="bg-gray-100 px-4 py-3 text-sm text-gray-500 border-r border-gray-200">+91</span>
                          <input
                            type="tel"
                            placeholder="Enter 10-digit mobile number"
                            value={authPhone}
                            onChange={(e) => setAuthPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-full px-4 py-3 text-sm text-gray-900 focus:outline-none bg-transparent"
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={authLoading}
                          className="w-full bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition duration-150 shadow mt-5"
                        >
                          {authLoading ? 'Sending...' : 'Send OTP'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in slide-in-from-bottom-3 duration-200">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Enter 6-Digit OTP *</label>
                          <input
                            type="text"
                            placeholder="Enter the code sent to your phone"
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30 tracking-[0.25em] text-center font-bold text-lg"
                            required
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => { setOtpSent(false); setEnteredOtp(''); }}
                            className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-4 rounded text-sm transition"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={authLoading}
                            className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition duration-150 shadow"
                          >
                            {authLoading ? 'Verifying...' : 'Verify & Sign In'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {authMethod === 'email' && (
                  <>
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
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone number (Optional)</label>
                        <div className="flex border border-gray-200 rounded bg-gray-50/30 overflow-hidden">
                          <span className="bg-gray-100 px-4 py-3 text-sm text-gray-500 border-r border-gray-200">+91</span>
                          <input
                            type="tel"
                            placeholder="98765 43210"
                            value={authPhone}
                            onChange={(e) => setAuthPhone(e.target.value)}
                            className="w-full px-4 py-3 text-sm text-gray-900 focus:outline-none bg-transparent"
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
                  </>
                )}
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                {modalType === 'signin' ? (
                  <p>
                    New to Oaklahome?{' '}
                    <button 
                      onClick={() => setModalType('signup')}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Sign up to buy
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button 
                      onClick={() => setModalType('signin')}
                      className="text-blue-600 hover:underline cursor-pointer"
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
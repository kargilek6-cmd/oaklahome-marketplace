'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  
  const { cart, addToCart } = useCart();
  const { user, login, logout, mounted } = useAuth();

  // AUTH & NAVIGATION DROPDOWN STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'signin' | 'signup'>('signin');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone'); 
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // DROPDOWNS
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false); 

  // OTP MOCK STATES
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');

  const totalCartItems = cart.reduce((total: number, item: any) => total + item.quantity, 0);

  useEffect(() => {
    async function fetchMarketplaceData() {
      try {
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('*');
        if (prodError) throw prodError;
        setProducts(prodData || []);

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

  const loggedInCategories = [
    { name: 'Paintings', img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150' },
    { name: 'Furniture', img: 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=150' },
    { name: 'Tabletop decor', img: 'https://images.unsplash.com/photo-1606744824163-985d376605aa?w=150' },
    { name: 'Decorative objects', img: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=150' },
    { name: 'Wall art', img: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=150' }
  ];

  const isUserLoggedIn = mounted && user !== null;

  return (
    <main className="min-h-screen bg-white">
      
      {/* RESPONSIVE HEADER LAYOUT */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* DESKTOP LEFT SECTION */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="font-serif text-lg tracking-[0.25em] font-black text-gray-900 hover:opacity-85 transition">
              OAKLAHOME
            </Link>

            {/* Left-Aligned Category Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsCategoriesDropdownOpen(!isCategoriesDropdownOpen)}
                className="flex items-center space-x-1.5 text-sm font-semibold text-gray-700 hover:text-gray-950 transition cursor-pointer"
              >
                <span>All categories</span>
                <span className="text-[10px] text-gray-400">▼</span>
              </button>

              {isCategoriesDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCategoriesDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2.5 w-56 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoriesDropdownOpen(false);
                        }}
                        className={`w-full block px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition cursor-pointer ${
                          selectedCategory.toLowerCase() === cat.toLowerCase() ? 'font-bold text-gray-950 bg-gray-50/50' : 'text-gray-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* MOBILE LEFT SECTION */}
          <div className="flex md:hidden items-center space-x-3.5">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-gray-800 hover:text-gray-950 focus:outline-none p-1 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <Link href="/" className="font-serif text-base tracking-[0.2em] font-black text-gray-900">
              OAKLAHOME
            </Link>
          </div>

          {/* DESKTOP CENTER SEARCH BAR */}
          <div className="hidden md:block flex-grow max-w-xl mx-8 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search wholesale products or brands"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 hover:border-gray-300 rounded-full py-2.5 pl-11 pr-4 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/50 transition duration-150"
            />
          </div>

          {/* DESKTOP RIGHT CONTROLS */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-semibold text-gray-700 relative">
            {mounted && user ? (
              <>
                {user.role === 'SELLER' ? (
                  <Link 
                    href={`/seller/add-product?brand=${encodeURIComponent(user.brandName || '')}`}
                    className="bg-gray-950 hover:bg-gray-800 text-white font-bold px-4 py-2.5 rounded-md transition duration-150 shadow"
                  >
                    Go to Portal 📦
                  </Link>
                ) : (
                  <div className="relative">
                    <button 
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 transition cursor-pointer"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>

                    {isUserDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                        <div className="absolute right-0 mt-3 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="px-4 py-2 border-b border-gray-100 mb-1">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Retailer ID</p>
                            <p className="text-xs font-black text-gray-950 truncate mt-0.5">
                              {user.email ? user.email.split('@')[0] : user.phone}
                            </p>
                          </div>
                          <Link href="/orders" onClick={() => setIsUserDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-bold">
                            Orders
                          </Link>
                          <span className="block px-4 py-2 text-sm text-gray-300 cursor-not-allowed font-medium">Invoices (Locked)</span>
                          <span className="block px-4 py-2 text-sm text-gray-300 cursor-not-allowed font-medium">Messages (Locked)</span>
                          <span className="block px-4 py-2 text-sm text-gray-300 cursor-not-allowed font-medium">Reviews (Locked)</span>
                          <span className="block px-4 py-2 text-sm text-gray-300 cursor-not-allowed font-medium">Favorites (Locked)</span>
                          <span className="block px-4 py-2 text-sm text-gray-300 cursor-not-allowed font-medium">Settings (Locked)</span>
                          <button 
                            onClick={() => { logout(); setIsUserDropdownOpen(false); }}
                            className="w-full text-left block px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-2 font-bold"
                          >
                            Sign out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <Link href="/seller-onboarding" className="hover:text-gray-950 transition">Sign up to sell</Link>
                <button onClick={() => openAuthModal('signin')} className="hover:text-gray-950 transition cursor-pointer">Sign in</button>
                <button onClick={() => openAuthModal('signup')} className="bg-gray-950 hover:bg-gray-800 text-white font-bold px-4 py-2.5 rounded-md transition duration-150 cursor-pointer animate-in fade-in">Sign up to buy</button>
              </>
            )}

            {/* Desktop Cart */}
            <Link 
              href="/cart" 
              className="bg-gray-50 text-gray-700 border border-gray-100 hover:bg-gray-100 p-2.5 rounded-full transition flex items-center justify-center relative cursor-pointer"
            >
              <span>🛒</span>
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-black shadow-md">
                  {totalCartItems}
                </span>
              )}
            </Link>
          </div>

          {/* MOBILE RIGHT SECTION */}
          <div className="flex md:hidden items-center space-x-4">
            {/* Search Icon button */}
            <button 
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="text-gray-700 hover:text-gray-950 p-1 cursor-pointer"
            >
              <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Mobile Cart Icon */}
            <Link 
              href="/cart" 
              className="bg-gray-50 text-gray-700 border border-gray-100 p-2 rounded-full transition flex items-center justify-center relative cursor-pointer"
            >
              <span className="text-sm">🛒</span>
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white rounded-full h-4.5 w-4.5 flex items-center justify-center text-[9px] font-black shadow-md animate-in zoom-in">
                  {totalCartItems}
                </span>
              )}
            </Link>
          </div>

        </div>

        {/* MOBILE COLLAPSIBLE SEARCH BAR INPUT */}
        {isMobileSearchOpen && (
          <div className="mt-3 relative md:hidden animate-in slide-in-from-top-2 duration-150">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search products or brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-full py-2 pl-11 pr-4 text-sm text-gray-900 focus:outline-none bg-gray-50/50"
            />
          </div>
        )}
      </header>

      {/* FAIRE STYLE MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 transition-opacity" 
          />

          <div className="relative w-4/5 max-w-xs h-full bg-white flex flex-col justify-between z-50 animate-in slide-in-from-left duration-250 shadow-2xl">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-neutral-200 text-xl font-bold p-2 focus:outline-none z-50 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex-grow overflow-y-auto">
              {/* TOP BLOCK (Dark Grey / Black Menu) */}
              <div className="bg-[#1a1a1a] text-white p-6 pt-12 space-y-4">
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="font-serif text-sm tracking-[0.25em] font-black text-neutral-300 block mb-6">
                  OAKLAHOME
                </Link>

                {mounted && user ? (
                  <div className="space-y-4 text-left">
                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Logged in</p>
                    <p className="font-extrabold text-white text-base truncate">
                      {user.role === 'SELLER' ? user.brandName : `Retailer: ${user.email ? user.email.split('@')[0] : user.phone}`}
                    </p>
                    {user.role === 'SELLER' ? (
                      <Link
                        href={`/seller/add-product?brand=${encodeURIComponent(user.brandName || '')}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex justify-between items-center bg-white text-gray-950 font-bold px-4 py-3 rounded-lg text-sm w-full"
                      >
                        <span>Portal Dashboard 📦</span>
                        <span>→</span>
                      </Link>
                    ) : (
                      <Link
                        href="/orders"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex justify-between items-center bg-white text-gray-950 font-bold px-4 py-3 rounded-lg text-sm w-full"
                      >
                        <span>My Orders 📋</span>
                        <span>→</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 font-bold text-sm text-left">
                    <button 
                      onClick={() => { setIsMobileMenuOpen(false); openAuthModal('signup'); }}
                      className="flex justify-between items-center text-white hover:text-neutral-200 transition py-2 border-b border-neutral-800 w-full text-left cursor-pointer"
                    >
                      <span>Sign up to buy</span>
                      <span className="text-neutral-500">→</span>
                    </button>
                    <button 
                      onClick={() => { setIsMobileMenuOpen(false); openAuthModal('signin'); }}
                      className="flex justify-between items-center text-white hover:text-neutral-200 transition py-2 border-b border-neutral-800 w-full text-left cursor-pointer"
                    >
                      <span>Sign in</span>
                      <span className="text-neutral-500">→</span>
                    </button>
                    <Link 
                      href="/seller-onboarding"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex justify-between items-center text-white hover:text-neutral-200 transition py-2 w-full text-left"
                    >
                      <span>Sign up to sell</span>
                      <span className="text-white">→</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* MIDDLE BLOCK: Trending Collections */}
              <div className="p-6 text-left border-b border-gray-100 bg-white">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">
                  Trending Collections
                </h3>
                <ul className="space-y-3.5 text-sm font-semibold text-gray-600">
                  <li><Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-gray-900 transition block">All European brands</Link></li>
                  <li><Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-gray-900 transition block">Novelty Gifts</Link></li>
                  <li><Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-gray-900 transition block">Based in the U.K.</Link></li>
                  <li><Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-gray-900 transition block">For the Eco Conscious</Link></li>
                  <li><Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-gray-900 transition block">Healthy eats & drinks</Link></li>
                </ul>
              </div>

              {/* BOTTOM BLOCK: Categories for you */}
              <div className="p-6 text-left bg-white">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">
                  Categories for you
                </h3>
                <ul className="space-y-3.5 text-sm font-semibold text-gray-600">
                  {categories.map((catName) => (
                    <li key={catName}>
                      <button
                        onClick={() => {
                          setSelectedCategory(catName);
                          setIsMobileMenuOpen(false); 
                        }}
                        className={`w-full text-left flex justify-between items-center hover:text-gray-900 transition cursor-pointer ${
                          selectedCategory.toLowerCase() === catName.toLowerCase() ? 'text-gray-950 font-bold' : ''
                        }`}
                      >
                        <span>{catName}</span>
                        <span className="text-gray-300">›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {mounted && user && (
              <div className="border-t border-gray-100 p-6 bg-gray-50/50 text-left">
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 text-sm font-bold text-red-600 hover:bg-red-50 p-2.5 rounded-lg transition text-left cursor-pointer"
                >
                  <span>🚪</span>
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= CONDITIONAL BODY LAYOUT ================= */}
      {!isUserLoggedIn ? (
        <>
          {/* ----------------- LOGGED OUT: STANDARD HERO VIDEO ----------------- */}
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
              <div className="max-w-4xl text-white space-y-6 text-left">
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
                    className="bg-white hover:bg-neutral-100 text-gray-950 font-bold px-8 py-3.5 rounded text-xs uppercase tracking-widest transition duration-150 shadow-lg cursor-pointer"
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
        </>
      ) : (
        <>
          {/* ----------------- LOGGED IN HOMEPAGE (ADAPTS FOR BUYERS VS SELLERS) ----------------- */}
          {user.role === 'BUYER' ? (
            <section className="bg-white py-12 px-6 border-b border-gray-100">
              <div className="max-w-7xl mx-auto space-y-12 text-left">
                <h1 
                  className="text-4xl font-light text-gray-950 tracking-tight"
                  style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
                >
                  Welcome back, {user.firstName || 'kargil'}
                </h1>

                {/* FAIRE STYLE CATEGORY CIRCLES */}
                <div className="flex overflow-x-auto gap-12 pb-4 scrollbar-none items-center justify-start">
                  {loggedInCategories.map((cat) => (
                    <button 
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className="flex flex-col items-center space-y-3 cursor-pointer group flex-shrink-0"
                    >
                      <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-100 shadow-sm group-hover:scale-105 group-hover:shadow-md transition duration-200">
                        <img src={cat.img} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-bold text-gray-700 tracking-wide uppercase">{cat.name}</span>
                    </button>
                  ))}
                </div>

                {/* RECENTLY VIEWED CONTAINER */}
                <div className="pt-6 border-t border-gray-50">
                  <h3 
                    className="text-2xl font-light text-gray-950 mb-6"
                    style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
                  >
                    Recently viewed
                  </h3>
                  
                  {products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {products.slice(0, 4).map((product) => {
                        const firstImage = product.image_url ? product.image_url.split(',')[0] : '';
                        return (
                          <div key={product.id} className="group text-left flex flex-col justify-between animate-in fade-in">
                            <div>
                              {/* B2B Route to Product Detail Page PDP! */}
                              <Link href={`/product/${product.id}`} className="block w-full h-48 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative shadow-sm hover:shadow-md transition cursor-pointer">
                                <img 
                                  src={firstImage} 
                                  alt="" 
                                  className="w-full h-full object-cover group-hover:scale-102 transition duration-200"
                                />
                              </Link>
                              <div className="mt-2.5">
                                <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{product.title}</h4>
                                <p className="text-xs text-gray-500 font-bold mt-1">₹{product.price?.toLocaleString('en-IN')}</p>
                              </div>
                            </div>
                            
                            {/* Add to Cart button */}
                            <button
                              onClick={() => {
                                addToCart(product);
                                alert(`Added "${product.title}" to cart!`);
                              }}
                              className="w-full mt-3 bg-gray-950 hover:bg-gray-850 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition duration-150 active:scale-95 cursor-pointer text-center"
                            >
                              + Add to Cart
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No recently viewed items.</p>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white py-10 px-6 border-b border-gray-100">
              <div className="max-w-7xl mx-auto text-left">
                <h1 
                  className="text-4xl font-light text-gray-950 tracking-tight"
                  style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
                >
                  Browsing Oaklahome as Wholesaler: <strong className="text-gray-900 font-black">{user.brandName}</strong>
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                  You are currently logged in as a seller. You can browse the public market below, or click <Link href={`/seller/add-product?brand=${encodeURIComponent(user.brandName || '')}`} className="text-blue-600 font-bold hover:underline">Go to Portal</Link> to manage your catalog!
                </p>
              </div>
            </section>
          )}
        </>
      )}

      {/* SECTION 1: THE "FEATURED BRANDS" SECTION */}
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
                  <div key={brand.id} className="group overflow-hidden text-left">
                    <Link href={`/brand/${encodeURIComponent(brand.brand_name)}`} className="block w-full h-64 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative shadow-sm hover:shadow-md transition cursor-pointer">
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

      {/* SECTION 2: THE "WE'RE OAKLAHOME" ABOUT BANNER */}
      <section className="bg-[#3c2529] py-16 px-6 border-b border-gray-100 text-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start text-left">
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

      {/* SECTION 3: THE "FOR ANY RETAILER" OLIVE GREEN PROMO BANNER */}
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
              className="bg-white hover:bg-neutral-50 text-gray-950 font-bold px-6 py-3 rounded text-[10px] uppercase tracking-widest transition duration-150 shadow-md inline-block mt-4 cursor-pointer"
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

      {/* SECTION 4: THE PRODUCTS CATALOG GRID */}
      <section className="max-w-7xl mx-auto py-16 px-6">
        <h2 
          className="text-3xl font-light text-gray-950 mb-8"
          style={{ fontFamily: "Playfair Display, Baskerville, Georgia, serif" }}
        >
          Explore wholesale products
        </h2>

        <div className="mt-12 text-left">
          {searchedProducts.length > 0 ? (
            <div className="space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {searchedProducts.map((product) => {
                  const firstImage = product.image_url ? product.image_url.split(',')[0] : '';
                  return (
                    <div 
                      key={product.id} 
                      className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition duration-200 flex flex-col justify-between animate-in fade-in"
                    >
                      <div>
                        {firstImage && (
                          <Link href={`/product/${product.id}`} className="relative block w-full h-56 bg-gray-50 cursor-pointer">
                            <img 
                              src={firstImage} 
                              alt={product.title} 
                              className="w-full h-full object-cover"
                            />
                          </Link>
                        )}
                        <div className="p-5">
                          {isUserLoggedIn ? (
                            <>
                              <div className="flex items-baseline space-x-2">
                                <span className="text-lg font-black text-gray-950">
                                  ₹{product.price ? product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                </span>
                                <span className="text-xs text-gray-400 line-through">
                                  MSRP ₹{(product.price * 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              <Link href={`/product/${product.id}`} className="block text-base font-semibold text-gray-800 mt-2 line-clamp-2 hover:underline">
                                {product.title}
                              </Link>
                            </>
                          ) : (
                            <>
                              <div className="flex items-baseline mb-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">
                                  Pricing Protected 🔒
                                </span>
                              </div>
                              <h3 className="text-base font-semibold text-gray-400 line-clamp-2 blur-[2px] select-none">
                                {product.title}
                              </h3>
                            </>
                          )}

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
                          
                          {isUserLoggedIn ? (
                            <button
                              onClick={() => {
                                addToCart(product);
                                alert(`Added "${product.title}" to cart!`);
                              }}
                              className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition duration-150 active:scale-95 cursor-pointer"
                            >
                              + Add to Cart
                            </button>
                          ) : (
                            <button
                              onClick={() => openAuthModal('signin')}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs py-2.5 px-4 rounded-lg transition duration-150 cursor-pointer"
                            >
                              Sign in to buy
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-16 px-6 mt-16 text-left">
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
                  className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-6 py-3 border border-gray-200 rounded text-xs uppercase tracking-widest transition duration-150 shadow-sm cursor-pointer"
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
            </div>
          </div>

          <div className="border-t border-gray-100 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-4">
            <div>
              <span>©2026 Oaklahome Wholesale, Inc.</span>
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
                          className="w-full bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition duration-150 shadow mt-5 cursor-pointer"
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
                            placeholder="Enter code"
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
                            className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-4 rounded text-sm transition cursor-pointer"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={authLoading}
                            className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition duration-150 shadow cursor-pointer"
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
                      className="w-full bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition duration-150 shadow cursor-pointer"
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
                      className="text-blue-600 hover:underline cursor-pointer font-bold"
                    >
                      Sign up to buy
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button 
                      onClick={() => setModalType('signin')}
                      className="text-blue-600 hover:underline cursor-pointer font-bold"
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
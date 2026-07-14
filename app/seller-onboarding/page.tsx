'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; 
import { useAuth } from '../context/AuthContext'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const { login } = useAuth(); 
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Uploading Loading States
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Active tab inside Step 6's preview card ('about' vs 'products')
  const [previewTab, setPreviewTab] = useState<'about' | 'products'>('about');

  // Form States (matching your Supabase "brands" columns)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [noWebsite, setNoWebsite] = useState(false); 
  const [category, setCategory] = useState('');
  
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [brandStory, setBrandStory] = useState('');
  const [brandValues, setBrandValues] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');

  // HYDRATION FIX: Wait for client-side mount before showing form inputs
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // PROFILE PHOTO UPLOADER (Uploads to 'product-images' bucket)
  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `profile-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${brandName ? encodeURIComponent(brandName) : 'unregistered'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setProfilePhotoUrl(data.publicUrl);
    } catch (err: any) {
      console.error('Profile upload failed:', err);
      alert('Failed to upload profile photo: ' + err.message);
    } finally {
      setUploadingProfile(false);
    }
  };

  // COVER PHOTO UPLOADER (Uploads to 'product-images' bucket)
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${brandName ? encodeURIComponent(brandName) : 'unregistered'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setCoverPhotoUrl(data.publicUrl);
    } catch (err: any) {
      console.error('Cover upload failed:', err);
      alert('Failed to upload cover photo: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle final submission to Supabase
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('brands').insert([
        {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          password,
          brand_name: brandName,
          website_url: noWebsite ? 'No website yet' : websiteUrl || null,
          category,
          profile_photo_url: profilePhotoUrl || null,
          cover_photo_url: coverPhotoUrl || null,
          brand_story: brandStory || null,
          brand_values: brandValues || null,
          established_year: establishedYear || null,
        },
      ]);

      if (error) throw error;

      login({
        email: email,
        role: 'SELLER',
        brandName: brandName,
        firstName: firstName,
        lastName: lastName,
      });

      router.push(`/seller/add-product?brand=${encodeURIComponent(brandName)}`);
    } catch (err: any) {
      console.error('Onboarding submission failed:', err);
      alert('Failed to complete onboarding: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Apparel', 'Accessories', 'Footwear', 'Beauty & wellness',
    'Home decor', 'Kids & baby', 'Food & drink', 'Paper & novelty',
    'Pets', 'Jewelry', 'Something else'
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading onboarding...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* GLOBAL ONBOARDING HEADER */}
      <header className="border-b border-gray-100 py-5 px-6 flex justify-between items-center bg-white sticky top-0 z-50">
        <Link href="/" className="font-serif text-lg tracking-[0.25em] font-black text-gray-950">
          OAKLAHOME
        </Link>
        <div className="flex items-center space-x-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">
          <span>Step {step} of 6</span>
          <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gray-900 h-full transition-all duration-300" 
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-12 px-6 flex justify-center">

        {/* ================= STEP 1: SIGN UP ================= */}
        {step === 1 && (
          <div className="max-w-md w-full text-center">
            <h1 className="text-3xl font-serif font-semibold text-gray-950 tracking-tight leading-tight">
              Welcome! Sign up to sell on Oaklahome.
            </h1>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              Oaklahome is an online wholesale marketplace with easy-to-use tools designed to help you sell to hundreds of thousands of retailers.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-5 text-left mt-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Business email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Phone number</label>
                <div className="flex border border-gray-200 rounded bg-gray-50/30 overflow-hidden">
                  <span className="bg-gray-100 px-4 py-3 text-sm text-gray-500 border-r border-gray-200">+91</span>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 text-sm text-gray-900 focus:outline-none bg-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition duration-150 shadow cursor-pointer"
              >
                Next
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wider">
              <p>
                Already have a brand?{' '}
                <Link href="/seller-login" className="text-blue-600 hover:underline">
                  Sign in to your seller portal
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* ================= STEP 2: BUSINESS DETAILS ================= */}
        {step === 2 && (
          <div className="max-w-md w-full text-center">
            <h1 className="text-3xl font-serif font-semibold text-gray-950 tracking-tight leading-tight">
              Hi {firstName}, <br />tell us about your business.
            </h1>

            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-5 text-left mt-8">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Brand name</label>
                <input
                  type="text"
                  placeholder="Enter your brand name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Website URL (optional)</label>
                <input
                  type="text" 
                  placeholder="e.g., https://example.com or instagram handle"
                  value={noWebsite ? '' : websiteUrl}
                  disabled={noWebsite}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                
                <div className="flex items-center space-x-2 mt-3">
                  <input
                    type="checkbox"
                    id="noWebsite"
                    checked={noWebsite}
                    onChange={(e) => setNoWebsite(e.target.checked)}
                    className="rounded border-gray-300 text-gray-950 focus:ring-gray-950 h-4 w-4"
                  />
                  <label htmlFor="noWebsite" className="text-xs text-gray-500 font-bold cursor-pointer uppercase tracking-wider">
                    I don't have a website yet
                  </label>
                </div>

                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  We'll use your website or social profile to verify your brand, set up your account, and import content to build your shop.
                </p>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow cursor-pointer"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= STEP 3: READY FOR NEXT STEP ================= */}
        {step === 3 && (
          <div className="max-w-md w-full text-center py-8">
            <span className="text-5xl">🎉</span>
            <h1 className="text-3xl font-serif font-semibold text-gray-950 tracking-tight leading-tight mt-6">
              Ready for the next step
            </h1>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              We've finished checking your website. Just a few more steps to set up your account.
            </p>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: CATEGORIES ================= */}
        {step === 4 && (
          <div className="max-w-2xl w-full text-center">
            <h1 className="text-3xl font-serif font-semibold text-gray-950 tracking-tight leading-tight">
              What category do most of your products fall under?
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Select your brand's primary category. You can still sell products in other categories.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-8 text-left">
              {categories.map((catName) => (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setCategory(catName)}
                  className={`w-full text-left border px-5 py-4 rounded-lg font-semibold text-sm transition duration-150 cursor-pointer ${
                    category === catName 
                      ? 'border-gray-900 bg-gray-50 text-gray-950 shadow-sm ring-1 ring-gray-950' 
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                  }`}
                >
                  {catName}
                </button>
              ))}
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setStep(3)}
                className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition cursor-pointer"
              >
                Back
              </button>
              <button
                disabled={!category}
                onClick={() => setStep(5)}
                className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow disabled:bg-gray-200 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: BUILD SHOP INTRO ================= */}
        {step === 5 && (
          <div className="max-w-md w-full text-center py-8">
            <span className="text-5xl">🎨</span>
            <h1 className="text-3xl font-serif font-semibold text-gray-950 tracking-tight leading-tight mt-6">
              Your account is set up. <br />Now, let's build your shop.
            </h1>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              Your shop is the page that retailers will see when they shop for your products on Oaklahome.
            </p>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setStep(4)}
                className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 6: DYNAMIC SPLIT-SCREEN CUSTOMIZER ================= */}
        {step === 6 && (
          <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-12 items-start text-left">
            
            {/* LEFT SIDE: LIVE-UPDATING STOREFRONT PREVIEW CARD */}
            <div className="w-full lg:w-1/2 sticky top-24 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md">
              {/* Cover Photo */}
              <div className="w-full h-44 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                {coverPhotoUrl ? (
                  <img src={coverPhotoUrl} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <span className="text-3xl text-gray-300">🖼️</span>
                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">Preview Banner Photo</p>
                  </div>
                )}
              </div>

              <div className="p-6 relative">
                {/* Profile Photo / Logo */}
                <div className="absolute -top-12 left-6 w-20 h-20 bg-white border-2 border-white rounded-full overflow-hidden shadow-sm flex items-center justify-center">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-gray-300">👤</span>
                  )}
                </div>

                <div className="mt-10">
                  <h2 className="text-2xl font-black text-gray-950 tracking-tight">{brandName || 'Your Brand'}</h2>
                  <p className="text-sm text-gray-400 font-semibold mt-1">India</p>

                  {/* ACTIVE PREVIEW TABS: Clicking switches active mock view */}
                  <div className="flex space-x-6 border-b border-gray-100 mt-6 text-sm font-bold text-gray-400">
                    <button 
                      onClick={() => setPreviewTab('products')}
                      className={`pb-3 border-b-2 transition ${
                        previewTab === 'products' ? 'border-gray-900 text-gray-900' : 'border-transparent hover:text-gray-600'
                      }`}
                    >
                      Products
                    </button>
                    <button 
                      onClick={() => setPreviewTab('about')}
                      className={`pb-3 border-b-2 transition ${
                        previewTab === 'about' ? 'border-gray-900 text-gray-900' : 'border-transparent hover:text-gray-600'
                      }`}
                    >
                      About
                    </button>
                  </div>

                  {/* Dynamic Inner Tab Switcher */}
                  <div className="mt-6 min-h-[14rem]">
                    {previewTab === 'about' ? (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">About {brandName || 'Brand'}</h4>
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                            {brandStory || 'Write your brand story...'}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Brand Values</h4>
                          <p className="text-sm text-gray-600 mt-1 font-medium">
                            {brandValues || 'Add your brand values...'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 text-xs font-medium">
                          <div>
                            <p className="text-gray-400 font-bold uppercase tracking-wider">Established In</p>
                            <p className="font-semibold text-gray-800 mt-0.5">{establishedYear || 'Add year'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-bold uppercase tracking-wider">Based In</p>
                            <p className="font-semibold text-gray-800 mt-0.5">India</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Mock dynamic products tab list */
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-150 text-left">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="border border-gray-100 rounded-xl overflow-hidden p-3 bg-gray-50/30">
                            <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-lg">📦</div>
                            <h4 className="font-bold text-xs text-gray-800 mt-2 uppercase tracking-wide">Listed Product Title</h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-1">₹Wholesale Price</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: CUSTOMIZER INPUT FORMS (WITH FILE UPLOADERS) */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div>
                <h1 className="text-3xl font-serif font-semibold text-gray-950 tracking-tight">Build your shop page</h1>
                <p className="text-gray-500 text-sm mt-1">Complete your store's visual identity so buyers can learn about you.</p>
              </div>

              <div className="space-y-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                
                {/* 1. Functional Profile Photo Uploader */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Profile Photo / Logo *</label>
                  {uploadingProfile ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-400 uppercase animate-pulse">Uploading file...</div>
                  ) : profilePhotoUrl ? (
                    <div className="flex items-center space-x-4 border border-gray-200 rounded-xl p-3 bg-gray-50/20">
                      <img src={profilePhotoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover border" />
                      <button 
                        type="button" 
                        onClick={() => setProfilePhotoUrl('')}
                        className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div className="flex border border-gray-200 rounded-xl bg-gray-50/30 overflow-hidden">
                      <label className="bg-gray-950 hover:bg-gray-800 text-white font-bold text-[10px] px-4 py-3 cursor-pointer uppercase tracking-widest transition">
                        Choose File
                        <input type="file" accept="image/*" onChange={handleProfileUpload} className="hidden" />
                      </label>
                      <span className="px-4 py-3 text-xs text-gray-400 font-semibold truncate">Upload profile logo</span>
                    </div>
                  )}
                </div>

                {/* 2. Functional Cover Photo Uploader */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Cover Banner Photo *</label>
                  {uploadingCover ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-400 uppercase animate-pulse">Uploading file...</div>
                  ) : coverPhotoUrl ? (
                    <div className="flex items-center space-x-4 border border-gray-200 rounded-xl p-3 bg-gray-50/20">
                      <img src={coverPhotoUrl} alt="Cover" className="w-20 h-10 rounded object-cover border" />
                      <button 
                        type="button" 
                        onClick={() => setCoverPhotoUrl('')}
                        className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div className="flex border border-gray-200 rounded-xl bg-gray-50/30 overflow-hidden">
                      <label className="bg-gray-950 hover:bg-gray-800 text-white font-bold text-[10px] px-4 py-3 cursor-pointer uppercase tracking-widest transition">
                        Choose File
                        <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                      </label>
                      <span className="px-4 py-3 text-xs text-gray-400 font-semibold truncate">Upload cover banner</span>
                    </div>
                  )}
                </div>

                {/* 3. Brand Story Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Brand Story</label>
                  <textarea
                    rows={4}
                    placeholder="Tell retail buyers how you got started and what makes your bulk goods special..."
                    value={brandStory}
                    onChange={(e) => setBrandStory(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                  />
                </div>

                {/* 4. Brand Values */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Brand Values (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Handmade, Organic, Eco-Friendly"
                    value={brandValues}
                    onChange={(e) => setBrandValues(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                  />
                </div>

                {/* 5. Established Year */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Year Established (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., 2026"
                    value={establishedYear}
                    onChange={(e) => setEstablishedYear(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading || uploadingProfile || uploadingCover}
                  onClick={handleFinalSubmit}
                  className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow disabled:bg-gray-200 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? 'Completing Onboarding...' : 'Build Shop & Next'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
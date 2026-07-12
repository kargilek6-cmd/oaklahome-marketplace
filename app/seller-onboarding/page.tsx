'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Corrected path (2 levels up)
import { useAuth } from '../context/AuthContext'; // Corrected path (1 level up)
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const { login } = useAuth(); // Connect to our login control room
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form States (matching your Supabase "brands" columns)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [noWebsite, setNoWebsite] = useState(false); // State for "no website" checkbox
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

      // SUCCESS! Automatically log in the new seller instantly
      login({
        email: email,
        role: 'SELLER',
        brandName: brandName,
        firstName: firstName,
        lastName: lastName,
      });

      // Redirect them to their new dashboard page (pre-filled with their brand)
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

  // If the page hasn't finished loading in the browser, show a simple loading screen
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
                className="w-full bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition duration-150 shadow"
              >
                Next
              </button>
            </form>

            {/* INTEGRATED BRAND PORTAL SIGN IN LINK */}
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
                  className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow"
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
                className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow"
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
                  className={`w-full text-left border px-5 py-4 rounded-lg font-semibold text-sm transition duration-150 ${
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
                className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition"
              >
                Back
              </button>
              <button
                disabled={!category}
                onClick={() => setStep(5)}
                className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow disabled:bg-gray-200 disabled:cursor-not-allowed"
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
                className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 6: DYNAMIC SPLIT-SCREEN CUSTOMIZER ================= */}
        {step === 6 && (
          <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-12 items-start text-left">
            
            {/* LEFT SIDE: LIVE-UPDATING STOREFRONT PREVIEW */}
            <div className="w-full lg:w-1/2 sticky top-24 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md">
              {/* Cover Photo */}
              <div className="w-full h-44 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                {coverPhotoUrl ? (
                  <img src={coverPhotoUrl} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <span className="text-3xl text-gray-300">🖼️</span>
                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">Drag & drop or upload cover photo</p>
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
                  <h2 className="text-2xl font-black text-gray-950 tracking-tight">{brandName || 'jkdwf'}</h2>
                  <p className="text-sm text-gray-400 font-semibold mt-1">Swoosh, India</p>

                  {/* Tabs */}
                  <div className="flex space-x-6 border-b border-gray-100 mt-6 text-sm font-bold text-gray-400">
                    <span className="pb-3 border-b-2 border-transparent">Products</span>
                    <span className="pb-3 border-b-2 border-gray-900 text-gray-900">About</span>
                  </div>

                  {/* About content */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">About {brandName || 'Brand'}</h4>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {brandStory || 'Write your brand story...'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Brand Values</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {brandValues || 'Add your brand values...'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 text-xs">
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider">Established In</p>
                        <p className="font-semibold text-gray-800 mt-0.5">{establishedYear || 'Add year'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-wider">Based In</p>
                        <p className="font-semibold text-gray-800 mt-0.5">Swoosh, India</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: CUSTOMIZER INPUT FORMS */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div>
                <h1 className="text-3xl font-serif font-semibold text-gray-950 tracking-tight">Build your shop page</h1>
                <p className="text-gray-500 text-sm mt-1">Complete your store's visual identity so buyers can learn about you.</p>
              </div>

              <div className="space-y-5 bg-white border border-gray-200 rounded-2xl p-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Profile Photo / Logo Link</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={profilePhotoUrl}
                    onChange={(e) => setProfilePhotoUrl(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Cover Photo Link</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={coverPhotoUrl}
                    onChange={(e) => setCoverPhotoUrl(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                  />
                </div>

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

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalSubmit}
                  className="w-2/3 bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow disabled:bg-gray-200 disabled:cursor-not-allowed"
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
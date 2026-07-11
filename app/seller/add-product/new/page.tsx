'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import Link from 'next/link';

// Wrap the product form inside Suspense to satisfy Next.js 15 compilation rules
export default function NewProductPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading form...</p>
      </div>
    }>
      <NewProductForm />
    </Suspense>
  );
}

function NewProductForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Extract the brand name from the URL query parameter (e.g. ?brand=EcoWear)
  const urlBrandName = searchParams.get('brand') || '';

  // Form States
  const [title, setTitle] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Home decor');
  const [price, setPrice] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('published'); // default as published
  
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (urlBrandName) {
      setBrandName(decodeURIComponent(urlBrandName));
    }
  }, [urlBrandName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!title || !brandName || !price || !minOrderAmount) {
      alert('Please fill out all required fields.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from('products').insert([
        {
          title,
          brand_name: brandName,
          description,
          category,
          price: parseFloat(price),
          min_order_amount: parseFloat(minOrderAmount),
          image_url: imageUrl || null,
          status: status,
        },
      ]);

      if (error) throw error;

      alert('Product successfully listed!');
      // Redirect back to the full-width dashboard page!
      router.push(`/seller/add-product?brand=${encodeURIComponent(brandName)}`);
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert('Failed to list product: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Apparel', 'Accessories', 'Footwear', 'Beauty & wellness',
    'Home decor', 'Kids & baby', 'Food & drink', 'Paper & novelty',
    'Pets', 'Jewelry', 'CBD/THC', 'Something else'
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading form...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* FAIRE STYLE HEADER */}
        <header className="mb-8 flex justify-between items-center border-b border-gray-200 pb-4">
          <div>
            <Link href={`/seller/add-product?brand=${encodeURIComponent(brandName)}`} className="text-sm font-bold text-gray-500 hover:text-gray-900">
              ← Products
            </Link>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight mt-2">New product</h1>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push(`/seller/add-product?brand=${encodeURIComponent(brandName)}`)}
              className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold px-4 py-2.5 rounded text-sm transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-gray-950 hover:bg-gray-800 text-white font-bold px-5 py-2.5 rounded text-sm transition disabled:bg-gray-200 shadow"
            >
              {loading ? 'Saving...' : 'Save & publish'}
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* ================= SECTION 1: BASIC INFORMATION ================= */}
          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-2">Basic information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              
              {/* Product Details Form */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Product details*</h3>
                <p className="text-xs text-gray-400">Add a name and description to help retailers learn more about your product.</p>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Name</label>
                  <input
                    type="text"
                    placeholder="Give your product a clear, concise name."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the product materials, story, or details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20"
                  />
                </div>
              </div>

              {/* Product Category Form */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Product category*</h3>
                <p className="text-xs text-gray-400">Provide additional information to help us categorize your products on Oaklahome.</p>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product Type</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20"
                  >
                    {categories.map((catName) => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Brand Owner (Locked)</label>
                  <input
                    type="text"
                    value={brandName}
                    disabled
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>

            </div>
          </section>

          {/* ================= SECTION 2: IMAGES & VIDEOS ================= */}
          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-2">Images & videos</h2>
            <div className="space-y-5 mt-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Product images*</h3>
              <p className="text-xs text-gray-400">Add high-quality images. The first image will be your main product listing photo.</p>

              {/* 8-SQUARE FAIRE PHOTO GRID PLACEHOLDER */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* 1st Square: ACTIVE LINK INPUT BOX */}
                <div className="border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col justify-center items-center text-center bg-gray-50/30 min-h-[10rem]">
                  {imageUrl ? (
                    <div className="w-full h-full relative group">
                      <img src={imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button 
                        type="button" 
                        onClick={() => setImageUrl('')}
                        className="absolute inset-0 bg-black/50 text-white font-bold text-xs flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="w-full space-y-2">
                      <span className="text-2xl">📸</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Paste Image Link</p>
                      <input
                        type="url"
                        placeholder="https://unsplash..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] focus:outline-none focus:border-gray-400 bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Remaining 7 empty squares exactly like Faire */}
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="border border-dashed border-gray-100 rounded-xl flex flex-col justify-center items-center text-center bg-gray-50/10 min-h-[10rem]">
                    <span className="text-xl text-gray-300">📤</span>
                    <p className="text-[10px] text-gray-300 font-bold mt-1 uppercase tracking-wider">Upload image</p>
                  </div>
                ))}

              </div>
            </div>
          </section>

          {/* ================= SECTION 3: PRICING & ORDER RULES ================= */}
          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-2">Pricing & Order Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Wholesale Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="₹12.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Brand Min. Order (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="₹100.00"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20"
                >
                  <option value="published">Published (Visible on Market)</option>
                  <option value="draft">Draft (Hidden in Catalog)</option>
                </select>
              </div>

            </div>
          </section>

          {/* BOTTOM BUTTON BAR */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push(`/seller/add-product?brand=${encodeURIComponent(brandName)}`)}
              className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow disabled:bg-gray-200 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save & publish'}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}
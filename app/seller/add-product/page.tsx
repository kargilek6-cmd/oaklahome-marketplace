'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

export default function AddProductPage() {
  // Setup state to track form inputs
  const [title, setTitle] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Track loading and success states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // HYDRATION FIX: Wait for client-side mount before showing form inputs
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    // Validate inputs
    if (!title || !brandName || !price || !moq) {
      setMessage({ text: 'Please fill out all required fields.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      // Insert the product into Supabase
      const { error } = await supabase.from('products').insert([
        {
          title,
          brand_name: brandName,
          description,
          price: parseFloat(price),
          moq: parseInt(moq),
          image_url: imageUrl || null,
        },
      ]);

      if (error) throw error;

      // Reset form on success
      setMessage({ text: 'Product successfully listed!', type: 'success' });
      setTitle('');
      setBrandName('');
      setDescription('');
      setPrice('');
      setMoq('');
      setImageUrl('');
    } catch (err: any) {
      console.error('Upload failed:', err);
      setMessage({ text: err.message || 'Failed to list product.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // If the page hasn't finished loading in the browser, show a simple loading screen
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading form...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight">Add Wholesale Product</h1>
            <p className="text-gray-500 mt-1">List your products on Oaklahome Marketplace.</p>
          </div>
          <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
            Go to Market
          </Link>
        </header>

        {message.text && (
          <div className={`p-4 rounded-xl mb-6 font-semibold text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Product Title *</label>
              <input
                type="text"
                placeholder="e.g., Ceramic Mug"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Brand Name *</label>
              <input
                type="text"
                placeholder="e.g., Clay & Co."
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              placeholder="Tell retail buyers about your bulk products..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Wholesale Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="12.50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Minimum Order (MOQ) *</label>
              <input
                type="number"
                placeholder="15"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Image URL</label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'List Product on Marketplace'}
          </button>
        </form>
      </div>
    </main>
  );
}
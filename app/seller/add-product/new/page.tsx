'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import Link from 'next/link';

// Move categories to the top of the file so TypeScript can access it anywhere
const categories = [
  'Apparel', 'Accessories', 'Footwear', 'Beauty & wellness',
  'Home decor', 'Kids & baby', 'Food & drink', 'Paper & novelty',
  'Pets', 'Jewelry', 'Something else'
];

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
  const urlBrandName = searchParams.get('brand') || '';

  // Form States
  const [title, setTitle] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Home decor');
  const [price, setPrice] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [status, setStatus] = useState('published');
  
  // MULTIPLE IMAGE STATES
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const [mounted, setMounted] = useState(false);

  // 1. HYDRATION & DRAFT RESTORER (Loads any unsaved draft from browser memory on mount)
  useEffect(() => {
    if (urlBrandName) {
      setBrandName(decodeURIComponent(urlBrandName));
    }

    const savedDraft = localStorage.getItem('oaklahome_draft_product');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.title) setTitle(draft.title);
        if (draft.description) setDescription(draft.description);
        if (draft.category) setCategory(draft.category);
        if (draft.price) setPrice(draft.price);
        if (draft.minOrderAmount) setMinOrderAmount(draft.minOrderAmount);
        if (draft.imageUrls) setImageUrls(draft.imageUrls);
      } catch (e) {
        console.error('Failed to parse draft details:', e);
      }
    }
    setMounted(true);
  }, [urlBrandName]);

  // 2. AUTOSAVE EFFECT (Instantly saves draft locally whenever any field changes)
  useEffect(() => {
    if (mounted) {
      const draftPayload = {
        title,
        description,
        category,
        price,
        minOrderAmount,
        imageUrls
      };
      localStorage.setItem('oaklahome_draft_product', JSON.stringify(draftPayload));
    }
  }, [title, description, category, price, minOrderAmount, imageUrls, mounted]);

  // 3. BEFOREUNLOAD WARNING (Browser native exit blocker)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasChanges = title || description || price || minOrderAmount || imageUrls.length > 0;
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, description, price, minOrderAmount, imageUrls]);

  // AUTOMATED IMAGE RESOLUTION CHECKER (Verifies 2048 x 2048px or higher)
  const validateImageResolution = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src); // Clean up memory
        if (img.width < 2048 || img.height < 2048) {
          alert(`Image resolution is too low (${img.width} x ${img.height} px).\n\nProduct images must be 2048 x 2048 pixels or higher to ensure high-quality listings on Oaklahome.`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
    });
  };

  // SINGLE BUTTON MULTI-IMAGE UPLOADER
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Enforce 2048x2048 pixel resolution limit
    const isValidResolution = await validateImageResolution(file);
    if (!isValidResolution) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const safeFolder = brandName ? brandName.trim().replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : 'unregistered';
      const filePath = `${safeFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setImageUrls((prev) => [...prev, data.publicUrl]);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Remove photo from gallery list
  const handleRemovePhoto = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // NATIVE HTML5 DRAG & DROP HANDLERS
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const updated = [...imageUrls];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setImageUrls(updated);
    setDraggedIndex(null);
  };

  // Confirm cancel action (Safe local routing alert)
  const handleCancelClick = () => {
    const hasChanges = title || description || price || minOrderAmount || imageUrls.length > 0;
    if (hasChanges) {
      const confirmRoute = window.confirm("You have unsaved changes! Are you sure you want to discard them and exit?");
      if (!confirmRoute) return;
      
      localStorage.removeItem('oaklahome_draft_product');
    }
    router.push(`/seller/add-product?brand=${encodeURIComponent(brandName)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!title || !brandName || !price || !minOrderAmount) {
      alert('Please fill out all required fields.');
      setLoading(false);
      return;
    }

    try {
      const finalImageString = imageUrls.join(',');

      const { error } = await supabase.from('products').insert([
        {
          title,
          brand_name: brandName,
          description,
          category,
          price: parseFloat(price),
          min_order_amount: parseFloat(minOrderAmount),
          image_url: finalImageString || null,
          status: status,
        },
      ]);

      if (error) throw error;

      localStorage.removeItem('oaklahome_draft_product');

      alert('Product successfully listed!');
      router.push(`/seller/add-product?brand=${encodeURIComponent(brandName)}`);
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert('Failed to list product: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading form...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
        
        {/* HEADER */}
        <header className="mb-8 flex justify-between items-center border-b border-gray-200 pb-4 text-left">
          <div>
            <button onClick={handleCancelClick} className="text-sm font-bold text-gray-500 hover:text-gray-900 cursor-pointer">
              ← Products
            </button>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight mt-2">New product</h1>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleCancelClick}
              className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold px-4 py-2.5 rounded text-sm transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || uploading}
              className="bg-gray-950 hover:bg-gray-800 text-white font-bold px-5 py-2.5 rounded text-sm transition disabled:bg-gray-200 shadow cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save & publish'}
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 text-left">
          
          {/* ================= SECTION 1: BASIC INFORMATION ================= */}
          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-2">Basic information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              
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

              <div className="space-y-5">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Product category*</h3>
                <p className="text-xs text-gray-400">Provide additional information to help us categorize your products.</p>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Product Type</label>
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
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Brand Owner (Locked)</label>
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

          {/* ================= SECTION 2: SINGLE-BUTTON DRAG-AND-DROP GALLERY ================= */}
          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-1">Images & videos</h2>
            <p className="text-xs text-gray-400 mb-6">Drag and drop thumbnails to rearrange. The first image will be your main cover photo.</p>

            <div className="flex flex-wrap gap-4 items-center">
              
              {/* Single Upload Button */}
              {imageUrls.length < 8 && (
                <div className="border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col justify-center items-center text-center bg-gray-50/30 w-36 h-36 relative transition duration-150">
                  {uploading ? (
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider animate-pulse">Uploading...</p>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-xl">📤</span>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Add Photo</p>
                      <label className="inline-block bg-gray-950 hover:bg-gray-800 text-white font-bold text-[8px] px-2.5 py-1.5 rounded cursor-pointer uppercase tracking-widest transition duration-150">
                        Upload
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Rearrangeable Thumbnails */}
              {imageUrls.map((url, index) => (
                <div 
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={`w-36 h-36 rounded-xl overflow-hidden border bg-gray-50 relative group cursor-grab transition-transform duration-150 active:cursor-grabbing ${
                    draggedIndex === index ? 'opacity-40 scale-95 border-gray-900' : 'border-gray-200 hover:border-gray-400 shadow-sm'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  
                  {/* Badge showing cover number */}
                  <span className="absolute top-2 left-2 bg-gray-950/75 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
                    {index === 0 ? 'Cover 🖼️' : `#${index + 1}`}
                  </span>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center transition shadow opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Empty state slots (Displays up to 8 total items) */}
              {[...Array(Math.max(0, 7 - imageUrls.length))].map((_, i) => (
                <div key={i} className="border border-dashed border-gray-150 rounded-xl bg-gray-50/10 w-36 h-36 flex flex-col justify-center items-center text-gray-300">
                  <span className="text-lg">🖼️</span>
                </div>
              ))}

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
              onClick={handleCancelClick}
              className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold py-3.5 px-6 rounded text-sm transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow disabled:bg-gray-200 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save & publish'}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import Link from 'next/link';

// Categories array at the top for clean compilation
const categories = [
  'Apparel', 'Accessories', 'Footwear', 'Beauty & wellness',
  'Home decor', 'Kids & baby', 'Food & drink', 'Paper & novelty',
  'Pets', 'Jewelry', 'Something else'
];

export default function EditProductPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading form...</p>
      </div>
    }>
      <EditProductForm />
    </Suspense>
  );
}

function EditProductForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlBrandName = searchParams.get('brand') || '';
  const productId = searchParams.get('id') || '';

  // Form States
  const [title, setTitle] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Home decor');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('published');
  
  // MULTIPLE IMAGE STATES & CLICK-AND-DRAG REPOSITIONING
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editCoverPosition, setEditCoverPosition] = useState('50'); // Product focal slider (0 to 100)
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startPosition, setStartPosition] = useState(50);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const [mounted, setMounted] = useState(false);

  // Load existing product details on mount
  useEffect(() => {
    if (urlBrandName) {
      setBrandName(decodeURIComponent(urlBrandName));
    }

    async function loadActiveProduct() {
      if (!productId) return;
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setTitle(data.title || '');
          setDescription(data.description || '');
          setCategory(data.category || 'Home decor');
          setPrice(data.price ? data.price.toString() : '');
          setEditCoverPosition(data.image_position || '50');
          setImageUrls(data.image_url ? data.image_url.split(',') : []);
          setStatus(data.status || 'published');
        }
      } catch (e) {
        console.error('Failed to fetch existing product details:', e);
      } finally {
        setMounted(true);
      }
    }
    loadActiveProduct();
  }, [urlBrandName, productId]);

  // BEFOREUNLOAD WARNING (Browser exit blocker)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasChanges = title || description || price || imageUrls.length > 0;
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, description, price, imageUrls]);

  // IMAGE RESOLUTION CHECKER (2048x2048px minimum)
  const validateImageResolution = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width < 2048 || img.height < 2048) {
          alert(`Image resolution is too low (${img.width} x ${img.height} px).\n\nProduct images must be 2048 x 2048 pixels or higher to ensure high-quality listings on Oaklahome.`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
    });
  };

  // MULTI-IMAGE UPLOADER
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  // CLICK-AND-DRAG PRODUCT IMAGE POSITION DETECTOR HANDLERS
  const handlePositionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPosition(true);
    setStartY(e.pageY);
    setStartPosition(parseFloat(editCoverPosition));
  };

  const handlePositionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingPosition) return;
    const { height } = e.currentTarget.getBoundingClientRect();
    const deltaY = e.pageY - startY;
    const deltaPercentage = (deltaY / height) * 100;
    
    let newPosition = Math.max(0, Math.min(100, Math.round(startPosition + deltaPercentage)));
    setEditCoverPosition(newPosition.toString());
  };

  const handlePositionMouseUp = () => {
    setIsDraggingPosition(false);
  };

  const handleCancelClick = () => {
    const hasChanges = title || description || price || imageUrls.length > 0;
    if (hasChanges) {
      const confirmRoute = window.confirm("You have unsaved changes! Are you sure you want to discard them and exit?");
      if (!confirmRoute) return;
    }
    router.push(`/seller/add-product?brand=${encodeURIComponent(brandName)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!title || !brandName || !price) {
      alert('Please fill out all required fields.');
      setLoading(false);
      return;
    }

    try {
      const finalImageString = imageUrls.join(',');

      // Run UPDATE query to overwrite existing product listing
      const { error } = await supabase
        .from('products')
        .update({
          title,
          description,
          category,
          price: parseFloat(price),
          image_url: finalImageString || null,
          image_position: editCoverPosition,
          status: status,
        })
        .eq('id', productId);

      if (error) throw error;
      alert('Product details successfully updated!');
      router.push(`/seller/add-product?brand=${encodeURIComponent(brandName)}`);
    } catch (err: any) {
      console.error('Save failed:', err);
      alert('Failed to save listing: ' + err.message);
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
        
        {/* STREAMLINED HEADER (REMOVED DUMMY "NEW PRODUCT" TITLE) */}
        <header className="mb-8 flex justify-between items-center border-b border-gray-200 pb-4 text-left">
          <div>
            <button onClick={handleCancelClick} className="text-sm font-bold text-gray-500 hover:text-gray-900 cursor-pointer">
              ← Products
            </button>
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

          {/* ================= SECTION 2: REPOSITION PREVIEW & PHOTO GRID ================= */}
          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-1">Images & videos</h2>
            <p className="text-xs text-gray-400 mb-6">Drag and drop thumbnails to rearrange. Click and Drag up/down directly on your cover preview below to center your product.</p>

            {imageUrls.length > 0 && (
              <div className="space-y-2 mb-6 animate-in slide-in-from-top-2 duration-150">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  Cover Photo Focal Alignment Position
                </label>
                <div 
                  onMouseDown={handlePositionMouseDown}
                  onMouseMove={handlePositionMouseMove}
                  onMouseUp={handlePositionMouseUp}
                  onMouseLeave={handlePositionMouseUp}
                  className="w-full max-w-sm aspect-square border border-gray-200 rounded-xl overflow-hidden relative cursor-ns-resize bg-gray-50/50 select-none group"
                  title="Drag Up/Down to Center"
                >
                  <img 
                    src={imageUrls[0]} 
                    alt="Product preview" 
                    className="w-full h-full object-cover pointer-events-none" 
                    style={{ objectPosition: `50% ${editCoverPosition}%` }}
                  />
                  <div className="absolute inset-0 bg-black/40 text-white font-bold text-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none gap-2">
                    <span className="text-xl">↕️</span>
                    <span>Drag Up/Down to Center Product</span>
                    <span className="bg-gray-900/80 px-2.5 py-1 rounded text-[10px] mt-1 font-semibold">focal alignment: {editCoverPosition}%</span>
                  </div>
                </div>
              </div>
            )}

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
                  <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
                  
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

              {/* Empty slots */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              
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
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Listing Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20 font-semibold"
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
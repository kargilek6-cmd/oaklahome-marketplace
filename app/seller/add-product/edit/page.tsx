'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import Link from 'next/link';

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
  
  // MULTIPLE IMAGE STATES
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // INTERACTIVE CROP MODAL STATES
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  // BEFOREUNLOAD WARNING
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

  // FILE SELECTOR INTERCEPT
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setCropSource(URL.createObjectURL(file));
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setIsCropModalOpen(true);
    e.target.value = '';
  };

  // CROP PANNING HANDLERS
  const handlePanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPanning(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handlePanMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handlePanMouseUp = () => {
    setIsPanning(false);
  };

  // APPLY CROP & CONVERT TO 2048 x 2048 PX SQUARE IMAGE
  const handleApplyCropAndUpload = () => {
    if (!selectedFile || !cropSource) return;
    setUploading(true);
    setIsCropModalOpen(false);

    const img = new Image();
    img.src = cropSource;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 2048;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setUploading(false);
        return;
      }

      const NW = img.naturalWidth;
      const NH = img.naturalHeight;
      const minSide = Math.min(NW, NH);

      const sw = minSide / zoom;
      const sh = minSide / zoom;
      const scaleFactor = minSide / 320; 

      const cx = NW / 2;
      const cy = NH / 2;
      const sx = cx - sw / 2 - (panX * scaleFactor);
      const sy = cy - sh / 2 - (panY * scaleFactor);

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 2048, 2048);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setUploading(false);
          return;
        }
        const croppedFile = new File([blob], selectedFile.name, { type: 'image/jpeg' });
        await handleUploadToSupabase(croppedFile);
      }, 'image/jpeg', 0.95);
    };
  };

  const handleUploadToSupabase = async (file: File) => {
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
      setSelectedFile(null);
      setCropSource(null);
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
          image_position: '50', // Set default center: crop aligns it natively!
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
    <main className="min-h-screen bg-gray-50 py-12 px-6 text-left">
      <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
        
        {/* HEADER */}
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
                    className="w-full border border-gray-200 rounded px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20 font-semibold"
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

          {/* ================= SECTION 2: SINGLE-BUTTON GALLERY ================= */}
          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-1">Images & videos</h2>
            <p className="text-xs text-gray-400 mb-6">Drag and drop thumbnails to rearrange. The first image will be your main cover photo.</p>

            <div className="flex flex-wrap gap-4 items-center">
              
              {/* Single Upload Button */}
              {imageUrls.length < 8 && (
                <div className="border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col justify-center items-center text-center bg-gray-50/30 w-36 h-36 relative transition duration-150">
                  {uploading ? (
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider animate-pulse">Cropping...</p>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-xl">📤</span>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Add Photo</p>
                      <label className="inline-block bg-gray-950 hover:bg-gray-800 text-white font-bold text-[8px] px-2 py-1 rounded cursor-pointer uppercase tracking-widest transition duration-150">
                        Upload
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
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

      {/* ================= FAIRE STYLE INTERACTIVE CROP, ZOOM & PAN MODAL ================= */}
      {isCropModalOpen && cropSource && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-2xl border border-gray-150 relative animate-in zoom-in-95 duration-150 text-center">
            <button 
              onClick={() => { setIsCropModalOpen(false); setSelectedFile(null); setCropSource(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold p-2 text-lg cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-xl font-serif font-semibold text-gray-950 tracking-tight leading-none mb-2 text-left">
              Adjust & Center Photo
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-medium text-left">Click and drag directly inside the grid box to pan. Use the slider to zoom.</p>

            {/* Interactive Crop Viewport Frame */}
            <div 
              onMouseDown={handlePanMouseDown}
              onMouseMove={handlePanMouseMove}
              onMouseUp={handlePanMouseUp}
              onMouseLeave={handlePanMouseUp}
              className="w-[320px] h-[320px] mx-auto border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 relative cursor-move select-none"
            >
              <img 
                src={cropSource} 
                alt="" 
                className="absolute pointer-events-none max-w-none transition-transform duration-75 origin-center"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                }}
              />
              <div className="absolute inset-0 pointer-events-none border border-white/20 flex flex-col justify-between">
                <div className="border-b border-white/20 h-1/3 w-full" />
                <div className="border-b border-white/20 h-1/3 w-full" />
              </div>
              <div className="absolute inset-0 pointer-events-none flex justify-between">
                <div className="border-r border-white/20 w-1/3 h-full" />
                <div className="border-r border-white/20 w-1/3 h-full" />
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span>Zoom Scale</span>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <div className="flex items-center space-x-4">
                <button type="button" onClick={() => setZoom(Math.max(1, zoom - 0.2))} className="text-sm font-black text-gray-600 hover:text-gray-950 cursor-pointer select-none px-2 py-1">-</button>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-gray-950 h-1.5 bg-gray-100 rounded-lg cursor-pointer"
                />
                <button type="button" onClick={() => setZoom(Math.min(3, zoom + 0.2))} className="text-sm font-black text-gray-600 hover:text-gray-950 cursor-pointer select-none px-2 py-1">+</button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={() => { setIsCropModalOpen(false); setSelectedFile(null); setCropSource(null); }}
                className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold py-2.5 px-4 rounded-lg text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCropAndUpload}
                className="bg-gray-950 hover:bg-gray-800 text-white font-black py-2.5 px-5 rounded-lg text-xs transition shadow cursor-pointer"
              >
                Apply & Upload
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
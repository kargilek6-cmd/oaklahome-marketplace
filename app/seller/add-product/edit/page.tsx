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

  const [title, setTitle] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Home decor');
  const [subCategory, setSubCategory] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('published');
  
  // Set Count and Shape Configs
  const [setCount, setSetCount] = useState<number>(1);
  const [shapeType, setShapeType] = useState<string>('rectangle');

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<'portrait' | 'landscape'>('portrait');
  const [imageDimensions, setImageDimensions] = useState({ width: 320, height: 320 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const [mounted, setMounted] = useState(false);

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
          setSubCategory(data.sub_category || '');
          setPrice(data.price ? data.price.toString() : '');
          setImageUrls(data.image_url ? data.image_url.split(',') : []);
          setStatus(data.status || 'published');
          setSetCount(data.set_count || 1);
          setShapeType(data.shape_type || 'rectangle');
        }
      } catch (e) {
        console.error('Failed to fetch existing product details:', e);
      } finally {
        setMounted(true);
      }
    }
    loadActiveProduct();
  }, [urlBrandName, productId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const src = URL.createObjectURL(file);
    setCropSource(src);

    const img = new Image();
    img.src = src;
    img.onload = () => {
      const NW = img.naturalWidth;
      const NH = img.naturalHeight;
      
      let rw = 320;
      let rh = 320;
      if (NW >= NH) {
        rw = 320;
        rh = 320 * (NH / NW);
      } else {
        rh = 320;
        rw = 320 * (NW / NH);
      }

      setImageDimensions({ width: rw, height: rh });
      setImageAspectRatio(NW > NH ? 'landscape' : 'portrait');
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setIsCropModalOpen(true);
    };

    e.target.value = '';
  };

  const handlePanPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handlePanPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;

    const currentWidth = imageDimensions.width * zoom;
    const currentHeight = imageDimensions.height * zoom;

    const maxPanX = Math.max(0, (currentWidth - 320) / 2);
    const maxPanY = Math.max(0, (currentHeight - 320) / 2);

    const rawPanX = e.clientX - dragStart.x;
    const rawPanY = e.clientY - dragStart.y;

    const constrainedPanX = Math.max(-maxPanX, Math.min(maxPanX, rawPanX));
    const constrainedPanY = Math.max(-maxPanY, Math.min(maxPanY, rawPanY));

    setPanX(constrainedPanX);
    setPanY(constrainedPanY);
  };

  const handlePanPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsPanning(false);
  };

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

      const { error } = await supabase
        .from('products')
        .update({
          title,
          description,
          category,
          sub_category: category === 'Home decor' ? subCategory : null, 
          price: parseFloat(price),
          image_url: finalImageString || null,
          status: status,
          set_count: category === 'Home decor' && subCategory === 'Paintings' ? setCount : 1,
          shape_type: category === 'Home decor' && subCategory === 'Paintings' ? shapeType : 'rectangle',
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

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6 text-left">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center border-b border-gray-200 pb-4 text-left">
          <div>
            <button onClick={handleCancelClick} className="text-sm font-bold text-gray-500 hover:text-gray-900 cursor-pointer">
              ← Products
            </button>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight mt-1">Product Details</h1>
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
          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-2">Basic information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Product details*</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Name</label>
                  <input
                    type="text"
                    placeholder="Give your product a clear name."
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
                    placeholder="Describe the product..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Product category*</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Product Type</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (e.target.value !== 'Home decor') {
                        setSubCategory('');
                      } else {
                        setSubCategory('Paintings');
                      }
                    }}
                    className="w-full border border-gray-200 rounded px-4 py-3.5 text-sm text-gray-900 focus:outline-none bg-gray-50/20 font-semibold mb-4"
                  >
                    {categories.map((catName) => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                </div>

                {category === 'Home decor' && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Sub-category</label>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full border border-gray-200 rounded px-4 py-3.5 text-sm text-gray-900 focus:outline-none bg-gray-50/20 font-semibold"
                    >
                      <option value="Paintings">Paintings</option>
                      <option value="Wall art">Wall art</option>
                      <option value="Vases">Vases</option>
                      <option value="Candles">Candles</option>
                    </select>
                  </div>
                )}

                {category === 'Home decor' && subCategory === 'Paintings' && (
                  <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Set Count</label>
                      <select
                        value={setCount}
                        onChange={(e) => setSetCount(parseInt(e.target.value, 10))}
                        className="w-full border border-gray-200 rounded px-4 py-3.5 text-sm text-gray-900 focus:outline-none bg-gray-50/20 font-semibold"
                      >
                        <option value={1}>Set of 1 Frame</option>
                        <option value={2}>Set of 2 Frames</option>
                        <option value={3}>Set of 3 Frames</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Shape Type</label>
                      <select
                        value={shapeType}
                        onChange={(e) => setShapeType(e.target.value)}
                        className="w-full border border-gray-200 rounded px-4 py-3.5 text-sm text-gray-900 focus:outline-none bg-gray-50/20 font-semibold"
                      >
                        <option value="rectangle">Rectangle (Standard)</option>
                        <option value="square">Square</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Brand Owner</label>
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

          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-1">Images & videos</h2>
            <div className="flex flex-wrap gap-4 items-center mt-6">
              {imageUrls.length < 8 && (
                <div className="border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col justify-center items-center text-center bg-gray-50/30 w-36 h-36 relative transition duration-150">
                  {uploading ? (
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider animate-pulse">Uploading...</p>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-xl">📤</span>
                      <label className="inline-block bg-gray-950 hover:bg-gray-800 text-white font-bold text-[8px] px-2.5 py-1.5 rounded cursor-pointer uppercase tracking-widest transition">
                        Upload
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {imageUrls.map((url, index) => (
                <div 
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={`w-36 h-36 rounded-xl overflow-hidden border bg-gray-50 relative group cursor-grab transition-all duration-150 ${
                    draggedIndex === index ? 'opacity-40' : 'border-gray-200 shadow-sm'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-2">Pricing & Order Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Base Price / Retail Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="₹1200"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none bg-gray-50/20"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-2 font-medium">This serves as the single baseline price (e.g. Set of 1 Frame on Art Paper) from which all other sizes and formats calculate automatically [1].</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Listing Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3.5 text-sm text-gray-900 focus:outline-none bg-gray-50/20 font-semibold"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </section>

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
              className="bg-gray-950 hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded text-sm transition shadow disabled:bg-gray-200 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save & publish'}
            </button>
          </div>
        </form>
      </div>

      {isCropModalOpen && cropSource && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-2xl border border-gray-150 relative text-left">
            <button 
              onClick={() => { setIsCropModalOpen(false); setSelectedFile(null); setCropSource(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold p-2 text-lg"
            >
              ✕
            </button>

            <h3 className="text-xl font-serif font-semibold text-gray-950 mb-2">Adjust & Center Photo</h3>
            <div 
              onPointerDown={handlePanPointerDown}
              onPointerMove={handlePanPointerMove}
              onPointerUp={handlePanPointerUp}
              onPointerCancel={handlePanPointerUp}
              className="w-[320px] h-[320px] mx-auto border border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 relative cursor-move select-none touch-none"
            >
              <img 
                src={cropSource} 
                alt="" 
                className="absolute pointer-events-none max-w-none left-1/2 top-1/2" 
                style={{
                  width: imageAspectRatio === 'landscape' ? 'auto' : '320px',
                  height: imageAspectRatio === 'portrait' ? 'auto' : '320px',
                  minWidth: imageAspectRatio === 'landscape' ? '320px' : 'none',
                  minHeight: imageAspectRatio === 'portrait' ? '320px' : 'none',
                  transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom})`,
                }}
              />
            </div>

            <div className="mt-6 space-y-2">
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-gray-950 h-1.5 bg-gray-100 rounded-lg"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
              <button
                type="button"
                onClick={() => { setIsCropModalOpen(false); setSelectedFile(null); setCropSource(null); }}
                className="border border-gray-200 py-2.5 px-4 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCropAndUpload}
                className="bg-gray-950 text-white font-black py-2.5 px-5 rounded-lg text-xs shadow"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
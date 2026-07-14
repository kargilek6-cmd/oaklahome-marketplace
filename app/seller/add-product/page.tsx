'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

// Wrap the product form inside Suspense to satisfy Next.js 15 compilation rules
export default function AddProductPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading dashboard...</p>
      </div>
    }>
      <AddProductForm />
    </Suspense>
  );
}

const categories = [
  'Apparel', 'Accessories', 'Footwear', 'Beauty & wellness',
  'Home decor', 'Kids & baby', 'Food & drink', 'Paper & novelty',
  'Pets', 'Jewelry', 'Something else'
];

function AddProductForm() {
  const searchParams = useSearchParams();
  const urlBrandName = searchParams.get('brand') || '';

  // Products list states
  const [products, setProducts] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'unpublished' | 'draft'>('all');
  const [brandName, setBrandName] = useState('');
  const [mounted, setMounted] = useState(false);

  // EDIT PRODUCT MODAL STATES (NEW BATCH 5!)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Home decor');
  const [editPrice, setEditPrice] = useState('');
  const [editMinOrder, setEditMinOrder] = useState('');
  const [editStatus, setEditStatus] = useState('published');
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
  const [editCoverPosition, setEditCoverPosition] = useState('50'); // Product image vertical slider
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchBrandProducts = async (bName: string) => {
    setListLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('brand_name', bName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching brand products:', err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (urlBrandName) {
      const decodedBrand = decodeURIComponent(urlBrandName);
      setBrandName(decodedBrand);
      fetchBrandProducts(decodedBrand);
    }
  }, [urlBrandName]);

  const handleToggleStatus = async (productId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: nextStatus })
        .eq('id', productId);

      if (error) throw error;
      
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: nextStatus } : p))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update product status.');
    }
  };

  // 1. OPEN PRODUCT EDIT MODAL & PRE-FILL VALUES
  const handleOpenEditModal = (product: any) => {
    setEditingProduct(product);
    setEditTitle(product.title || '');
    setEditDescription(product.description || '');
    setEditCategory(product.category || 'Home decor');
    setEditPrice(product.price ? product.price.toString() : '');
    setEditMinOrder(product.min_order_amount ? product.min_order_amount.toString() : '');
    setEditStatus(product.status || 'published');
    setEditImageUrls(product.image_url ? product.image_url.split(',') : []);
    setEditCoverPosition(product.image_position || '50');
    setIsEditModalOpen(true);
  };

  // 2. IMAGE RESOLUTION VALIDATOR (2048px or higher)
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

  // 3. SINGLE BUTTON FILE UPLOADER FOR EDIT PANEL
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

      setEditImageUrls((prev) => [...prev, data.publicUrl]);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setEditImageUrls((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // NATIVE HTML5 DRAG & DROP FOR EDIT PANEL
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const updated = [...editImageUrls];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setEditImageUrls(updated);
    setDraggedIndex(null);
  };

  // 4. SUBMIT EDITED PRODUCT DATA TO SUPABASE
  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);

    if (!editTitle || !editPrice || !editMinOrder) {
      alert('Please fill out all required fields.');
      setUpdateLoading(false);
      return;
    }

    try {
      const finalImageString = editImageUrls.join(',');

      const { error } = await supabase
        .from('products')
        .update({
          title: editTitle,
          description: editDescription,
          category: editCategory,
          price: parseFloat(editPrice),
          min_order_amount: parseFloat(editMinOrder),
          status: editStatus,
          image_url: finalImageString || null,
          image_position: editCoverPosition, // Save vertical position
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      alert('Product updated successfully!');
      setIsEditModalOpen(false);
      fetchBrandProducts(brandName); // Reload local list
    } catch (err: any) {
      console.error('Update failed:', err);
      alert('Failed to save changes: ' + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const prodStatus = product.status || 'published'; 
    if (activeTab === 'all') return true;
    return prodStatus.toLowerCase() === activeTab.toLowerCase();
  });

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-7xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        
        {/* HEADER WITH VIEWS LINK & BLACK ADD PRODUCTS BUTTON */}
        <header className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-100 pb-6 gap-4 text-left">
          <div>
            <h2 className="text-3xl font-black text-gray-950 tracking-tight">Products</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your wholesale catalog for {brandName || 'your brand'}.</p>
          </div>
          <div className="flex flex-wrap items-center space-x-3.5 w-full lg:w-auto">
            <Link 
              href={`/brand/${encodeURIComponent(brandName)}?edit=true`}
              className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs py-3 px-4 rounded transition duration-150 text-center"
            >
              ✏️ Edit Store
            </Link>
            <Link 
              href={`/brand/${encodeURIComponent(brandName)}`}
              className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs py-3 px-4 rounded transition duration-150 text-center"
            >
              👁️ View Storefront
            </Link>
            <Link href="/" className="text-sm font-bold text-gray-500 hover:text-gray-800 hover:underline text-center">
              Go to Market
            </Link>
            
            <Link 
              href={`/seller/add-product/new?brand=${encodeURIComponent(brandName)}`}
              className="bg-gray-950 hover:bg-gray-800 text-white font-bold text-xs py-3 px-4 rounded transition duration-150 flex items-center space-x-2 text-center"
            >
              <span>+ Add products</span>
            </Link>
          </div>
        </header>

        {/* FAIRE-STYLE TABS */}
        <div className="flex border-b border-gray-100 mb-8 text-sm font-semibold text-gray-400">
          {(['all', 'published', 'unpublished', 'draft'] as const).map((tab) => {
            const count = products.filter(p => {
              const s = p.status || 'published';
              return tab === 'all' || s.toLowerCase() === tab.toLowerCase();
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 pr-6 border-b-2 transition duration-150 capitalize cursor-pointer ${
                  activeTab === tab 
                    ? 'border-gray-950 text-gray-950 font-bold' 
                    : 'border-transparent hover:text-gray-700'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* PRODUCTS LIST TABLE */}
        {listLoading ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 font-medium">Loading catalog...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto text-left">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-4 pl-2 w-12"><input type="checkbox" className="rounded border-gray-300 text-gray-900 focus:ring-gray-950 h-4 w-4" /></th>
                  <th className="pb-4">Product</th>
                  <th className="pb-4">Wholesale Price</th>
                  <th className="pb-4">Brand Minimum</th>
                  <th className="pb-4 text-center">Status</th>
                  <th className="pb-4 text-center">Actions</th> {/* NEW EDIT ACTIONS COLUMN! */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => {
                  // SAFELY EXTRACT COVER PHOTO OUT OF MULTI IMAGE STRING (FIXES BROKEN IMAGES!)
                  const coverImage = product.image_url ? product.image_url.split(',')[0] : '';
                  return (
                    <tr key={product.id} className="group hover:bg-gray-50/50 transition">
                      <td className="py-4 pl-2">
                        <input type="checkbox" className="rounded border-gray-300 text-gray-900 focus:ring-gray-950 h-4 w-4" />
                      </td>
                      <td className="py-4 flex items-center space-x-4">
                        {coverImage ? (
                          <img 
                            src={coverImage} 
                            alt="" 
                            className="w-12 h-12 object-cover rounded border border-gray-100" 
                            style={{ objectPosition: `50% ${product.image_position || '50'}%` }} // Cover alignment
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-xs">📦</div>
                        )}
                        <span className="font-bold text-gray-800 text-base">{product.title}</span>
                      </td>

                      <td className="py-4 text-sm font-semibold text-gray-900">
                        ₹{product.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-4 text-sm text-gray-500 font-medium">
                        ₹{product.min_order_amount?.toLocaleString('en-IN')} min
                      </td>

                      <td className="py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(product.id, product.status || 'published')}
                          className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer hover:opacity-80 transition ${
                            (product.status || 'published').toLowerCase() === 'published'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}
                        >
                          {product.status || 'published'}
                        </button>
                      </td>

                      {/* EDIT PRODUCT ROW BUTTON */}
                      <td className="py-4 text-center">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-8 max-w-md mx-auto">
            <span className="text-4xl">📦</span>
            <p className="text-gray-500 font-bold mt-4 text-lg">No products found in this tab.</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Click the "+ Add products" button at the top right to list your first item.</p>
            <Link 
              href={`/seller/add-product/new?brand=${encodeURIComponent(brandName)}`}
              className="bg-gray-950 hover:bg-gray-800 text-white font-bold text-sm py-3 px-5 rounded transition duration-150 cursor-pointer inline-block"
            >
              + Add products
            </Link>
          </div>
        )}
      </div>

      {/* ================= EDIT PRODUCT DETAILS MODAL (WITH ACTIVE IMAGE SLIDER + REARRANGE!) ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-white max-w-2xl w-full p-8 rounded-2xl shadow-2xl border border-gray-150 relative max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150 text-left">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold p-2 text-lg cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-2xl font-serif font-semibold text-gray-950 tracking-tight leading-none mb-1">
              Edit Product Listing
            </h2>
            <p className="text-xs text-gray-400 mb-6 font-medium">Modify inventory details, reorder photos, and set positions.</p>

            <form onSubmit={handleUpdateProductSubmit} className="space-y-6">
              
              {/* Product Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20 font-semibold"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Story Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                />
              </div>

              {/* Pricing Rules */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Wholesale Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none bg-gray-50/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Brand Minimum (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMinOrder}
                    onChange={(e) => setEditMinOrder(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none bg-gray-50/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Listing Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none bg-gray-50/20 font-semibold"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* 1-Button Multi Image Editor (BATCH 4!) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Images</label>
                <p className="text-[10px] text-gray-400 mb-4 font-medium">Drag thumbnails to sort. The first photo is your cover image.</p>
                <div className="flex flex-wrap gap-4 items-center">
                  
                  {editImageUrls.length < 8 && (
                    <div className="border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl flex flex-col justify-center items-center text-center bg-gray-50/30 w-24 h-24 relative transition">
                      {uploading ? (
                        <span className="text-[8px] text-gray-400 font-bold uppercase animate-pulse">Uploading...</span>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-lg">📤</span>
                          <p className="text-[8px] text-gray-400 font-bold uppercase">Add Photo</p>
                          <label className="inline-block bg-gray-950 hover:bg-gray-800 text-white font-bold text-[8px] px-2 py-1 rounded cursor-pointer uppercase tracking-widest">
                            Upload
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rearrangeable Images */}
                  {editImageUrls.map((url, index) => (
                    <div 
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`w-24 h-24 rounded-xl overflow-hidden border bg-gray-50 relative group cursor-grab active:cursor-grabbing transition ${
                        draggedIndex === index ? 'opacity-40 scale-95 border-gray-950' : 'border-gray-250 shadow-sm'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 bg-gray-950/75 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none">
                        {index === 0 ? 'Cover 🖼️' : `#${index + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center transition shadow opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* IMAGE FOCAL ALIGNMENT SLIDER FOR PRODUCT (BATCH 5!) */}
              {editImageUrls.length > 0 && (
                <div className="animate-in slide-in-from-top-2 duration-150 pt-2 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                    Adjust Product Image Vertical Position ({editCoverPosition}%)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={editCoverPosition}
                      onChange={(e) => setEditCoverPosition(e.target.value)}
                      className="w-full accent-gray-950 h-2 bg-gray-100 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-500 w-8">{editCoverPosition}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Slide to vertically center your product inside the square aspect container.</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold py-3 px-5 rounded-lg text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading || uploading}
                  className="bg-gray-950 hover:bg-gray-800 text-white font-black py-3 px-5 rounded-lg text-xs transition shadow disabled:bg-gray-200 disabled:cursor-not-allowed cursor-pointer"
                >
                  {updateLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </main>
  );
}
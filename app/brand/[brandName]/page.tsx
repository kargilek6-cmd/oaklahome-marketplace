'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Link from 'next/link';

export default function BrandPage() {
  const { brandName } = useParams();
  const decodedBrandName = brandName ? decodeURIComponent(brandName as string) : '';

  const { user, mounted } = useAuth();
  const { addToCart } = useCart();

  const [brandProfile, setBrandProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'about'>('products');
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // EDIT MODAL STATES
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStory, setEditStory] = useState('');
  const [editValues, setEditValues] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editProfileUrl, setEditProfileUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Fetch brand profile data
  const fetchBrandData = async () => {
    if (!decodedBrandName) return;
    try {
      const { data: bData } = await supabase
        .from('brands')
        .select('*')
        .eq('brand_name', decodedBrandName)
        .maybeSingle();

      setBrandProfile(bData);

      if (bData) {
        setEditStory(bData.brand_story || '');
        setEditValues(bData.brand_values || '');
        setEditYear(bData.established_year || '');
        setEditProfileUrl(bData.profile_photo_url || '');
        setEditCoverUrl(bData.cover_photo_url || '');
      }

      // Fetch products
      const { data: pData, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('brand_name', decodedBrandName);

      if (pError) throw pError;
      setProducts(pData || []);

      // Fetch real buyer reviews for this brand
      const { data: rData } = await supabase
        .from('reviews')
        .select('*')
        .eq('brand_name', decodedBrandName)
        .order('created_at', { ascending: false });

      setReviews(rData || []);

    } catch (err) {
      console.error('Error fetching brand data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandData();
  }, [decodedBrandName]);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined' && brandProfile) {
      const params = new URLSearchParams(window.location.search);
      const isOwner = user?.role === 'SELLER' && user?.brandName === decodedBrandName;
      if (params.get('edit') === 'true' && isOwner) {
        setIsEditModalOpen(true);
      }
    }
  }, [user, decodedBrandName, mounted, brandProfile]);

  const isUserLoggedIn = user !== null;
  const isBrandOwner = mounted && user?.role === 'SELLER' && user?.brandName === decodedBrandName;

  // DYNAMIC RATING CALCULATOR
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : null;

  // Profile Upload handler
  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `profile-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const safeFolder = decodedBrandName.trim().replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filePath = `${safeFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setEditProfileUrl(data.publicUrl);
    } catch (err: any) {
      console.error('Profile upload failed:', err);
      alert('Failed to upload logo: ' + err.message);
    } finally {
      setUploadingProfile(false);
    }
  };

  // Cover Upload handler
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const safeFolder = decodedBrandName.trim().replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filePath = `${safeFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setEditCoverUrl(data.publicUrl);
    } catch (err: any) {
      console.error('Cover upload failed:', err);
      alert('Failed to upload banner: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle saving the edited changes to Supabase
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);

    try {
      const { error } = await supabase
        .from('brands')
        .update({
          profile_photo_url: editProfileUrl || null,
          cover_photo_url: editCoverUrl || null,
          brand_story: editStory || null,
          brand_values: editValues || null,
          established_year: editYear || null,
        })
        .eq('brand_name', decodedBrandName);

      if (error) throw error;

      alert('Storefront updated successfully!');
      setIsEditModalOpen(false);
      fetchBrandData(); 
    } catch (err: any) {
      console.error('Failed to update storefront:', err);
      alert('Failed to update store: ' + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(localSearchQuery.toLowerCase())
  );

  const brandMin = products.length > 0 ? products[0].min_order_amount : 0;

  if (!mounted || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-400 font-medium">Loading storefront...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      
      {/* 1. COVER BANNER */}
      <div className="w-full h-64 bg-gray-150 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
        {brandProfile?.cover_photo_url ? (
          <img src={brandProfile.cover_photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-gray-300">
            <span className="text-4xl">🖼️</span>
            <p className="text-xs font-bold uppercase tracking-wider mt-1">Store banner photo</p>
          </div>
        )}
        <div className="absolute top-6 left-6 z-20">
          <Link href="/" className="bg-white/95 hover:bg-white text-gray-900 font-bold text-xs px-4 py-2.5 rounded-full shadow-md transition flex items-center space-x-1">
            <span>←</span> <span>Back to Market</span>
          </Link>
        </div>
      </div>

      {/* 2. OVERLAPPING PROFILE SECTION (FIXED ALIGNMENT & CONTRAST) */}
      <div className="max-w-7xl mx-auto px-6 relative pb-12">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between -mt-12 gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            
            {/* Overlapping Circle Logo */}
            <div className="w-24 h-24 bg-white border-4 border-white rounded-full overflow-hidden shadow-lg flex items-center justify-center flex-shrink-0 z-10">
              {brandProfile?.profile_photo_url ? (
                <img src={brandProfile.profile_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-gray-300">👤</span>
              )}
            </div>

            {/* Brand details container with clear margins */}
            <div className="flex flex-col space-y-1.5 pt-2 sm:pt-4">
              <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight leading-none">
                {decodedBrandName}
              </h1>
              
              {/* Dynamic Ratings Loader (Higher Contrast & Spacious) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-gray-600 font-semibold leading-none">
                <span>India</span>
                <span className="text-gray-300">•</span>
                {averageRating ? (
                  <div className="flex items-center space-x-1">
                    <span className="text-amber-500 text-base">★</span>
                    <span className="text-gray-950 font-black">{averageRating}</span>
                    <span className="text-gray-500 font-medium">({totalReviews} reviews)</span>
                  </div>
                ) : (
                  <span className="text-gray-500 font-medium">No reviews yet</span>
                )}
              </div>
              
              <div className="pt-1">
                <span className="text-xs text-gray-700 font-bold uppercase tracking-wider bg-gray-50 border border-gray-150 rounded-md px-3 py-1.5 inline-block">
                  ₹{brandMin?.toLocaleString('en-IN')} Minimum Order
                </span>
              </div>
            </div>
          </div>

          {/* Conditional CTAs Panel */}
          <div className="flex space-x-3 pb-2 w-full sm:w-auto justify-center sm:justify-end">
            {isBrandOwner ? (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="w-full sm:w-auto bg-gray-950 hover:bg-gray-800 text-white font-black text-xs px-6 py-3.5 rounded-xl transition shadow cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>✏️</span> <span>Edit Store Details</span>
              </button>
            ) : (
              <>
                <button className="flex-1 sm:flex-none border border-gray-200 hover:bg-gray-50 font-bold text-xs px-5 py-3 rounded-xl transition cursor-not-allowed">
                  💬 Message brand
                </button>
                <button className="flex-1 sm:flex-none bg-gray-950 hover:bg-gray-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow cursor-pointer">
                  Follow Brand
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3. OAKLAHOME MARKET EVENT ALERT BANNER */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 mt-10 text-left flex justify-between items-center text-sm font-semibold text-amber-800">
          <div className="flex items-center space-x-2">
            <span>✨</span>
            <p><strong>{decodedBrandName}</strong> is participating in Oaklahome Markets. Free delivery on orders over ₹15,000.</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-white border border-amber-100 px-3 py-1.5 rounded-full cursor-pointer hover:bg-amber-50 transition">
            + Add to List
          </span>
        </div>

        {/* 4. TABS BAR & SEARCH INNER STOREFRONT */}
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-100 mt-12 mb-8 text-sm font-bold text-gray-400 gap-4">
          <div className="flex space-x-8 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('products')}
              className={`pb-4 border-b-2 transition cursor-pointer ${
                activeTab === 'products' ? 'border-gray-950 text-gray-950 font-black' : 'border-transparent hover:text-gray-600'
              }`}
            >
              All products ({products.length})
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={`pb-4 border-b-2 transition cursor-pointer ${
                activeTab === 'about' ? 'border-gray-950 text-gray-950 font-black' : 'border-transparent hover:text-gray-600'
              }`}
            >
              About Brand
            </button>
          </div>

          {activeTab === 'products' && (
            <div className="relative w-full md:w-64 mb-3 md:mb-0 text-left">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">🔍</span>
              <input
                type="text"
                placeholder={`Search ${decodedBrandName}...`}
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="w-full border border-gray-200 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-gray-400 font-medium"
              />
            </div>
          )}
        </div>

        {/* 5. TAB VIEW INNER PANELS */}
        <div className="mt-8 text-left">
          {activeTab === 'products' ? (
            filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {product.image_url && (
                        <Link href={`/product/${product.id}`} className="relative block w-full h-56 bg-gray-50 cursor-pointer">
                          <img 
                            src={product.image_url} 
                            alt={product.title} 
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      )}
                      <div className="p-5">
                        {isUserLoggedIn ? (
                          <>
                            <Link href={`/product/${product.id}`} className="block text-xl font-bold text-gray-950 hover:underline">
                              {product.title}
                            </Link>
                            <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                              {product.description}
                            </p>
                            
                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                              <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                                  Wholesale Price
                                </p>
                                <p className="text-2xl font-black text-gray-950">
                                  ₹{product.price ? product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                                  Brand Min. Order
                                </p>
                                <p className="text-base font-bold text-gray-700">
                                  ₹{product.min_order_amount ? product.min_order_amount.toLocaleString('en-IN') : '0'} min
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-baseline mb-3">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">
                                Pricing Protected 🔒
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-400 blur-[2px] select-none">{product.title}</h3>
                            <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                              {product.description}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      {isUserLoggedIn ? (
                        <button
                          onClick={() => {
                            addToCart(product);
                            alert(`Added "${product.title}" to cart!`);
                          }}
                          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs py-3 rounded-lg transition duration-150 cursor-pointer"
                        >
                          + Add to Cart
                        </button>
                      ) : (
                        <Link
                          href="/"
                          className="block text-center w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs py-3 rounded-lg transition duration-150"
                        >
                          Login to view pricing
                        </Link>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              /* EMPTY STOREFRONT WITH CONDITIONAL "+ ADD PRODUCTS" CALL FOR BRAND OWNER */
              <div className="py-20 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 p-8 max-w-md mx-auto">
                <span className="text-3xl">📦</span>
                <p className="text-gray-500 font-bold text-lg mt-4">No products found</p>
                <p className="text-gray-400 text-sm mt-1 font-medium">This brand storefront is currently empty.</p>
                {isBrandOwner && (
                  <Link 
                    href={`/seller/add-product/new?brand=${encodeURIComponent(decodedBrandName)}`}
                    className="mt-6 inline-block bg-gray-950 hover:bg-gray-800 text-white font-black text-xs py-3.5 px-6 rounded-xl transition shadow cursor-pointer"
                  >
                    + Add products
                  </Link>
                )}
              </div>
            )
          ) : (
            /* About Brand Story Panel + Real Buyer Reviews List */
            <div className="max-w-3xl space-y-12 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wider">Our Story</h3>
                <p className="text-sm text-gray-600 leading-relaxed mt-4 whitespace-pre-wrap">
                  {brandProfile?.brand_story || 'This brand is setting up their story profile.'}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wider">Brand Values</h3>
                <p className="text-sm text-gray-600 mt-4 font-semibold">
                  🌿 {brandProfile?.brand_values || 'Organic, Handmade, Sustainably sourced.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100 text-sm font-semibold text-gray-800">
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Year Established</p>
                  <p className="mt-1">{brandProfile?.established_year || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Primary category</p>
                  <p className="mt-1">{brandProfile?.category || 'General Wholesale'}</p>
                </div>
              </div>

              {/* FAIRE STYLE REAL RETAILER REVIEWS LIST */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 pb-3 uppercase tracking-wider">
                  Retailer Reviews ({totalReviews})
                </h3>

                {reviews.length > 0 ? (
                  <div className="mt-6 space-y-6 divide-y divide-gray-100">
                    {reviews.map((rev) => {
                      const rDate = new Date(rev.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      });
                      return (
                        <div key={rev.id} className="pt-6 first:pt-0">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-800">{rev.buyer_name}</span>
                            <span className="text-xs text-gray-400">{rDate}</span>
                          </div>
                          <div className="text-amber-500 font-bold text-xs mt-1">
                            {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                          </div>
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                            "{rev.comment}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-4 font-medium">No customer reviews yet. Orders completed will show real buyer reviews here.</p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ================= 6. EDIT STORE DETAILS MODAL ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-white max-w-lg w-full p-8 rounded-2xl shadow-2xl border border-gray-150 relative max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150 text-left">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold p-2 text-lg cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-2xl font-serif font-semibold text-gray-950 tracking-tight leading-none mb-2">
              Edit Storefront Details
            </h2>
            <p className="text-xs text-gray-400 mb-6 font-medium">Update your public brand cover logo and profile values.</p>

            <form onSubmit={handleSaveChanges} className="space-y-5">
              
              {/* Profile Logo Uploader */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Profile Logo Photo</label>
                {uploadingProfile ? (
                  <div className="bg-gray-50 border rounded-xl py-3 px-4 text-xs font-bold text-gray-400 uppercase animate-pulse">Uploading file...</div>
                ) : editProfileUrl ? (
                  <div className="flex items-center space-x-4 border rounded-xl p-3 bg-gray-50/20">
                    <img src={editProfileUrl} alt="" className="w-12 h-12 rounded-full object-cover border" />
                    <button type="button" onClick={() => setEditProfileUrl('')} className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer">
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <div className="flex border rounded-xl bg-gray-50/30 overflow-hidden">
                    <label className="bg-gray-950 hover:bg-gray-800 text-white font-bold text-[10px] px-4 py-3 cursor-pointer uppercase tracking-widest transition">
                      Choose Logo File
                      <input type="file" accept="image/*" onChange={handleProfileUpload} className="hidden" />
                    </label>
                    <span className="px-4 py-3 text-xs text-gray-400 font-semibold truncate">Upload profile logo</span>
                  </div>
                )}
              </div>

              {/* Cover Banner Uploader */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Cover Banner Photo</label>
                {uploadingCover ? (
                  <div className="bg-gray-50 border rounded-xl py-3 px-4 text-xs font-bold text-gray-400 uppercase animate-pulse">Uploading file...</div>
                ) : editCoverUrl ? (
                  <div className="flex items-center space-x-4 border rounded-xl p-3 bg-gray-50/20">
                    <img src={editCoverUrl} alt="" className="w-20 h-10 rounded object-cover border" />
                    <button type="button" onClick={() => setEditCoverUrl('')} className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer">
                      Remove Banner
                    </button>
                  </div>
                ) : (
                  <div className="flex border rounded-xl bg-gray-50/30 overflow-hidden">
                    <label className="bg-gray-950 hover:bg-gray-800 text-white font-bold text-[10px] px-4 py-3 cursor-pointer uppercase tracking-widest transition">
                      Choose Banner File
                      <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                    </label>
                    <span className="px-4 py-3 text-xs text-gray-400 font-semibold truncate">Upload cover banner</span>
                  </div>
                )}
              </div>

              {/* Brand Story */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Brand Story</label>
                <textarea
                  rows={4}
                  placeholder="Describe your brand's heritage or journey..."
                  value={editStory}
                  onChange={(e) => setEditStory(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                />
              </div>

              {/* Brand Values */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Brand Values</label>
                <input
                  type="text"
                  placeholder="e.g., Handmade, Eco-friendly"
                  value={editValues}
                  onChange={(e) => setEditValues(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                />
              </div>

              {/* Year Established */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Year Established</label>
                <input
                  type="text"
                  placeholder="e.g., 2023"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  className="w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                />
              </div>

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
                  disabled={updateLoading || uploadingProfile || uploadingCover}
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
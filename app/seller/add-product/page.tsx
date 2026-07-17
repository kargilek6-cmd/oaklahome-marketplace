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

  // INLINE PRICE EDITOR STATES
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [tempPriceValue, setTempPriceValue] = useState('');

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

  // 1. INLINE PRICE EDITOR TRIGGER
  const handleStartPriceEdit = (productId: number, currentPrice: number) => {
    setEditingPriceId(productId);
    setTempPriceValue(currentPrice ? currentPrice.toString() : '');
  };

  // 2. SAVE INLINE PRICE TO SUPABASE (Saves instantly on blur or Enter!)
  const handleSaveInlinePrice = async (productId: number) => {
    const parsedPrice = parseFloat(tempPriceValue);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('Please enter a valid numeric price.');
      setEditingPriceId(null);
      return;
    }

    try {
      // Optimistic Local State Update for snappiness
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, price: parsedPrice } : p))
      );
      setEditingPriceId(null);

      // Async database write
      const { error } = await supabase
        .from('products')
        .update({ price: parsedPrice })
        .eq('id', productId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to save inline price:', err);
      alert('Failed to save price changes.');
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
          <div className="overflow-x-auto text-left animate-in fade-in">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-4 pl-2 w-12"><input type="checkbox" className="rounded border-gray-300 text-gray-950 h-4 w-4" /></th>
                  <th className="pb-4">Product</th>
                  <th className="pb-4">Wholesale Price (Click to Edit)</th> 
                  <th className="pb-4 text-center">Status</th>
                  <th className="pb-4 text-center">Actions</th> 
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => {
                  const coverImage = product.image_url ? product.image_url.split(',')[0] : '';
                  return (
                    <tr key={product.id} className="group hover:bg-gray-50/50 transition">
                      <td className="py-4 pl-2">
                        <input type="checkbox" className="rounded border-gray-300 text-gray-950 h-4 w-4" />
                      </td>
                      
                      {/* Clickable Product Name leading to the new Edit Page */}
                      <td className="py-4 flex items-center space-x-4">
                        {coverImage ? (
                          <Link 
                            href={`/seller/add-product/edit?brand=${encodeURIComponent(brandName)}&id=${product.id}`}
                            className="w-12 h-12 rounded overflow-hidden border border-gray-100 flex-shrink-0 cursor-pointer block"
                          >
                            <img 
                              src={coverImage} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              style={{ objectPosition: `50% ${product.image_position || '50'}%` }} 
                            />
                          </Link>
                        ) : (
                          <div className="w-12 h-12 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-xs">📦</div>
                        )}
                        <Link 
                          href={`/seller/add-product/edit?brand=${encodeURIComponent(brandName)}&id=${product.id}`}
                          className="font-bold text-gray-800 text-base hover:underline hover:text-blue-600 transition cursor-pointer"
                        >
                          {product.title}
                        </Link>
                      </td>

                      {/* INLINE WHOLESALE PRICE INPUT EDITOR */}
                      <td className="py-4 font-semibold text-gray-900">
                        {editingPriceId === product.id ? (
                          <input 
                            type="number"
                            step="0.01"
                            value={tempPriceValue}
                            onChange={(e) => setTempPriceValue(e.target.value)}
                            onBlur={() => handleSaveInlinePrice(product.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlinePrice(product.id);
                            }}
                            className="border border-gray-300 rounded px-2.5 py-1 text-sm font-semibold max-w-[5rem] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 animate-in zoom-in-95 duration-100 text-left"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => handleStartPriceEdit(product.id, product.price)}
                            className="font-bold text-gray-950 hover:bg-gray-50 px-2.5 py-1 border border-transparent hover:border-gray-200 rounded transition text-left cursor-pointer"
                            title="Click to quickly update price"
                          >
                            ₹{product.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ✏️
                          </button>
                        )}
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

                      {/* Edit row button routing directly to new edit page */}
                      <td className="py-4 text-center">
                        <Link
                          href={`/seller/add-product/edit?brand=${encodeURIComponent(brandName)}&id=${product.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          ✏️ Edit
                        </Link>
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
    </main>
  );
}
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

function AddProductForm() {
  const searchParams = useSearchParams();
  
  // Extract the brand name from the URL query parameter (e.g. ?brand=EcoWear)
  const urlBrandName = searchParams.get('brand') || '';

  // Products list states
  const [products, setProducts] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'unpublished' | 'draft'>('all');
  const [brandName, setBrandName] = useState('');
  const [mounted, setMounted] = useState(false);

  // Fetch only this brand's products
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

  // Handle toggling status directly in the list
  const handleToggleStatus = async (productId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: nextStatus })
        .eq('id', productId);

      if (error) throw error;
      
      // Update local state instantly
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: nextStatus } : p))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update product status.');
    }
  };

  // Dynamic filter for the tab system
  const filteredProducts = products.filter((product) => {
    const prodStatus = product.status || 'published'; // Fallback for older products with null status
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
      {/* FULL-WIDTH PRODUCTS CATALOG CONTAINER */}
      <div className="max-w-7xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        
        {/* HEADER WITH BLACK "ADD PRODUCTS" DROPDOWN BUTTON */}
        <header className="mb-8 flex justify-between items-center border-b border-gray-100 pb-6">
          <div>
            <h2 className="text-3xl font-black text-gray-950 tracking-tight">Products</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your wholesale catalog for {brandName || 'your brand'}.</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-sm font-bold text-gray-500 hover:text-gray-800 mr-2 hover:underline">
              Go to Market
            </Link>
            
            {/* BLACK FAIRE-STYLE ADD PRODUCTS BUTTON */}
            <Link 
              href={`/seller/add-product/new?brand=${encodeURIComponent(brandName)}`}
              className="bg-gray-950 hover:bg-gray-800 text-white font-bold text-sm py-3 px-5 rounded transition duration-150 flex items-center space-x-2"
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
                className={`pb-3 pr-6 border-b-2 transition duration-150 capitalize ${
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-4 pl-2 w-12"><input type="checkbox" className="rounded border-gray-300 text-gray-900 focus:ring-gray-950 h-4 w-4" /></th>
                  <th className="pb-4">Product</th>
                  <th className="pb-4">Wholesale Price</th>
                  <th className="pb-4">Brand Minimum</th>
                  <th className="pb-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="group hover:bg-gray-50/50 transition">
                    <td className="py-4 pl-2">
                      <input type="checkbox" className="rounded border-gray-300 text-gray-900 focus:ring-gray-950 h-4 w-4" />
                    </td>
                    {/* Title & Image */}
                    <td className="py-4 flex items-center space-x-4">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-12 h-12 object-cover rounded border border-gray-100" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-xs">📦</div>
                      )}
                      <span className="font-bold text-gray-800 text-base">{product.title}</span>
                    </td>

                    {/* Wholesale Price */}
                    <td className="py-4 text-sm font-semibold text-gray-900">
                      ₹{product.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Min. Order Amount */}
                    <td className="py-4 text-sm text-gray-500 font-medium">
                      ₹{product.min_order_amount?.toLocaleString('en-IN')} min
                    </td>

                    {/* Clickable Status Badge */}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-8">
            <span className="text-4xl">📦</span>
            <p className="text-gray-500 font-bold mt-4 text-lg">No products found in this tab.</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Click the "+ Add products" button at the top right to list your first item.</p>
            <Link 
              href={`/seller/add-product/new?brand=${encodeURIComponent(brandName)}`}
              className="bg-gray-950 hover:bg-gray-800 text-white font-bold text-sm py-3 px-5 rounded transition duration-150"
            >
              + Add products
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
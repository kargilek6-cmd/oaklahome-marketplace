'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, mounted } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'materials' | 'shipping'>('description');
  
  // Hover Magnifier Coordinates
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ display: 'none' });

  useEffect(() => {
    async function fetchProductDetails() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        setProduct(data);
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProductDetails();
  }, [id]);

  // Image Magnify Hover Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${product?.image_url})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: '250%'
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' });
  };

  const isUserLoggedIn = mounted && user !== null;

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center text-center p-6">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-2xl font-black text-gray-950 mt-6">Product Not Found</h2>
        <p className="text-gray-500 mt-2">This listing might have been removed by the brand.</p>
        <Link href="/" className="mt-6 bg-gray-950 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800 transition">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const msrpPrice = product.price ? product.price * 2 : 0;
  const totalPrice = product.price ? product.price * quantity : 0;

  // Estimated delivery range 6-9 days out
  const getDeliveryDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const dateMin = new Date();
    dateMin.setDate(dateMin.getDate() + 6);
    const dateMax = new Date();
    dateMax.setDate(dateMax.getDate() + 9);
    return `${dateMin.toLocaleDateString('en-IN', options)} – ${dateMax.toLocaleDateString('en-IN', options)}`;
  };

  return (
    <main className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Breadcrumb */}
        <nav className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-10 text-left">
          <Link href="/" className="hover:text-gray-900 transition">Market</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{product.category || 'Product'}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-950 font-bold">{product.title}</span>
        </nav>

        {/* Dynamic Split Screen Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* ================= LEFT SIDE: MEDIA GALLERY WITH HOVER ZOOM ================= */}
          <div className="flex gap-4">
            
            {/* Left vertical dummy thumbnail strip */}
            <div className="flex flex-col space-y-3 w-16 flex-shrink-0">
              {[...Array(4)].map((_, index) => (
                <div 
                  key={index}
                  className={`w-16 h-16 rounded-lg overflow-hidden border cursor-pointer transition ${
                    index === 0 ? 'border-gray-900 shadow-sm' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            {/* Main Interactive Product Image Container */}
            <div 
              className="flex-1 h-[500px] border border-gray-150 rounded-2xl overflow-hidden bg-gray-50/50 relative cursor-zoom-in"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <img 
                src={product.image_url} 
                alt={product.title} 
                className="w-full h-full object-cover"
              />
              
              {/* Dynamic Overlay Magnifier Viewport */}
              <div 
                className="absolute inset-0 pointer-events-none bg-no-repeat rounded-2xl"
                style={zoomStyle}
              />
            </div>

          </div>

          {/* ================= RIGHT SIDE: CONVERSION PANEL ================= */}
          <div className="text-left space-y-6">
            
            {/* Brand Header */}
            <div>
              <Link 
                href={`/brand/${encodeURIComponent(product.brand_name)}`}
                className="text-sm font-bold text-gray-500 uppercase tracking-widest hover:text-blue-600 hover:underline transition"
              >
                {product.brand_name}
              </Link>
              <h1 className="text-3xl font-black text-gray-950 tracking-tight mt-1">
                {product.title}
              </h1>
              <p className="text-sm text-gray-400 font-semibold mt-1">Swoosh, India • 4.8 ★ (120 reviews)</p>
            </div>

            <hr className="border-gray-100" />

            {/* B2B Price protection gate */}
            {isUserLoggedIn ? (
              <div className="space-y-4">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-black text-gray-950">
                    ₹{product.price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-gray-400 font-medium line-through">
                    MSRP ₹{msrpPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                    50% Wholesale Margin
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    📦 ₹{product.min_order_amount?.toLocaleString('en-IN')} Brand Minimum
                  </span>
                  <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    🚚 Est. Delivery: {getDeliveryDateRange()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 text-left space-y-3">
                <h3 className="text-base font-bold text-blue-900">Wholesale pricing is protected 🔒</h3>
                <p className="text-sm text-blue-700/80 leading-relaxed font-medium">
                  Retail store pricing is hidden. Sign up to unlock bulk discount structures and place orders.
                </p>
                <Link 
                  href="/"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition duration-150 shadow"
                >
                  Join as Retailer
                </Link>
              </div>
            )}

            <hr className="border-gray-100" />

            {/* Selection Options (Dropdowns) */}
            {isUserLoggedIn && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Case size</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20 font-semibold cursor-pointer">
                    <option>Case of 1</option>
                    <option disabled>Case of 6 (Out of stock)</option>
                    <option disabled>Case of 12 (Out of stock)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Standard color</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/20 font-semibold cursor-pointer">
                    <option>Walnut Brown / Default</option>
                  </select>
                </div>
              </div>
            )}

            {/* Quantity Controller & Dynamic Button */}
            {isUserLoggedIn && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-500 uppercase">Set wholesale quantity</label>
                <div className="flex gap-4">
                  {/* Square design Faire Quantity boxes */}
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 h-14">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-12 h-full text-gray-600 hover:bg-gray-100 font-bold active:scale-95 transition text-lg cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-5 font-bold text-gray-950 text-base">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-12 h-full text-gray-600 hover:bg-gray-100 font-bold active:scale-95 transition text-lg cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart button recalculating total live */}
                  <button
                    onClick={() => {
                      for (let i = 0; i < quantity; i++) {
                        addToCart(product);
                      }
                      alert(`Added ${quantity} of "${product.title}" to cart!`);
                      router.push('/cart');
                    }}
                    className="flex-grow h-14 bg-gray-950 hover:bg-gray-800 text-white font-black text-sm rounded-xl transition duration-150 active:scale-98 shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Add to cart</span>
                    <span className="opacity-40">•</span>
                    <span>₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </button>
                </div>
              </div>
            )}

            <hr className="border-gray-100" />

            {/* Toggling Custom Smooth Accordion Dropdowns */}
            <div className="space-y-3">
              {/* Dropdown 1 */}
              <div className="border border-gray-150 rounded-xl overflow-hidden">
                <button 
                  onClick={() => setActiveTab(activeTab === 'description' ? 'description' : 'description')}
                  className="w-full bg-gray-50/50 p-4 text-sm font-bold text-gray-800 text-left flex justify-between items-center"
                >
                  <span>Product description</span>
                  <span className="text-gray-400">▾</span>
                </button>
                <div className="p-4 bg-white text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                  {product.description || 'No description provided by seller.'}
                </div>
              </div>

              {/* Dropdown 2 */}
              <div className="border border-gray-150 rounded-xl overflow-hidden">
                <button 
                  onClick={() => setActiveTab(activeTab === 'materials' ? 'description' : 'materials')}
                  className="w-full bg-gray-50/50 p-4 text-sm font-bold text-gray-800 text-left flex justify-between items-center"
                >
                  <span>Materials & Details</span>
                  <span className="text-gray-400">▾</span>
                </button>
                {activeTab === 'materials' && (
                  <div className="p-4 bg-white text-sm text-gray-600 leading-relaxed border-t border-gray-100 space-y-2">
                    <p>✨ <strong>B2B Standard Material:</strong> Eco-sourced raw natural fibers & organic binders.</p>
                    <p>✨ <strong>Country of Manufacture:</strong> Handcrafted in Swoosh, India.</p>
                    <p>✨ <strong>Commercial Packing:</strong> Sold inside cardboard protective cases with individual dividers.</p>
                  </div>
                )}
              </div>

              {/* Dropdown 3 */}
              <div className="border border-gray-150 rounded-xl overflow-hidden">
                <button 
                  onClick={() => setActiveTab(activeTab === 'shipping' ? 'description' : 'shipping')}
                  className="w-full bg-gray-50/50 p-4 text-sm font-bold text-gray-800 text-left flex justify-between items-center"
                >
                  <span>Shipping & Lead Times</span>
                  <span className="text-gray-400">▾</span>
                </button>
                {activeTab === 'shipping' && (
                  <div className="p-4 bg-white text-sm text-gray-600 leading-relaxed border-t border-gray-100 space-y-2 animate-in slide-in-from-top-1 duration-150">
                    <p>⏰ <strong>Lead Time:</strong> Brand normally ships your package within 3–4 business days.</p>
                    <p>📦 <strong>Fulfillment Carriers:</strong> Dispatched via top commercial domestic carriers with standard parcel protection insurance.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-4 pt-4 text-xs font-bold text-gray-600 uppercase tracking-widest">
              <button className="flex-1 border border-gray-200 hover:bg-gray-50 py-3.5 px-4 rounded-xl text-center transition cursor-not-allowed">
                💬 Message brand
              </button>
              <Link 
                href={`/brand/${encodeURIComponent(product.brand_name)}`}
                className="flex-1 border border-gray-200 hover:bg-gray-50 py-3.5 px-4 rounded-xl text-center transition"
              >
                🛍️ View Storefront
              </Link>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
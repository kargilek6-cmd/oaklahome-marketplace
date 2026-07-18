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
  const [brandMin, setBrandMin] = useState<number>(0); 
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'materials' | 'shipping'>('description');
  
  // Gallery state holding list of all uploaded product photos
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // INTERACTIVE B2B VARIANT STATES
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  // INCHES vs CM Unit Toggle state (Matches premium paintings storefronts!)
  const [unit, setUnit] = useState<'IN' | 'CM'>('IN');

  // Dynamic Image Dimensions / Aspect Ratio Analyzer
  const [aspectType, setAspectType] = useState<'portrait' | 'landscape' | 'square'>('portrait');
  const [suggestedSizes, setSuggestedSizes] = useState<string[]>([]);

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

        if (data) {
          setImages(data.image_url ? data.image_url.split(',') : []);
          
          // Force standard Art selections if product is under Home decor -> Paintings
          const isPainting = data.category === 'Home decor' && data.sub_category === 'Paintings';

          if (isPainting) {
            const paperFormats = ['Art Paper', 'Canvas'];
            const paintSizes = ['8x10in', '11x14in', '16x20in', '18x24in', '24x36in', '36x48in', '48x64in', '52x70in', '60x80in'];
            
            setAvailableFormats(paperFormats);
            setAvailableSizes(paintSizes);
            setSelectedFormat('Art Paper');
            setSelectedSize('8x10in');
          } else {
            // Standard parse format and size lists from database (Default Fallback)
            const formList = data.formats ? data.formats.split(',') : [];
            const sizeList = data.sizes ? data.sizes.split(',') : [];
            
            setAvailableFormats(formList);
            setAvailableSizes(sizeList);

            if (formList.length > 0) setSelectedFormat(formList[0]);
            if (sizeList.length > 0) setSelectedSize(sizeList[0]);
          }

          // Fetch parent Brand details to load its global Minimum Order Limit
          const { data: bData } = await supabase
            .from('brands')
            .select('min_order_amount')
            .eq('brand_name', data.brand_name)
            .maybeSingle();

          setBrandMin(bData?.min_order_amount || 0);
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProductDetails();
  }, [id]);

  // DYNAMIC IMAGE ASPECT-RATIO READER (Runs whenever the active display picture switches)
  useEffect(() => {
    const activePhoto = images[activeImageIndex];
    if (!activePhoto) return;

    const img = new Image();
    img.src = activePhoto;
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = w / h;

      let type: 'portrait' | 'landscape' | 'square' = 'portrait';
      if (Math.abs(ratio - 1) < 0.06) {
        type = 'square';
      } else if (ratio > 1) {
        type = 'landscape';
      } else {
        type = 'portrait';
      }
      setAspectType(type);

      // standard ratios of standard sizes (In Portrait format):
      const sizesWithRatios = [
        { name: '8x10in', r: 0.8 },      // 4:5
        { name: '11x14in', r: 0.785 },   // ~11:14
        { name: '16x20in', r: 0.8 },      // 4:5
        { name: '18x24in', r: 0.75 },     // 3:4
        { name: '24x36in', r: 0.667 },    // 2:3
        { name: '36x48in', r: 0.75 },     // 3:4
        { name: '48x64in', r: 0.75 },     // 3:4
        { name: '52x70in', r: 0.742 },    // ~3:4
        { name: '60x80in', r: 0.75 }      // 3:4
      ];

      // Filter standard sizes that fall within acceptable aspect threshold offsets
      const matches: string[] = [];
      sizesWithRatios.forEach((sz) => {
        let sizeRatio = sz.r;
        if (type === 'landscape') {
          sizeRatio = 1 / sz.r; // invert calculations for landscape matches
        } else if (type === 'square') {
          sizeRatio = 1.0;
        }

        const difference = Math.abs(ratio - sizeRatio);
        if (difference < 0.08) {
          matches.push(sz.name);
        }
      });

      // Safe fallback if ratio lies outside standard limits: highlight the closest match
      if (matches.length === 0) {
        let closestSize = sizesWithRatios[0].name;
        let smallestDiff = 999;
        sizesWithRatios.forEach((sz) => {
          let sizeRatio = sz.r;
          if (type === 'landscape') sizeRatio = 1 / sz.r;
          if (type === 'square') sizeRatio = 1.0;
          
          const difference = Math.abs(ratio - sizeRatio);
          if (difference < smallestDiff) {
            smallestDiff = difference;
            closestSize = sz.name;
          }
        });
        matches.push(closestSize);
      }

      setSuggestedSizes(matches);
    };
  }, [images, activeImageIndex]);

  // Display size labels dynamically according to orientation / CM/IN selections
  const getDisplaySizeLabel = (baseSize: string) => {
    let orientedSize = baseSize;

    if (aspectType === 'landscape') {
      // Swaps 8x10in -> 10x8in
      const parts = baseSize.replace('in', '').split('x');
      if (parts.length === 2) {
        orientedSize = `${parts[1]}x${parts[0]}in`;
      }
    } else if (aspectType === 'square') {
      // Maps standard portrait indexes directly into square layout dimensions
      const squareMap: { [key: string]: string } = {
        '8x10in': '12x12in',
        '11x14in': '16x16in',
        '16x20in': '20x20in',
        '18x24in': '24x24in',
        '24x36in': '30x30in',
        '36x48in': '36x36in',
        '48x64in': '40x40in',
        '52x70in': '48x48in',
        '60x80in': '60x60in',
      };
      orientedSize = squareMap[baseSize] || baseSize;
    }

    if (unit === 'IN') {
      return orientedSize;
    }

    // Convert Inches to Centimeters (Inches * 2.54 Rounded)
    const pattern = orientedSize.match(/(\d+)x(\d+)/);
    if (pattern && pattern.length === 3) {
      const wIn = parseInt(pattern[1], 10);
      const hIn = parseInt(pattern[2], 10);
      const wCm = Math.round(wIn * 2.54);
      const hCm = Math.round(hIn * 2.54);
      return `${wCm}x${hCm}cm`;
    }

    return orientedSize;
  };

  // Image Magnify Hover Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${images[activeImageIndex]})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: '250%'
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' });
  };

  const isUserLoggedIn = mounted && user !== null;
  const isBrandOwner = mounted && user?.role === 'SELLER' && user?.brandName === product?.brand_name;

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

  const activePhoto = images[activeImageIndex] || '';
  const totalPrice = product.price ? product.price * quantity : 0;
  const isPainting = product.category === 'Home decor' && product.sub_category === 'Paintings';

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
        
        {/* Breadcrumb Navigation */}
        <nav className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-10 text-left">
          <Link href="/" className="hover:text-gray-900 transition">Market</Link>
          <span className="mx-2">/</span>
          <span>{product.category || 'Product'}</span>
          {product.sub_category && (
            <>
              <span className="mx-2">/</span>
              <span>{product.sub_category}</span>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-gray-950 font-bold">{product.title}</span>
        </nav>

        {/* Dynamic Split Screen Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* ================= LEFT SIDE: DYNAMIC MULTI-IMAGE GALLERY WITH HOVER ZOOM ================= */}
          <div className="flex gap-4">
            
            {/* Left vertical thumbnail strip */}
            <div className="flex flex-col space-y-3 w-16 flex-shrink-0">
              {images.map((url, index) => (
                <button 
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border transition cursor-pointer ${
                    activeImageIndex === index ? 'border-gray-900 shadow-sm ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Interactive Product Image Container (Perfect Square) */}
            <div 
              className="flex-1 aspect-square border border-gray-150 rounded-2xl overflow-hidden bg-gray-50/50 relative cursor-zoom-in"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {activePhoto ? (
                <img 
                  src={activePhoto} 
                  alt={product.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📦 No photo available</div>
              )}
              
              {/* Dynamic Overlay Viewport */}
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
              <h1 className="text-3xl font-black text-gray-950 tracking-tight mt-1 animate-in fade-in duration-200">
                {product.title}
              </h1>
              <p className="text-sm text-gray-400 font-semibold mt-1">Swoosh, India • 4.8 ★ (120 reviews)</p>
            </div>

            <hr className="border-gray-100" />

            {/* Price protection check */}
            {isUserLoggedIn ? (
              <div className="space-y-4">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-black text-gray-950">
                    ₹{product.price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                    Wholesale Price
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    📦 ₹{brandMin ? brandMin.toLocaleString('en-IN') : '0'} Brand Minimum
                  </span>
                  <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    🌿 Est. Delivery: {getDeliveryDateRange()}
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

            {/* DYNAMIC VARIANT SELECTIONS */}
            {isUserLoggedIn && (
              <div className="space-y-6 animate-in fade-in">
                
                {/* 1. Format Button Pill Selector (Art Paper & Canvas) */}
                {availableFormats.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                      Format ({availableFormats.length})
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {availableFormats.map((fmt) => {
                        const isSelected = selectedFormat === fmt;
                        return (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setSelectedFormat(fmt)}
                            className={`px-5 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                : 'border-gray-200 hover:border-gray-400 text-gray-700 bg-white'
                            }`}
                          >
                            {fmt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Sizes Grid Selector with Unit Toggle & Suggestion Badging */}
                {availableSizes.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center max-w-md">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Size ({availableSizes.length})
                      </label>
                      
                      {/* Metric Toggle Segment */}
                      {isPainting && (
                        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 scale-90">
                          <button
                            type="button"
                            onClick={() => setUnit('IN')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                              unit === 'IN' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            IN
                          </button>
                          <button
                            type="button"
                            onClick={() => setUnit('CM')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                              unit === 'CM' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            CM
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3.5 max-w-md">
                      {availableSizes.map((sz) => {
                        const isSelected = selectedSize === sz;
                        const isSuggested = isPainting && suggestedSizes.includes(sz);
                        const labelText = getDisplaySizeLabel(sz);

                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(sz)}
                            className={`py-3.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center relative ${
                              isSelected 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md font-black' 
                                : 'border-gray-200 hover:border-gray-400 text-gray-600 bg-white font-semibold'
                            }`}
                          >
                            {labelText}
                            
                            {/* Best Fit Proportions Badge like Best Of Bharat */}
                            {isSuggested && (
                              <span className="absolute -top-1.5 right-1 px-1 py-0.5 bg-yellow-400 text-gray-950 text-[7px] font-extrabold rounded-md shadow-xs uppercase tracking-wider scale-90">
                                Best Fit ✨
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <hr className="border-gray-100" />

            {/* ROLE-AWARE QUANTITY CONTROLLER & DYNAMIC ADD BUTTON */}
            {isUserLoggedIn && (
              <div className="space-y-4">
                {user.role === 'SELLER' ? (
                  isBrandOwner ? (
                    <Link
                      href={`/seller/add-product/edit?brand=${encodeURIComponent(product.brand_name)}&id=${product.id}`}
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl transition duration-150 flex items-center justify-center space-x-1.5 shadow"
                    >
                      <span>✏️</span> <span>Edit Product details</span>
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full h-14 bg-gray-100 text-gray-400 font-bold text-sm rounded-xl cursor-not-allowed flex items-center justify-center"
                    >
                      Wholesalers cannot buy products
                    </button>
                  )
                ) : (
                  <>
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

                      {/* Add to Cart button incorporating selected format/sizes */}
                      <button
                        onClick={() => {
                          for (let i = 0; i < quantity; i++) {
                            addToCart({
                              ...product,
                              selected_format: selectedFormat || null,
                              selected_size: selectedSize ? getDisplaySizeLabel(selectedSize) : null,
                              min_order_amount: brandMin 
                            });
                          }
                          alert(`Added ${quantity} of "${product.title}" (${selectedFormat}, ${getDisplaySizeLabel(selectedSize)}) to cart!`);
                          router.push('/cart');
                        }}
                        className="flex-grow h-14 bg-gray-950 hover:bg-gray-800 text-white font-black text-sm rounded-xl transition duration-150 active:scale-98 shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <span>Add to cart</span>
                        <span className="opacity-40">•</span>
                        <span>₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <hr className="border-gray-100" />

            {/* Accordions */}
            <div className="space-y-3">
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
                    <p>🌿 <strong>B2B Standard Material:</strong> Eco-sourced raw natural fibers & organic binders.</p>
                    <p>🌿 <strong>Country of Manufacture:</strong> Handcrafted in India.</p>
                    <p>🌿 <strong>Commercial Packing:</strong> Dispatched inside cardboard protective cases with individual dividers.</p>
                  </div>
                )}
              </div>

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
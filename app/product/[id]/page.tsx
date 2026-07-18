'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

// GLOBAL PRICING MATRIX LOOKUP (Change these base prices to update your entire store instantly!)
const getPaintingPrice = (setCount: number, format: string, sizeName: string, shapeType: string): number => {
  const isSquare = shapeType === 'square';

  // Base Prices for 1 Painting on Art Paper
  const rectangleBase: { [key: string]: number } = {
    '8x10in': 400,
    '11x14in': 600,
    '16x20in': 900,
    '18x24in': 1200,
    '24x36in': 1800,
    '36x48in': 2800,
    '48x64in': 4200,
    '52x70in': 5500,
    '60x80in': 7000
  };

  const squareBase: { [key: string]: number } = {
    '12x12in': 500,
    '16x16in': 800,
    '20x20in': 1200,
    '24x24in': 1600,
    '30x30in': 2200,
    '36x36in': 3000,
    '40x40in': 4000,
    '48x48in': 5500,
    '60x60in': 7500
  };

  const baseMap = isSquare ? squareBase : rectangleBase;
  const basePrice = baseMap[sizeName] || 400;

  // Set Count Multiplier (With built-in bulk discounts)
  let setMultiplier = 1.0;
  if (setCount === 2) setMultiplier = 1.8;
  if (setCount === 3) setMultiplier = 2.5;

  // Format Material Multiplier (Canvas is premium)
  let formatMultiplier = 1.0;
  if (format === 'Canvas') formatMultiplier = 1.5;

  return Math.round(basePrice * setMultiplier * formatMultiplier);
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, mounted } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'materials' | 'shipping'>('description');
  
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Variant States
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [unit, setUnit] = useState<'IN' | 'CM'>('IN');

  const [aspectType, setAspectType] = useState<'portrait' | 'landscape' | 'square'>('portrait');
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
          
          const isPainting = data.category === 'Home decor' && data.sub_category === 'Paintings';

          if (isPainting) {
            setAvailableFormats(['Art Paper', 'Canvas']);
            
            const shape = data.shape_type || 'rectangle';
            const standardSizes = shape === 'square'
              ? ['8x10in', '11x14in', '16x20in', '18x24in', '24x36in', '36x48in', '48x64in', '52x70in', '60x80in'] // Raw base keys
              : ['8x10in', '11x14in', '16x20in', '18x24in', '24x36in', '36x48in', '48x64in', '52x70in', '60x80in'];

            setAvailableSizes(standardSizes);
            setSelectedFormat('Art Paper');
            setSelectedSize('8x10in');
          } else {
            const formList = data.formats ? data.formats.split(',') : [];
            const sizeList = data.sizes ? data.sizes.split(',') : [];
            setAvailableFormats(formList);
            setAvailableSizes(sizeList);

            if (formList.length > 0) setSelectedFormat(formList[0]);
            if (sizeList.length > 0) setSelectedSize(sizeList[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProductDetails();
  }, [id]);

  useEffect(() => {
    const activePhoto = images[activeImageIndex];
    if (!activePhoto) return;

    const img = new Image();
    img.src = activePhoto;
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = w / h;

      if (Math.abs(ratio - 1) < 0.06) {
        setAspectType('square');
      } else if (ratio > 1) {
        setAspectType('landscape');
      } else {
        setAspectType('portrait');
      }
    };
  }, [images, activeImageIndex]);

  const getDisplaySizeLabel = (baseSize: string) => {
    let orientedSize = baseSize;
    const isSquare = product?.shape_type === 'square';

    if (isSquare) {
      const squareMap: { [key: string]: string } = {
        '8x10in': '12x12in', '11x14in': '16x16in', '16x20in': '20x20in',
        '18x24in': '24x24in', '24x36in': '30x30in', '36x48in': '36x36in',
        '48x64in': '40x40in', '52x70in': '48x48in', '60x80in': '60x60in',
      };
      orientedSize = squareMap[baseSize] || baseSize;
    } else if (aspectType === 'landscape') {
      const parts = baseSize.replace('in', '').split('x');
      if (parts.length === 2) {
        orientedSize = `${parts[1]}x${parts[0]}in`;
      }
    }

    if (unit === 'IN') return orientedSize;

    const pattern = orientedSize.match(/(\d+)x(\d+)/);
    if (pattern && pattern.length === 3) {
      const wIn = parseInt(pattern[1], 10);
      const hIn = parseInt(pattern[2], 10);
      return `${Math.round(wIn * 2.54)}x${Math.round(hIn * 2.54)}cm`;
    }
    return orientedSize;
  };

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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading product details...</p>
      </div>
    );
  }

  const activePhoto = images[activeImageIndex] || '';
  const isPainting = product.category === 'Home decor' && product.sub_category === 'Paintings';

  // DYNAMIC PRICE RESOLUTION
  const displayPrice = isPainting && selectedSize
    ? getPaintingPrice(product.set_count || 1, selectedFormat, selectedSize, product.shape_type || 'rectangle')
    : product.price || 0;

  const totalPrice = displayPrice * quantity;

  return (
    <main className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-7xl mx-auto animate-in fade-in duration-200">
        
        {/* Breadcrumb Navigation */}
        <nav className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-10 text-left">
          <Link href="/" className="hover:text-gray-900 transition">Shop</Link>
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
          
          {/* LEFT SIDE: MULTI-IMAGE GALLERY */}
          <div className="flex gap-4">
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
              
              <div 
                className="absolute inset-0 pointer-events-none bg-no-repeat rounded-2xl"
                style={zoomStyle}
              />
            </div>
          </div>

          {/* RIGHT SIDE: CONVERSION PANEL */}
          <div className="text-left space-y-6">
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
              {isPainting && (
                <span className="inline-block mt-2 bg-neutral-900 text-white font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 rounded-md">
                  Set of {product.set_count || 1} Paintings 🖼️
                </span>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Price section (Universal B2C Visibility!) */}
            <div className="space-y-4">
              <div className="flex items-baseline space-x-3">
                <span className="text-3xl font-black text-gray-950">
                  ₹{displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* DYNAMIC VARIANT SELECTIONS */}
            <div className="space-y-6">
              {availableFormats.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Format
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {availableFormats.map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setSelectedFormat(fmt)}
                        className={`px-5 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          selectedFormat === fmt 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                            : 'border-gray-200 hover:border-gray-400 text-gray-700 bg-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableSizes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center max-w-md">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                      Size (Per Frame)
                    </label>
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
                          {getDisplaySizeLabel(sz)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* QUANTITY CONTROLLER & DYNAMIC ADD BUTTON */}
            <div className="space-y-4">
              {mounted && user && user.role === 'SELLER' && user.brandName === product.brand_name ? (
                <Link
                  href={`/seller/add-product/edit?brand=${encodeURIComponent(product.brand_name)}&id=${product.id}`}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl transition duration-150 flex items-center justify-center space-x-1.5 shadow"
                >
                  <span>✏️</span> <span>Edit Product details</span>
                </Link>
              ) : (
                <>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Set quantity</label>
                  <div className="flex gap-4">
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

                    <button
                      onClick={() => {
                        for (let i = 0; i < quantity; i++) {
                          addToCart({
                            ...product,
                            price: displayPrice, // Save dynamic resolved price
                            selected_format: selectedFormat || null,
                            selected_size: selectedSize ? getDisplaySizeLabel(selectedSize) : null,
                            min_order_amount: 0 // Remove MOQ restrictions for B2C
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

            <hr className="border-gray-100" />

            {/* Accordions */}
            <div className="space-y-3">
              <div className="border border-gray-150 rounded-xl overflow-hidden">
                <button 
                  className="w-full bg-gray-50/50 p-4 text-sm font-bold text-gray-800 text-left flex justify-between items-center"
                >
                  <span>Product description</span>
                  <span className="text-gray-400">▾</span>
                </button>
                <div className="p-4 bg-white text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                  {product.description || 'No description provided by seller.'}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 text-xs font-bold text-gray-600 uppercase tracking-widest">
              <a 
                href="mailto:wholesale@oaklahome.com"
                className="flex-1 border border-gray-200 hover:bg-gray-50 py-3.5 px-4 rounded-xl text-center transition"
              >
                ✉️ Inquiry for Wholesale
              </a>
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
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext'; 
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

// Next.js 15 requires useSearchParams to be wrapped in a Suspense boundary for safe production builds
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading checkout details...</p>
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { cart, removeFromCart } = useCart();
  const { user } = useAuth(); 

  const brandName = searchParams.get('brand') || '';
  const decodedBrandName = decodeURIComponent(brandName);

  const brandItems = cart.filter((item) => item.brand_name === decodedBrandName);
  const brandSubtotal = brandItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [buyerName, setBuyerName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<number | null>(null);
  const [finalTotal, setFinalTotal] = useState(0);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (user) {
      if (user.firstName) {
        setBuyerName(user.firstName);
      } else if (user.email) {
        setBuyerName(user.email.split('@')[0]);
      }
    }
  }, [user]);

  useEffect(() => {
    if (mounted && brandItems.length === 0 && !orderConfirmed) {
      router.push('/cart');
    }
  }, [brandItems, orderConfirmed, router, mounted]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // STRICT INPUT VALIDATION
    if (!buyerName || buyerName.trim().length < 3) {
      alert('Please enter a valid store / owner name (at least 3 characters).');
      setLoading(false);
      return;
    }

    if (!shippingAddress || shippingAddress.trim().length < 15) {
      alert('Please enter a complete delivery address (at least 15 characters, including city/zip).');
      setLoading(false);
      return;
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            brand_name: decodedBrandName,
            total_amount: brandSubtotal,
            buyer_name: buyerName,
            buyer_email: user?.email || 'anonymous_buyer', // Link session automatically!
            shipping_address: shippingAddress,
            status: 'pending',
          },
        ])
        .select();

      if (orderError) throw orderError;
      const newOrderId = orderData[0].id;

      const itemsToInsert = brandItems.map((item) => ({
        order_id: newOrderId,
        product_title: item.title,
        price: item.price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Save the subtotal into our state variable BEFORE we empty the cart
      setFinalTotal(brandSubtotal);
      brandItems.forEach((item) => removeFromCart(item.id));
      
      setConfirmedOrderId(newOrderId);
      setOrderConfirmed(true);
    } catch (error: any) {
      console.log('Order creation failed:', error);
      alert('Failed to place order: ' + (error.message || error.details || JSON.stringify(error)));
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading checkout details...</p>
      </div>
    );
  }

  if (orderConfirmed) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-6 flex justify-center items-center text-center">
        <div className="max-w-xl w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
          <span className="text-6xl">📦</span>
          <h1 className="text-3xl font-black text-gray-950 tracking-tight mt-4">Order Confirmed!</h1>
          <p className="text-gray-500 mt-1">Thank you for your wholesale purchase from {decodedBrandName}.</p>
          
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-left my-8 space-y-4">
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-sm font-semibold text-gray-500">Order ID:</span>
              <span className="text-sm font-bold text-gray-900">#{confirmedOrderId}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-sm font-semibold text-gray-500">Retailer:</span>
              <span className="text-sm font-bold text-gray-900">{buyerName}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-sm font-semibold text-gray-500">Brand Store:</span>
              <span className="text-sm font-bold text-gray-900">{decodedBrandName}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-base font-bold text-gray-900">Total Invoice:</span>
              <span className="text-xl font-black text-gray-950">₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <Link 
            href="/" 
            className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition active:scale-95"
          >
            Return to Marketplace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <header className="mb-8 text-left">
            <Link href="/cart" className="text-sm font-bold text-blue-600 hover:underline">
              ← Back to Cart
            </Link>
            <h2 className="text-2xl font-black text-gray-950 tracking-tight mt-2">Shipping Details</h2>
            <p className="text-gray-500 mt-1">Provide your retail store delivery details.</p>
          </header>

          <form onSubmit={handlePlaceOrder} className="space-y-6 text-left">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Store / Buyer Name *</label>
              <input
                type="text"
                placeholder="e.g., Oak & Home Boutique"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Shipping Address *</label>
              <textarea
                rows={4}
                placeholder="Enter complete shipping address (Street, City, State, ZIP)..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 px-6 rounded-xl transition duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Processing Order...' : `Confirm Purchase (₹${brandSubtotal.toLocaleString('en-IN')})`}
            </button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm h-fit text-left">
          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">
            Items from {decodedBrandName}
          </h3>
          <div className="divide-y divide-gray-100 mb-6">
            {brandItems.map((item) => (
              <div key={item.id} className="py-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Qty: {item.quantity} × ₹{item.price.toLocaleString('en-IN')}
                  </p>
                </div>
                <span className="font-black text-gray-950 text-sm">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-900">Brand Subtotal:</span>
            <span className="text-xl font-black text-gray-950">
              ₹{brandSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
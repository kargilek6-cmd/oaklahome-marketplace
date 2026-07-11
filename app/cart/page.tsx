'use client';

import React from 'react';
import { useCart, CartItem } from '../context/CartContext';
import Link from 'next/link';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();

  // Helper function to group cart items by their brand name
  const groupedCart = cart.reduce((groups: { [key: string]: CartItem[] }, item) => {
    const brand = item.brand_name;
    if (!groups[brand]) {
      groups[brand] = [];
    }
    groups[brand].push(item);
    return groups;
  }, {});

  // Calculate grand total for all items in the cart
  const grandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
              ← Continue Shopping
            </Link>
            <h1 className="text-4xl font-black text-gray-950 tracking-tight mt-2">
              Your Wholesale Cart
            </h1>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline"
            >
              Clear Entire Cart
            </button>
          )}
        </header>

        {cart.length === 0 ? (
          <div className="bg-white border rounded-2xl p-16 text-center shadow-sm">
            <span className="text-5xl">🛒</span>
            <h2 className="text-2xl font-bold text-gray-800 mt-4">Your cart is empty</h2>
            <p className="text-gray-500 mt-2">Add products from our marketplace to start shopping wholesale.</p>
            <Link 
              href="/" 
              className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl mt-6 hover:bg-blue-700 transition"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Loop through each brand group */}
            {Object.keys(groupedCart).map((brandName) => {
              const brandItems = groupedCart[brandName];
              
              // Calculate subtotal for this specific brand group
              const brandSubtotal = brandItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
              
              // Get the minimum order amount for this brand (stored on the product level)
              const minOrderAmount = brandItems[0].min_order_amount || 0;
              const isMinMet = brandSubtotal >= minOrderAmount;
              const amountRemaining = minOrderAmount - brandSubtotal;

              return (
                <div 
                  key={brandName} 
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Brand Header & B2B Warning Banner */}
                  <div className="bg-gray-50 border-b border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-950">{brandName}</h2>
                      <p className="text-xs text-gray-500 mt-1 font-semibold">
                        Brand Minimum: ₹{minOrderAmount.toLocaleString('en-IN')}
                      </p>
                    </div>

                    {/* DYNAMIC B2B MINIMUM BANNER (FAIRE STYLE) */}
                    {isMinMet ? (
                      <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2">
                        <span>✅ Brand minimum met! Ready to checkout.</span>
                      </div>
                    ) : (
                      <div className="bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-xl text-sm font-bold">
                        ⚠️ Add ₹{amountRemaining.toLocaleString('en-IN', { maximumFractionDigits: 2 })} more to meet {brandName}'s minimum.
                      </div>
                    )}
                  </div>

                  {/* Brand Items List */}
                  <div className="divide-y divide-gray-100">
                    {brandItems.map((item) => (
                      <div key={item.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center space-x-4">
                          {item.image_url && (
                            <img 
                              src={item.image_url} 
                              alt={item.title} 
                              className="w-16 h-16 object-cover rounded-xl border border-gray-100"
                            />
                          )}
                          <div>
                            <h4 className="font-bold text-gray-950 text-base">{item.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Wholesale Price: ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {/* Quantity controls & Line Subtotal */}
                        <div className="flex items-center justify-between w-full md:w-auto md:space-x-12">
                          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-3 py-2 text-gray-600 hover:bg-gray-100 font-bold active:scale-95 transition"
                            >
                              -
                            </button>
                            <span className="px-4 py-2 font-bold text-gray-900 text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-3 py-2 text-gray-600 hover:bg-gray-100 font-bold active:scale-95 transition"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Subtotal</p>
                            <p className="text-lg font-black text-gray-950 mt-0.5">
                              ₹{(item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline mt-1"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Brand Footer & Disabled Checkout Button */}
                  <div className="bg-gray-50 border-t border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Brand Subtotal</p>
                      <p className="text-2xl font-black text-gray-950">
                        ₹{brandSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {isMinMet ? (
  <Link
    href={`/checkout?brand=${encodeURIComponent(brandName)}`}
    className="w-full md:w-auto text-center font-black px-6 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white cursor-pointer active:scale-95 transition duration-150 text-sm"
  >
    Checkout from {brandName}
  </Link>
) : (
  <button
    disabled
    className="w-full md:w-auto font-black px-6 py-3.5 rounded-xl bg-gray-200 text-gray-400 cursor-not-allowed text-sm"
  >
    Minimum Order Unmet
  </button>
)}
                  </div>
                </div>
              );
            })}

            {/* Cart Summary */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-sm text-gray-500 font-semibold">Grand Total (All Brands)</p>
                <p className="text-3xl font-black text-gray-950 mt-1">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <p className="text-xs text-gray-400 font-semibold max-w-sm text-center md:text-right">
                * Note: In a wholesale marketplace, you checkout from each brand separately to manage custom shipping and tax rates.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
'use client';

import React from 'react';
import { useCart, CartItem } from '../context/CartContext';
import Link from 'next/link';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();

  const groupedCart = cart.reduce((groups: { [key: string]: CartItem[] }, item) => {
    const brand = item.brand_name;
    if (!groups[brand]) {
      groups[brand] = [];
    }
    groups[brand].push(item);
    return groups;
  }, {});

  const grandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
        
        <header className="mb-10 flex justify-between items-center">
          <div>
            <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
              ← Continue Shopping
            </Link>
            <h1 className="text-4xl font-black text-gray-950 tracking-tight mt-2">
              Your Cart
            </h1>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
            >
              Clear Entire Cart
            </button>
          )}
        </header>

        {cart.length === 0 ? (
          <div className="bg-white border rounded-2xl p-16 text-center shadow-sm">
            <span className="text-5xl">🛒</span>
            <h2 className="text-2xl font-bold text-gray-800 mt-4">Your cart is empty</h2>
            <p className="text-gray-500 mt-2">Add items from our collection to begin checking out.</p>
            <Link 
              href="/" 
              className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl mt-6 hover:bg-blue-700 transition"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedCart).map((brandName) => {
              const brandItems = groupedCart[brandName];
              const brandSubtotal = brandItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

              return (
                <div 
                  key={brandName} 
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="bg-gray-50 border-b border-gray-100 p-6 text-left">
                    <h2 className="text-xl font-bold text-gray-950">{brandName} Collection</h2>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {brandItems.map((item) => (
                      <div 
                        key={`${item.id}-${item.selected_format || ''}-${item.selected_size || ''}`} 
                        className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                      >
                        <div className="flex items-center space-x-4">
                          {item.image_url && (
                            <img 
                              src={item.image_url.split(',')[0]} 
                              alt={item.title} 
                              className="w-16 h-16 object-cover rounded-xl border border-gray-100"
                            />
                          )}
                          <div className="text-left">
                            <h4 className="font-bold text-gray-950 text-base">{item.title}</h4>
                            
                            {(item.selected_format || item.selected_size) && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {item.selected_format && (
                                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-100">
                                    Format: {item.selected_format}
                                  </span>
                                )}
                                {item.selected_size && (
                                  <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-gray-200">
                                    Size: {item.selected_size}
                                  </span>
                                )}
                              </div>
                            )}

                            <p className="text-xs text-gray-400 mt-2 font-bold">
                              Price: ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-full md:w-auto md:space-x-12">
                          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 h-11">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.selected_format, item.selected_size)}
                              className="px-3 py-2 text-gray-600 hover:bg-gray-100 font-bold active:scale-95 transition cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-4 py-2 font-bold text-gray-900 text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.selected_format, item.selected_size)}
                              className="px-3 py-2 text-gray-600 hover:bg-gray-100 font-bold active:scale-95 transition cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Subtotal</p>
                            <p className="text-lg font-black text-gray-950 mt-0.5">
                              ₹{(item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <button
                              onClick={() => removeFromCart(item.id, item.selected_format, item.selected_size)}
                              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline mt-1 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 border-t border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-left w-full md:w-auto">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Subtotal</p>
                      <p className="text-2xl font-black text-gray-950">
                        ₹{brandSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Standard direct-to-checkout link without MOQ safety locks */}
                    <Link
                      href={`/checkout?brand=${encodeURIComponent(brandName)}`}
                      className="w-full md:w-auto text-center font-black px-6 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white cursor-pointer active:scale-95 transition duration-150 text-sm"
                    >
                      Checkout Item(s)
                    </Link>
                  </div>
                </div>
              );
            })}

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-left w-full md:w-auto">
                <p className="text-sm text-gray-505 font-semibold">Grand Total</p>
                <p className="text-3xl font-black text-gray-950 mt-1">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
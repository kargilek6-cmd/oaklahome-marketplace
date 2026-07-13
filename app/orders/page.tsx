'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function BuyerOrdersPage() {
  const { user, mounted } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyOrders() {
      if (!user?.email) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('buyer_email', user.email)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Failed to load your orders:', err);
      } finally {
        setLoading(false);
      }
    }

    if (mounted && user) {
      fetchMyOrders();
    } else if (mounted && !user) {
      setLoading(false);
    }
  }, [user, mounted]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading orders history...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center text-center p-6 animate-in fade-in">
        <span className="text-5xl">🔒</span>
        <h2 className="text-2xl font-black text-gray-950 mt-6">Authentication Required</h2>
        <p className="text-gray-500 mt-2">Please sign in to view your wholesale orders.</p>
        <Link href="/" className="mt-6 bg-gray-950 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800 transition">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6 animate-in fade-in duration-200">
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <header className="mb-8 border-b border-gray-100 pb-6 flex justify-between items-center text-left">
          <div>
            <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">← Back to Marketplace</Link>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight mt-2">My Wholesale Purchases</h1>
            <p className="text-sm text-gray-500 mt-1">Track payments and shipping statuses for your orders.</p>
          </div>
        </header>

        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => {
              const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'long', day: 'numeric'
              });

              return (
                <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-gray-300 transition">
                  <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-left">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Order #{order.id}</p>
                      <p className="text-xs text-gray-400 font-semibold uppercase">{formattedDate}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">Status:</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${
                        order.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white text-left text-sm">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase">Brand Supplier</h4>
                      <p className="font-bold text-gray-800 mt-1">{order.brand_name}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase">Delivery Destination</h4>
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">{order.shipping_address}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex justify-between items-center text-left">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Total Invoice Paid</p>
                      <p className="text-lg font-black text-gray-900">₹{order.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <span className="text-4xl">📋</span>
            <p className="text-gray-500 font-bold mt-4 text-lg">No orders placed yet.</p>
            <p className="text-gray-400 text-sm mt-1 font-medium">Products added to your cart and confirmed at checkout will appear here.</p>
          </div>
        )}
      </div>
    </main>
  );
}
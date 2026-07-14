'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

// Wrap the product form inside Suspense to satisfy Next.js 15 compilation rules
export default function SellerOrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-400 font-medium">Loading orders dashboard...</p>
      </div>
    }>
      <OrdersDashboard />
    </Suspense>
  );
}

function OrdersDashboard() {
  const searchParams = useSearchParams();
  const urlBrandName = searchParams.get('brand') || '';
  const decodedBrandName = decodeURIComponent(urlBrandName);

  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<{ [key: number]: any[] }>({});
  const [loading, setLoading] = useState(true);

  const fetchOrdersAndItems = async (bName: string) => {
    setLoading(true);
    try {
      // 1. Fetch all orders belonging to this brand
      const { data: ords, error: ordsError } = await supabase
        .from('orders')
        .select('*')
        .eq('brand_name', bName)
        .order('created_at', { ascending: false });

      if (ordsError) throw ordsError;
      setOrders(ords || []);

      if (ords && ords.length > 0) {
        const orderIds = ords.map((o) => o.id);

        // 2. Fetch all individual product items linked to these specific orders
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        // Group the order items by their order_id
        const groupedItems: { [key: number]: any[] } = {};
        items?.forEach((item) => {
          if (!groupedItems[item.order_id]) {
            groupedItems[item.order_id] = [];
          }
          groupedItems[item.order_id].push(item);
        });

        setOrderItems(groupedItems);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (decodedBrandName) {
      fetchOrdersAndItems(decodedBrandName);
    }
  }, [decodedBrandName]);

  // Handle changing order status dynamically (e.g. from "pending" to "shipped")
  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state instantly
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center bg-white border border-gray-200 rounded-2xl max-w-6xl mx-auto shadow-sm">
        <p className="text-gray-400 font-medium">Loading incoming orders...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-6xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <header className="mb-8 border-b border-gray-100 pb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-gray-950 tracking-tight">Incoming Orders</h2>
            <p className="text-sm text-gray-500 mt-1">Manage bulk order fulfillments for {decodedBrandName}.</p>
          </div>
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-gray-800 hover:underline">
            Go to Market
          </Link>
        </header>

        {orders.length > 0 ? (
          <div className="space-y-8">
            {orders.map((order) => {
              const items = orderItems[order.id] || [];
              const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });

              return (
                <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Order Metadata Header */}
                  <div className="bg-gray-50 border-b border-gray-100 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-900">Order #{order.id}</p>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{formattedDate}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status:</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${
                        order.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Body */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                    {/* Left Column: Retailer & Shipping */}
                    <div className="space-y-4 text-left">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Retailer</h4>
                        <p className="font-bold text-gray-800 text-sm mt-1">{order.buyer_name}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shipping Address</h4>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">{order.shipping_address}</p>
                      </div>
                    </div>

                    {/* Right Column: Ordered Items List */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-left">Items Ordered</h4>
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl px-5 bg-gray-50/20">
                        {items.map((item: any) => (
                          <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-700">
                              {item.product_title} <span className="text-gray-400 font-normal">× {item.quantity}</span>
                            </span>
                            <span className="font-black text-gray-900">
                              ₹{(item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Order Footer & Action Bar */}
                  <div className="bg-gray-50 border-t border-gray-100 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-left">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Payout</p>
                      <p className="text-xl font-black text-gray-950">
                        ₹{order.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Order status actions */}
                    <div className="flex space-x-3 w-full md:w-auto">
                      {order.status === 'pending' ? (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'shipped')}
                          className="w-full md:w-auto bg-gray-950 hover:bg-gray-800 text-white font-bold text-xs px-5 py-3 rounded-lg transition active:scale-95 text-center cursor-pointer"
                        >
                          Mark as Shipped 🚚
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'pending')}
                          className="w-full md:w-auto border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold text-xs px-5 py-3 rounded-lg transition active:scale-95 text-center cursor-pointer"
                        >
                          Undo Shipped Status
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-8">
            <span className="text-4xl">📋</span>
            <p className="text-gray-500 font-bold mt-4 text-lg">No incoming orders yet.</p>
            <p className="text-gray-400 text-sm mt-1">When buyers checkout products from your brand, they will show up here!</p>
          </div>
        )}
      </div>
    </main>
  );
}
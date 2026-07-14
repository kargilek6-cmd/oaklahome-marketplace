'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function BuyerOrdersPage() {
  const { user, mounted } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<{ [key: number]: any[] }>({});
  const [loading, setLoading] = useState(true);

  // REVIEW FORM STATES
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewBrand, setReviewBrand] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchMyOrders = async () => {
    if (!user?.email) return;
    try {
      const { data: ords, error: ordsError } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_email', user.email)
        .order('created_at', { ascending: false });

      if (ordsError) throw ordsError;
      setOrders(ords || []);

      if (ords && ords.length > 0) {
        const orderIds = ords.map((o) => o.id);

        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

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
      console.error('Failed to load your orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && user) {
      fetchMyOrders();
    } else if (mounted && !user) {
      setLoading(false);
    }
  }, [user, mounted]);

  const openReviewModal = (brand: string) => {
    setReviewBrand(brand);
    setRating(5);
    setComment('');
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewLoading(true);

    if (!comment || comment.trim().length < 5) {
      alert('Please write a review comment (at least 5 characters).');
      setReviewLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from('reviews').insert([
        {
          buyer_email: user?.email || 'anonymous',
          buyer_name: user?.firstName || 'Retailer',
          brand_name: reviewBrand,
          rating,
          comment,
        },
      ]);

      if (error) throw error;

      alert(`Review submitted successfully! Thank you for rating ${reviewBrand}.`);
      setIsReviewModalOpen(false);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      alert('Failed to submit review: ' + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

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
            <p className="text-sm text-gray-500 mt-1">Track payments, shipping statuses, and leave brand reviews.</p>
          </div>
        </header>

        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => {
              const items = orderItems[order.id] || [];
              const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'long', day: 'numeric'
              });

              return (
                <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-gray-300 transition text-left">
                  <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white text-sm">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase">Brand Supplier</h4>
                      <p className="font-bold text-gray-800 mt-1">{order.brand_name}</p>
                      <p className="text-xs text-gray-400 mt-1">India Store</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase">Delivery Destination</h4>
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">{order.shipping_address}</p>
                    </div>
                  </div>

                  {/* Items list inside this specific order */}
                  <div className="px-6 pb-6 bg-white">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Items Purchased</h4>
                    <div className="divide-y divide-gray-150 border border-gray-100 rounded-xl px-4 bg-gray-50/20">
                      {items.map((item) => (
                        <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-700">
                            {item.product_title} <span className="text-gray-400 font-normal">× {item.quantity}</span>
                          </span>
                          <span className="font-bold text-gray-900">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Total Invoice Paid</p>
                      <p className="text-lg font-black text-gray-900">₹{order.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>

                    {/* DYNAMIC LEAVE REVIEW TRIGGER (Only active on Shipped orders!) */}
                    {order.status === 'shipped' ? (
                      <button 
                        onClick={() => openReviewModal(order.brand_name)}
                        className="w-full sm:w-auto bg-gray-950 hover:bg-gray-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <span>⭐</span> <span>Write Brand Review</span>
                      </button>
                    ) : (
                      <p className="text-xs text-gray-400 font-medium">Review unlocks once supplier ships your package.</p>
                    )}
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

      {/* ⭐ LEAVE REVIEW MODAL PANEL */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150 text-left">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-2xl border border-gray-150 relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold p-2 text-lg cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-2xl font-serif font-semibold text-gray-950 tracking-tight leading-none mb-2">
              Review {reviewBrand}
            </h2>
            <p className="text-xs text-gray-400 mb-6 font-semibold">Share your purchase experience with other retailers.</p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Select Star Rating *</label>
                <div className="flex space-x-2 text-2xl text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="hover:scale-110 transition cursor-pointer"
                    >
                      {star <= rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Review Comment *</label>
                <textarea
                  rows={4}
                  placeholder={`Write your honest product and delivery review for ${reviewBrand}...`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-gray-50/30"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold py-2.5 px-4 rounded-lg text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="bg-gray-950 hover:bg-gray-800 text-white font-black py-2.5 px-4 rounded-lg text-xs transition shadow disabled:bg-gray-200 cursor-pointer"
                >
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </main>
  );
}
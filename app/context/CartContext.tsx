'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string | number;
  title: string;
  price: number;
  brand_name: string;
  min_order_amount: number;
  image_url?: string;
  quantity: number;
  selected_format?: string; // Appends custom chosen material format
  selected_size?: string;   // Appends custom chosen frame dimensions
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string | number, format?: string, size?: string) => void;
  updateQuantity: (productId: string | number, quantity: number, format?: string, size?: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load cart from browser cache (localStorage) safely once mounted
  useEffect(() => {
    const savedCart = localStorage.getItem('oaklahome_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart data:', e);
      }
    }
    setMounted(true);
  }, []);

  // Save cart to browser cache whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('oaklahome_cart', JSON.stringify(cart));
    }
  }, [cart, mounted]);

  const addToCart = (product: any) => {
    setCart((prevCart) => {
      // Match item using product ID + selected variant options so distinct formats/sizes are split
      const existingItem = prevCart.find(
        (item) =>
          item.id === product.id &&
          item.selected_format === product.selected_format &&
          item.selected_size === product.selected_size
      );

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id &&
          item.selected_format === product.selected_format &&
          item.selected_size === product.selected_size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prevCart,
        {
          id: product.id,
          title: product.title,
          price: product.price,
          brand_name: product.brand_name || 'Independent Brand',
          min_order_amount: product.min_order_amount || 0,
          image_url: product.image_url,
          quantity: 1,
          selected_format: product.selected_format || undefined,
          selected_size: product.selected_size || undefined,
        },
      ];
    });
  };

  const removeFromCart = (productId: string | number, format?: string, size?: string) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          !(
            item.id === productId &&
            item.selected_format === format &&
            item.selected_size === size
          )
      )
    );
  };

  const updateQuantity = (productId: string | number, quantity: number, format?: string, size?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, format, size);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId &&
        item.selected_format === format &&
        item.selected_size === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
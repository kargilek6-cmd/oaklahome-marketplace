import { supabase } from '../lib/supabase';
import Link from 'next/link';

export const revalidate = 0;

export default async function Home() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('Error fetching products:', error);
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-red-500 font-medium">Error loading products. Check database keys.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-gray-950 tracking-tight">
            Oaklahome Marketplace
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Wholesale B2B connection for local retailers.
          </p>
        </div>
        <Link 
          href="/seller/add-product" 
          className="bg-blue-600 text-white font-bold px-5 py-3 rounded-xl hover:bg-blue-700 transition"
        >
          Add Product
        </Link>
      </header>

      <div className="max-w-6xl mx-auto">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition duration-200"
              >
                {product.image_url && (
                  <div className="relative w-full h-56">
                    <img 
                      src={product.image_url} 
                      alt={product.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  {/* 1. PRICE & MSRP */}
                  <div className="flex items-baseline space-x-2">
                    <span className="text-lg font-black text-gray-950">
                      ₹{product.price ? product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      MSRP ₹{(product.price * 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* 2. PRODUCT TITLE */}
                  <h3 className="text-base font-semibold text-gray-800 mt-2 line-clamp-2 min-h-[3rem]">
                    {product.title}
                  </h3>

                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                    {product.description}
                  </p>
                  
                  {/* 3. BRAND & MINIMUM ORDER */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    {product.brand_name && (
                      <Link 
                        href={`/brand/${encodeURIComponent(product.brand_name)}`}
                        className="block text-sm font-bold text-gray-950 hover:underline hover:text-blue-600 transition"
                      >
                        {product.brand_name}
                      </Link>
                    )}
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      ₹{product.min_order_amount ? product.min_order_amount.toLocaleString('en-IN') : '0'} min
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
            <p className="text-gray-500 text-lg">No products found in your database.</p>
            <p className="text-gray-400 text-sm mt-1">Add a row in your Supabase table to see it here!</p>
          </div>
        )}
      </div>
    </main>
  );
}
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

export const revalidate = 0;

interface BrandPageProps {
  params: Promise<{ brandName: string }>;
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { brandName } = await params;
  const decodedBrandName = decodeURIComponent(brandName);

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('brand_name', decodedBrandName);

  if (error) {
    console.error('Error fetching brand products:', error);
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-red-500 font-medium">Error loading brand profile.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
            ← Back to Marketplace
          </Link>
          <h1 className="text-4xl font-black text-gray-950 tracking-tight mt-4">
            {decodedBrandName} Storefront
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Browse all wholesale products available from {decodedBrandName}.
          </p>
        </div>
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
                  <h3 className="text-xl font-bold text-gray-900">{product.title}</h3>
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                    {product.description}
                  </p>
                  
                  {/* Pricing Info */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                        Wholesale Price
                      </p>
                      <p className="text-2xl font-black text-gray-950">
                        ₹{product.price ? product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                        Brand Min. Order
                      </p>
                      <p className="text-base font-bold text-gray-700">
                        ₹{product.min_order_amount ? product.min_order_amount.toLocaleString('en-IN') : '0'} min
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
            <p className="text-gray-500 text-lg">No products found for this brand.</p>
          </div>
        )}
      </div>
    </main>
  );
}
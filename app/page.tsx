import { supabase } from '../lib/supabase';

// This tells Next.js to fetch fresh database data every time the page is loaded
export const revalidate = 0;

export default async function Home() {
  // Fetch our products from the Supabase database
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
      <header className="max-w-6xl mx-auto mb-12">
        <h1 className="text-4xl font-black text-gray-950 tracking-tight">
          Oaklahome Marketplace
        </h1>
        <p className="text-gray-600 mt-2 text-lg">
          Wholesale B2B connection for local retailers.
        </p>
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
                  
                  {/* Wholesale Pricing Info */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                        Wholesale Price
                      </p>
                      <p className="text-2xl font-black text-gray-950">
                        ${product.price ? product.price.toFixed(2) : '0.00'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                        Min. Order (MOQ)
                      </p>
                      <p className="text-base font-bold text-gray-700">
                        {product.moq || 1} units
                      </p>
                    </div>
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
import React, { useState, useEffect } from 'react';
import { Share2, CheckSquare, Square, Search, AlertCircle, Package, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useDialog } from '../../shared/hooks/useDialog';

interface Branch {
  id: string;
  name: string;
  code?: string;
  city?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  branch_id: string;
  image_url?: string;
  variantCount: number;
}

interface ShareResult {
  success: boolean;
  productsShared: number;
  variantsShared: number;
  sourceBranchName: string;
  targetBranchName: string;
  error?: string;
}

export const BranchProductSharing: React.FC = () => {
  const { confirm: confirmDialog } = useDialog();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sourceBranch, setSourceBranch] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [targetBranchProducts, setTargetBranchProducts] = useState<Set<string>>(new Set());

  // Load branches
  useEffect(() => {
    loadBranches();
  }, []);

  // Load products when source branch changes
  useEffect(() => {
    if (sourceBranch) {
      loadProducts(sourceBranch);
    } else {
      setProducts([]);
      setSelectedProducts(new Set());
    }
  }, [sourceBranch]);

  // Load target branch products when target branch changes
  useEffect(() => {
    if (targetBranch) {
      loadTargetBranchProducts(targetBranch);
    } else {
      setTargetBranchProducts(new Set());
    }
  }, [targetBranch]);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('store_locations')
        .select('id, name, code, city')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Failed to load branches');
    }
  };

  const loadProducts = async (branchId: string) => {
    try {
      setIsLoading(true);
      
      // Fetch products with variant count
      const { data: productsData, error: productsError } = await supabase
        .from('lats_products')
        .select(`
          id,
          name,
          sku,
          description,
          category_id,
          supplier_id,
          cost_price,
          selling_price,
          stock_quantity,
          branch_id,
          image_url
        `)
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      // Count variants for each product (only parent variants, not children)
      const productsWithVariants = await Promise.all(
        (productsData || []).map(async (product) => {
          const { count } = await supabase
            .from('lats_product_variants')
            .select('id', { count: 'exact', head: true })
            .eq('product_id', product.id)
            .eq('branch_id', branchId)
            .or('is_parent.eq.true,parent_variant_id.is.null');

          return {
            ...product,
            variantCount: count || 0
          };
        })
      );

      setProducts(productsWithVariants);
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTargetBranchProducts = async (branchId: string) => {
    try {
      // Fetch all product SKUs from target branch
      const { data, error } = await supabase
        .from('lats_products')
        .select('sku, name')
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (error) throw error;

      // Create a Set of SKUs (without branch suffix) for quick lookup
      const skuSet = new Set(
        (data || []).map(product => {
          // Remove branch suffix if it exists (e.g., "SKU-123-a1b2c3d4" -> "SKU-123")
          const sku = product.sku || '';
          const parts = sku.split('-');
          // If last part looks like a UUID fragment, remove it
          if (parts.length > 1 && parts[parts.length - 1].length === 8) {
            return parts.slice(0, -1).join('-');
          }
          return sku;
        })
      );

      setTargetBranchProducts(skuSet);
    } catch (error) {
      console.error('Error loading target branch products:', error);
    }
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleShare = async () => {
    if (!sourceBranch || !targetBranch) {
      toast.error('Please select both source and target branches');
      return;
    }

    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product to share');
      return;
    }

    if (sourceBranch === targetBranch) {
      toast.error('Source and target branches must be different');
      return;
    }

    const confirmed = await confirmDialog(
      `Share ${selectedProducts.size} product(s) from ${branches.find(b => b.id === sourceBranch)?.name} to ${branches.find(b => b.id === targetBranch)?.name}?\n\n` +
      `Stock quantities will be set to 0 in the target branch.`
    );
    
    if (!confirmed) return;

    setIsSharing(true);
    setShareResult(null);

    try {
      let productsShared = 0;
      let variantsShared = 0;

      const sourceBranchName = branches.find(b => b.id === sourceBranch)?.name || 'Unknown';
      const targetBranchName = branches.find(b => b.id === targetBranch)?.name || 'Unknown';

      // Share each selected product
      for (const productId of selectedProducts) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        // Check if product already exists in target branch
        const { data: existingProduct } = await supabase
          .from('lats_products')
          .select('id')
          .eq('branch_id', targetBranch)
          .eq('sku', product.sku)
          .single();

        let targetProductId: string;

        if (existingProduct) {
          // Product already exists, skip or update
          toast.info(`Product ${product.name} already exists in target branch`);
          targetProductId = existingProduct.id;
        } else {
          // Create new product in target branch with empty stock
          const { data: newProduct, error: productError } = await supabase
            .from('lats_products')
            .insert({
              name: product.name,
              sku: `${product.sku}-${targetBranch.substring(0, 8)}`, // Make SKU unique
              description: product.description,
              category_id: product.category_id,
              supplier_id: product.supplier_id,
              cost_price: product.cost_price,
              selling_price: product.selling_price,
              stock_quantity: 0, // Empty stock
              branch_id: targetBranch,
              image_url: product.image_url,
              is_active: true,
              is_shared: false,
              sharing_mode: 'isolated'
            })
            .select('id')
            .single();

          if (productError) {
            console.error(`Error sharing product ${product.name}:`, productError);
            continue;
          }

          targetProductId = newProduct.id;
          productsShared++;
        }

        // Share variants (only parent variants, not children)
        const { data: variants, error: variantsError } = await supabase
          .from('lats_product_variants')
          .select('*')
          .eq('product_id', productId)
          .eq('branch_id', sourceBranch)
          .or('is_parent.eq.true,parent_variant_id.is.null');

        if (variantsError) {
          console.error('Error fetching variants:', variantsError);
          continue;
        }

        // Copy variants to target branch with empty stock
        if (variants && variants.length > 0) {
          const variantsToInsert = variants.map(variant => ({
            product_id: targetProductId,
            name: variant.name,
            sku: variant.sku ? `${variant.sku}-${targetBranch.substring(0, 8)}` : null,
            barcode: variant.barcode,
            cost_price: variant.cost_price,
            selling_price: variant.selling_price,
            unit_price: variant.unit_price,
            quantity: 0, // Empty stock
            min_quantity: variant.min_quantity,
            branch_id: targetBranch,
            is_active: variant.is_active,
            attributes: variant.attributes,
            variant_attributes: variant.variant_attributes,
            variant_name: variant.variant_name,
            is_shared: false,
            sharing_mode: 'isolated',
            is_parent: variant.is_parent || false
          }));

          const { error: insertError } = await supabase
            .from('lats_product_variants')
            .insert(variantsToInsert);

          if (insertError) {
            console.error('Error inserting variants:', insertError);
          } else {
            variantsShared += variantsToInsert.length;
          }
        }
      }

      setShareResult({
        success: true,
        productsShared,
        variantsShared,
        sourceBranchName,
        targetBranchName
      });

      toast.success(`Successfully shared ${productsShared} product(s) with ${variantsShared} variant(s)`);
      
      // Reset selections
      setSelectedProducts(new Set());
      
    } catch (error: any) {
      console.error('Error sharing products:', error);
      setShareResult({
        success: false,
        productsShared: 0,
        variantsShared: 0,
        sourceBranchName: branches.find(b => b.id === sourceBranch)?.name || 'Unknown',
        targetBranchName: branches.find(b => b.id === targetBranch)?.name || 'Unknown',
        error: error.message || 'Unknown error occurred'
      });
      toast.error('Failed to share products');
    } finally {
      setIsSharing(false);
    }
  };

  const filteredProducts = products.filter(product => {
    // Search filter
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Missing products filter
    if (showOnlyMissing && targetBranch) {
      // Check if product SKU exists in target branch
      const isInTargetBranch = targetBranchProducts.has(product.sku);
      return !isInTargetBranch; // Only show if NOT in target branch
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Share2 className="text-indigo-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Share Products Between Branches
            </h3>
            <p className="text-sm text-gray-600">
              Copy products to other branches with empty stock
            </p>
          </div>
        </div>

        {/* Branch Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Branch (From)
            </label>
            <select
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isSharing}
            >
              <option value="">Select source branch...</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} {branch.code ? `(${branch.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Branch (To)
            </label>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isSharing}
            >
              <option value="">Select target branch...</option>
              {branches
                .filter(b => b.id !== sourceBranch)
                .map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} {branch.code ? `(${branch.code})` : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">What happens when sharing products:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Product details (name, price, SKU) are copied</li>
                <li>Stock quantities are set to <strong>0</strong> in target branch</li>
                <li>Parent variants are copied (not child variants like IMEI)</li>
                <li>Target branch can manage stock independently</li>
                <li>SKU will be modified to avoid conflicts</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Product List */}
        {sourceBranch && (
          <>
            {/* Search and Select All */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isSharing}
                />
              </div>
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSharing || filteredProducts.length === 0}
              >
                {selectedProducts.size === filteredProducts.length ? (
                  <>
                    <CheckSquare size={18} />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square size={18} />
                    Select All
                  </>
                )}
              </button>
            </div>

            {/* Filter: Show only missing products */}
            {targetBranch && (
              <div className="mb-4">
                <label className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={showOnlyMissing}
                    onChange={(e) => setShowOnlyMissing(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    disabled={isSharing}
                  />
                  <Package className="text-purple-600" size={18} />
                  <span className="text-sm font-medium text-purple-900">
                    Show only products NOT in {branches.find(b => b.id === targetBranch)?.name}
                  </span>
                  {showOnlyMissing && (
                    <span className="ml-auto text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-medium">
                      {filteredProducts.length} missing
                    </span>
                  )}
                </label>
              </div>
            )}

            {/* Products Count */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">
                {filteredProducts.length} product(s) available • {selectedProducts.size} selected
              </p>
            </div>

            {/* Products List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-500">
                  {searchTerm ? 'No products found matching your search' : 'No products in this branch'}
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredProducts.map(product => {
                  const existsInTarget = targetBranch && targetBranchProducts.has(product.sku);
                  
                  return (
                    <div
                      key={product.id}
                      onClick={() => !isSharing && toggleProduct(product.id)}
                      className={`flex items-center gap-4 p-4 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors ${
                        selectedProducts.has(product.id)
                          ? 'bg-indigo-50'
                          : 'hover:bg-gray-50'
                      } ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex-shrink-0">
                        {selectedProducts.has(product.id) ? (
                          <CheckSquare className="text-indigo-600" size={20} />
                        ) : (
                          <Square className="text-gray-400" size={20} />
                        )}
                      </div>
                      
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {product.name}
                          </h4>
                          {existsInTarget && (
                            <span className="flex-shrink-0 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                              Already in target
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          SKU: {product.sku} • Stock: {product.stock_quantity}
                          {product.variantCount > 0 && ` • ${product.variantCount} variant(s)`}
                        </p>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-gray-900">
                          ${Number(product.selling_price || 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Cost: ${Number(product.cost_price || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Share Button */}
            {filteredProducts.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={handleShare}
                  disabled={isSharing || selectedProducts.size === 0 || !targetBranch}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSharing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Sharing Products...
                    </>
                  ) : (
                    <>
                      <Share2 size={18} />
                      Share {selectedProducts.size} Product(s)
                      {targetBranch && (
                        <>
                          <ArrowRight size={18} />
                          {branches.find(b => b.id === targetBranch)?.name}
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Result Message */}
        {shareResult && (
          <div className={`mt-6 rounded-lg border p-4 ${
            shareResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {shareResult.success ? (
                <>
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">
                      Products Shared Successfully!
                    </h3>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>• From: <span className="font-medium">{shareResult.sourceBranchName}</span></p>
                      <p>• To: <span className="font-medium">{shareResult.targetBranchName}</span></p>
                      <p>• Products shared: <span className="font-medium">{shareResult.productsShared}</span></p>
                      <p>• Variants shared: <span className="font-medium">{shareResult.variantsShared}</span></p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl">❌</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">
                      Failed to Share Products
                    </h3>
                    <p className="text-sm text-red-800">
                      {shareResult.error || 'An unknown error occurred'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


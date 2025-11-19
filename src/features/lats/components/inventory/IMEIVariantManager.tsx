/**
 * IMEI Variant Manager Component
 * Used during product creation/receiving to add IMEI variants
 * Each IMEI = 1 variant with quantity of 1
 */

import React, { useState } from 'react';
import { Plus, X, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { IMEIVariantData } from '../../lib/imeiVariantService';

interface IMEIVariantManagerProps {
  productId?: string; // Optional during creation, required for existing products
  onVariantsChange: (variants: IMEIVariantData[]) => void;
  defaultCostPrice?: number;
  defaultSellingPrice?: number;
}

const IMEIVariantManager: React.FC<IMEIVariantManagerProps> = ({
  productId,
  onVariantsChange,
  defaultCostPrice = 0,
  defaultSellingPrice = 0,
}) => {
  const [variants, setVariants] = useState<IMEIVariantData[]>([]);
  const [bulkImeiText, setBulkImeiText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  const handleAddVariant = () => {
    const newVariant: IMEIVariantData = {
      imei: '',
      serial_number: '',
      mac_address: '',
      condition: 'new',
      cost_price: defaultCostPrice,
      selling_price: defaultSellingPrice,
      location: '',
      notes: '',
      source: 'purchase',
    };

    const updatedVariants = [...variants, newVariant];
    setVariants(updatedVariants);
    onVariantsChange(updatedVariants);
  };

  const handleUpdateVariant = (index: number, field: keyof IMEIVariantData, value: any) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = {
      ...updatedVariants[index],
      [field]: value,
    };
    setVariants(updatedVariants);
    onVariantsChange(updatedVariants);
  };

  const handleRemoveVariant = (index: number) => {
    const updatedVariants = variants.filter((_, i) => i !== index);
    setVariants(updatedVariants);
    onVariantsChange(updatedVariants);
  };

  const handleBulkImport = () => {
    if (!bulkImeiText.trim()) {
      toast.error('Please enter IMEI numbers');
      return;
    }

    // Split by newlines, commas, or semicolons
    const imeiList = bulkImeiText
      .split(/[\n,;]+/)
      .map((imei) => imei.trim())
      .filter((imei) => imei.length > 0);

    if (imeiList.length === 0) {
      toast.error('No valid IMEI numbers found');
      return;
    }

    // Check for duplicates within the list
    const uniqueImeis = [...new Set(imeiList)];
    if (uniqueImeis.length !== imeiList.length) {
      toast.error(`Found ${imeiList.length - uniqueImeis.length} duplicate IMEI(s) in input`);
    }

    // Create variants from IMEI list
    const newVariants: IMEIVariantData[] = uniqueImeis.map((imei) => ({
      imei,
      serial_number: '',
      mac_address: '',
      condition: 'new',
      cost_price: defaultCostPrice,
      selling_price: defaultSellingPrice,
      location: '',
      notes: '',
      source: 'purchase',
    }));

    const updatedVariants = [...variants, ...newVariants];
    setVariants(updatedVariants);
    onVariantsChange(updatedVariants);

    setBulkImeiText('');
    setShowBulkInput(false);
    toast.success(`Added ${uniqueImeis.length} IMEI variant(s)`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setBulkImeiText(text);
      setShowBulkInput(true);
    };
    reader.readAsText(file);
  };

  const validateVariant = (variant: IMEIVariantData): string | null => {
    if (!variant.imei || variant.imei.trim().length === 0) {
      return 'IMEI is required';
    }
    if (variant.imei.length < 10) {
      return 'IMEI must be at least 10 characters';
    }
    if (variant.cost_price < 0 || variant.selling_price < 0) {
      return 'Prices cannot be negative';
    }
    return null;
  };

  const validVariants = variants.filter((v) => validateVariant(v) === null);
  const invalidVariants = variants.filter((v) => validateVariant(v) !== null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">IMEI Variants</h3>
          <p className="text-sm text-gray-600">Each IMEI becomes a separate variant</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            type="button"
            onClick={handleAddVariant}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>
      </div>

      {/* Bulk Import Panel */}
      {showBulkInput && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Bulk IMEI Import</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Enter multiple IMEIs (one per line, or comma/semicolon separated)
              </p>
            </div>
            <button
              onClick={() => setShowBulkInput(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={bulkImeiText}
            onChange={(e) => setBulkImeiText(e.target.value)}
            placeholder="356789012345678&#10;356789012345679&#10;356789012345680"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-mono"
            rows={6}
          />

          <div className="flex items-center justify-between mt-3">
            <label className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload from file</span>
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleBulkImport}
              disabled={!bulkImeiText.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                bulkImeiText.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Import IMEIs
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {variants.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">
                {validVariants.length} Valid
              </span>
            </div>
            {invalidVariants.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-gray-900">
                  {invalidVariants.length} Invalid
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setVariants([]);
              onVariantsChange([]);
            }}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Variants List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {variants.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 font-medium">No IMEI variants added</p>
            <p className="text-xs text-gray-500 mt-1">
              Add devices individually or use bulk import
            </p>
          </div>
        ) : (
          variants.map((variant, index) => {
            const error = validateVariant(variant);

            return (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Device #{index + 1}
                    </span>
                    {error && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {error}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(index)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* IMEI (Required) */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      IMEI Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={variant.imei}
                      onChange={(e) => handleUpdateVariant(index, 'imei', e.target.value)}
                      placeholder="356789012345678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-mono"
                    />
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={variant.serial_number || ''}
                      onChange={(e) =>
                        handleUpdateVariant(index, 'serial_number', e.target.value)
                      }
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* MAC Address */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      MAC Address
                    </label>
                    <input
                      type="text"
                      value={variant.mac_address || ''}
                      onChange={(e) => handleUpdateVariant(index, 'mac_address', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-mono"
                    />
                  </div>

                  {/* Cost Price */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cost Price (TZS)
                    </label>
                    <input
                      type="number"
                      value={variant.cost_price}
                      onChange={(e) =>
                        handleUpdateVariant(index, 'cost_price', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Selling Price (TZS)
                    </label>
                    <input
                      type="number"
                      value={variant.selling_price}
                      onChange={(e) =>
                        handleUpdateVariant(
                          index,
                          'selling_price',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Condition
                    </label>
                    <select
                      value={variant.condition}
                      onChange={(e) => handleUpdateVariant(index, 'condition', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    >
                      <option value="new">New</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      value={variant.location || ''}
                      onChange={(e) => handleUpdateVariant(index, 'location', e.target.value)}
                      placeholder="e.g., Shelf A-3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Notes */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={variant.notes || ''}
                      onChange={(e) => handleUpdateVariant(index, 'notes', e.target.value)}
                      placeholder="Additional information..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default IMEIVariantManager;


import React, { useState, useEffect } from 'react';
import { X, Bookmark, Plus, Trash2, Edit, Star, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface POTemplate {
  id: string;
  name: string;
  description?: string;
  supplierId: string;
  supplierName: string;
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    costPrice: number;
  }>;
  currency: string;
  paymentTerms?: string;
  notes?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  useCount: number;
}

interface OrderTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (template: POTemplate) => void;
  currentData?: {
    supplierId?: string;
    supplierName?: string;
    items: any[];
    currency: string;
    paymentTerms?: string;
    notes?: string;
  };
}

const STORAGE_KEY = 'po_templates';

const OrderTemplatesModal: React.FC<OrderTemplatesModalProps> = ({
  isOpen,
  onClose,
  onLoadTemplate,
  currentData
}) => {
  const [templates, setTemplates] = useState<POTemplate[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<POTemplate | null>(null);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTemplates(parsed.sort((a: POTemplate, b: POTemplate) => {
          // Sort: favorites first, then by date
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const saveTemplates = (updatedTemplates: POTemplate[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
      setTemplates(updatedTemplates);
    } catch (error) {
      console.error('Error saving templates:', error);
      toast.error('Failed to save templates');
    }
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!currentData || !currentData.items || currentData.items.length === 0) {
      toast.error('No items to save as template');
      return;
    }

    if (!currentData.supplierId) {
      toast.error('Please select a supplier first');
      return;
    }

    const newTemplate: POTemplate = {
      id: editingTemplate?.id || `template_${Date.now()}`,
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      supplierId: currentData.supplierId,
      supplierName: currentData.supplierName || 'Unknown Supplier',
      items: currentData.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.name,
        variantName: item.variantName || 'Default',
        sku: item.sku,
        quantity: item.quantity,
        costPrice: item.costPrice
      })),
      currency: currentData.currency,
      paymentTerms: currentData.paymentTerms,
      notes: currentData.notes,
      isFavorite: editingTemplate?.isFavorite || false,
      createdAt: editingTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useCount: editingTemplate?.useCount || 0
    };

    if (editingTemplate) {
      // Update existing template
      const updated = templates.map(t => t.id === editingTemplate.id ? newTemplate : t);
      saveTemplates(updated);
      toast.success('Template updated!');
    } else {
      // Add new template
      const updated = [newTemplate, ...templates];
      saveTemplates(updated);
      toast.success('Template saved!');
    }

    setTemplateName('');
    setTemplateDescription('');
    setShowSaveForm(false);
    setEditingTemplate(null);
  };

  const handleLoadTemplate = (template: POTemplate) => {
    // Increment use count
    const updated = templates.map(t => 
      t.id === template.id 
        ? { ...t, useCount: t.useCount + 1, updatedAt: new Date().toISOString() }
        : t
    );
    saveTemplates(updated);

    onLoadTemplate(template);
    toast.success(`Loaded template: ${template.name}`);
    onClose();
  };

  const handleToggleFavorite = (templateId: string) => {
    const updated = templates.map(t => 
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    );
    saveTemplates(updated);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const updated = templates.filter(t => t.id !== templateId);
    saveTemplates(updated);
    toast.success('Template deleted');
  };

  const handleEditTemplate = (template: POTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setShowSaveForm(true);
  };

  const handleDuplicateTemplate = (template: POTemplate) => {
    const duplicated: POTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useCount: 0
    };

    const updated = [duplicated, ...templates];
    saveTemplates(updated);
    toast.success('Template duplicated!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Bookmark className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Order Templates</h2>
                <p className="text-orange-100 text-sm">Save and reuse frequent purchase orders</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        {!showSaveForm && currentData && currentData.items.length > 0 && (
          <div className="p-4 bg-amber-50 border-b border-amber-200">
            <button
              onClick={() => setShowSaveForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Save Current Order as Template
            </button>
          </div>
        )}

        {/* Save Form */}
        {showSaveForm && (
          <div className="p-6 bg-blue-50 border-b border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4">
              {editingTemplate ? 'Edit Template' : 'Save as New Template'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Weekly iPhone Order"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Add notes about this template..."
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSaveForm(false);
                    setTemplateName('');
                    setTemplateDescription('');
                    setEditingTemplate(null);
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Yet</h3>
              <p className="text-gray-600 mb-6">Save your current order as a template for quick reordering</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-900 text-lg">{template.name}</h4>
                        {template.isFavorite && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                          {template.items.length} items
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Supplier: <strong className="text-gray-700">{template.supplierName}</strong></span>
                        <span>•</span>
                        <span>Currency: <strong className="text-gray-700">{template.currency}</strong></span>
                        <span>•</span>
                        <span>Used <strong className="text-gray-700">{template.useCount}</strong> times</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleLoadTemplate(template)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Load
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleFavorite(template.id)}
                          className="p-2 hover:bg-yellow-50 border border-gray-200 rounded-lg transition-colors"
                          title={template.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${template.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                        </button>
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-2 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors"
                          title="Edit template"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDuplicateTemplate(template)}
                          className="p-2 hover:bg-green-50 border border-gray-200 rounded-lg transition-colors"
                          title="Duplicate template"
                        >
                          <Copy className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-2 hover:bg-red-50 border border-gray-200 rounded-lg transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <details className="mt-3">
                    <summary className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                      View {template.items.length} items
                    </summary>
                    <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
                      {template.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-xs">
                          <span className="text-gray-900">{item.productName} - {item.variantName}</span>
                          <span className="text-gray-600">Qty: <strong>{item.quantity}</strong></span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {templates.length} template{templates.length !== 1 ? 's' : ''} saved
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTemplatesModal;


import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/EnhancedInput';
import { 
  FileText, 
  Receipt, 
  FileCheck,
  Package,
  Save,
  RefreshCw,
  Edit,
  Eye,
  Copy,
  Download,
  Upload,
  Code,
  Image,
  AlertCircle,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentTemplate {
  id?: string;
  type: 'invoice' | 'quote' | 'purchase_order' | 'repair_order' | 'receipt';
  name: string;
  content: string;
  is_default: boolean;
  variables: string[];
  paper_size: 'A4' | 'Letter' | 'Thermal-80mm' | 'Thermal-58mm';
  orientation: 'portrait' | 'landscape';
  header_html?: string;
  footer_html?: string;
  css_styles?: string;
  logo_url?: string;
  show_logo: boolean;
  show_business_info: boolean;
  show_customer_info: boolean;
  show_payment_info: boolean;
  show_terms: boolean;
  terms_text?: string;
  show_signature: boolean;
}

const DocumentTemplatesSettings: React.FC = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'edit' | 'preview'>('list');

  const templateTypes = [
    { value: 'invoice', label: 'Invoice', icon: FileText, description: 'Sales invoice template' },
    { value: 'quote', label: 'Quote', icon: FileCheck, description: 'Quote/Estimate template' },
    { value: 'purchase_order', label: 'Purchase Order', icon: Package, description: 'Purchase order template' },
    { value: 'repair_order', label: 'Repair Order', icon: FileText, description: 'Repair service order template' },
    { value: 'receipt', label: 'Receipt', icon: Receipt, description: 'Payment receipt template' }
  ];

  const availableVariables = [
    { var: '{{business_name}}', description: 'Business name' },
    { var: '{{business_address}}', description: 'Business address' },
    { var: '{{business_phone}}', description: 'Business phone' },
    { var: '{{business_email}}', description: 'Business email' },
    { var: '{{customer_name}}', description: 'Customer name' },
    { var: '{{customer_address}}', description: 'Customer address' },
    { var: '{{customer_phone}}', description: 'Customer phone' },
    { var: '{{customer_email}}', description: 'Customer email' },
    { var: '{{document_number}}', description: 'Document number' },
    { var: '{{document_date}}', description: 'Document date' },
    { var: '{{due_date}}', description: 'Due date' },
    { var: '{{items_table}}', description: 'Items table' },
    { var: '{{subtotal}}', description: 'Subtotal amount' },
    { var: '{{tax}}', description: 'Tax amount' },
    { var: '{{discount}}', description: 'Discount amount' },
    { var: '{{total}}', description: 'Total amount' },
    { var: '{{amount_paid}}', description: 'Amount paid' },
    { var: '{{balance_due}}', description: 'Balance due' },
    { var: '{{payment_method}}', description: 'Payment method' },
    { var: '{{notes}}', description: 'Additional notes' },
    { var: '{{terms}}', description: 'Terms and conditions' },
  ];

  const defaultTemplateContent = (type: string) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { max-width: 200px; }
    .business-info { text-align: center; margin-bottom: 20px; }
    .document-title { font-size: 24px; font-weight: bold; margin: 20px 0; }
    .customer-info { margin: 20px 0; padding: 15px; background: #f5f5f5; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: #333; color: white; padding: 10px; text-align: left; }
    .items-table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .totals { margin-top: 20px; float: right; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; }
    .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    {{#if show_logo}}
    <img src="{{logo_url}}" alt="Logo" class="logo">
    {{/if}}
  </div>
  
  {{#if show_business_info}}
  <div class="business-info">
    <h2>{{business_name}}</h2>
    <p>{{business_address}}</p>
    <p>Phone: {{business_phone}} | Email: {{business_email}}</p>
  </div>
  {{/if}}
  
  <div class="document-title">${type.toUpperCase()}</div>
  
  <div style="display: flex; justify-content: space-between;">
    <div>
      <strong>${type} Number:</strong> {{document_number}}<br>
      <strong>Date:</strong> {{document_date}}<br>
      {{#if due_date}}
      <strong>Due Date:</strong> {{due_date}}
      {{/if}}
    </div>
    
    {{#if show_customer_info}}
    <div class="customer-info">
      <strong>Bill To:</strong><br>
      {{customer_name}}<br>
      {{customer_address}}<br>
      {{customer_phone}}<br>
      {{customer_email}}
    </div>
    {{/if}}
  </div>
  
  {{items_table}}
  
  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>{{subtotal}}</span>
    </div>
    <div class="totals-row">
      <span>Tax:</span>
      <span>{{tax}}</span>
    </div>
    <div class="totals-row">
      <span>Discount:</span>
      <span>{{discount}}</span>
    </div>
    <div class="totals-row total-row">
      <span>Total:</span>
      <span>{{total}}</span>
    </div>
    {{#if show_payment_info}}
    <div class="totals-row">
      <span>Amount Paid:</span>
      <span>{{amount_paid}}</span>
    </div>
    <div class="totals-row">
      <span>Balance Due:</span>
      <span>{{balance_due}}</span>
    </div>
    {{/if}}
  </div>
  
  <div style="clear: both;"></div>
  
  {{#if notes}}
  <div style="margin-top: 30px;">
    <strong>Notes:</strong>
    <p>{{notes}}</p>
  </div>
  {{/if}}
  
  {{#if show_terms}}
  <div class="footer">
    <strong>Terms & Conditions:</strong>
    <p>{{terms}}</p>
  </div>
  {{/if}}
  
  {{#if show_signature}}
  <div style="margin-top: 50px;">
    <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto;">
      <p style="text-align: center; margin-top: 5px;">Signature</p>
    </div>
  </div>
  {{/if}}
</body>
</html>`;
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('type', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load document templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: DocumentTemplate) => {
    setSaving(true);
    try {
      if (template.id) {
        const { error } = await supabase
          .from('document_templates')
          .update(template)
          .eq('id', template.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        const { error } = await supabase
          .from('document_templates')
          .insert([template]);

        if (error) throw error;
        toast.success('Template created successfully');
      }

      loadTemplates();
      setActiveTab('list');
      setSelectedTemplate(null);
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      const defaultTemplates = templateTypes.map(type => ({
        type: type.value as any,
        name: `Default ${type.label}`,
        content: defaultTemplateContent(type.value),
        is_default: true,
        variables: availableVariables.map(v => v.var),
        paper_size: 'A4' as const,
        orientation: 'portrait' as const,
        show_logo: true,
        show_business_info: true,
        show_customer_info: true,
        show_payment_info: true,
        show_terms: true,
        terms_text: 'Payment is due within 30 days. Late payments may incur additional charges.',
        show_signature: true
      }));

      const { error } = await supabase
        .from('document_templates')
        .insert(defaultTemplates);

      if (error) throw error;
      toast.success('Default templates created successfully');
      loadTemplates();
    } catch (error: any) {
      console.error('Error creating default templates:', error);
      toast.error(error.message || 'Failed to create default templates');
    }
  };

  const duplicateTemplate = async (template: DocumentTemplate) => {
    const newTemplate = {
      ...template,
      id: undefined,
      name: `${template.name} (Copy)`,
      is_default: false
    };
    
    try {
      const { error } = await supabase
        .from('document_templates')
        .insert([newTemplate]);

      if (error) throw error;
      toast.success('Template duplicated successfully');
      loadTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to duplicate template');
    }
  };

  const downloadTemplate = (template: DocumentTemplate) => {
    const blob = new Blob([template.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const TemplateEditor: React.FC<{ template: DocumentTemplate }> = ({ template }) => {
    const [formData, setFormData] = useState<DocumentTemplate>(template);

    return (
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">Template Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput
              label="Template Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {templateTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paper Size
              </label>
              <select
                value={formData.paper_size}
                onChange={(e) => setFormData({ ...formData, paper_size: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Thermal-80mm">Thermal 80mm</option>
                <option value="Thermal-58mm">Thermal 58mm</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orientation
              </label>
              <select
                value={formData.orientation}
                onChange={(e) => setFormData({ ...formData, orientation: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>
        </div>

        {/* Display Options */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">Display Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'show_logo', label: 'Show Logo' },
              { key: 'show_business_info', label: 'Show Business Info' },
              { key: 'show_customer_info', label: 'Show Customer Info' },
              { key: 'show_payment_info', label: 'Show Payment Info' },
              { key: 'show_terms', label: 'Show Terms & Conditions' },
              { key: 'show_signature', label: 'Show Signature Line' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData[key as keyof DocumentTemplate] as boolean}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Logo URL */}
        {formData.show_logo && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Image className="w-5 h-5 text-purple-600 mr-2" />
              Logo Configuration
            </h4>
            <GlassInput
              label="Logo URL"
              value={formData.logo_url || ''}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>
        )}

        {/* Terms Text */}
        {formData.show_terms && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">Terms & Conditions</h4>
            <textarea
              value={formData.terms_text || ''}
              onChange={(e) => setFormData({ ...formData, terms_text: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows={4}
              placeholder="Enter terms and conditions..."
            />
          </div>
        )}

        {/* HTML Template Editor */}
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <Code className="w-5 h-5 text-gray-600 mr-2" />
            HTML Template
          </h4>
          <div className="mb-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Available Variables:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {availableVariables.map((v) => (
                  <button
                    key={v.var}
                    onClick={() => {
                      navigator.clipboard.writeText(v.var);
                      toast.success(`Copied: ${v.var}`);
                    }}
                    className="text-left p-2 bg-white rounded hover:bg-blue-100 transition-colors"
                    title={v.description}
                  >
                    <code className="text-blue-600">{v.var}</code>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 font-mono text-sm"
            rows={20}
            placeholder="Enter HTML template..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
          <div className="flex gap-3">
            <GlassButton
              onClick={() => setPreviewTemplate(formData)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </GlassButton>
            <GlassButton
              onClick={() => downloadTemplate(formData)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </GlassButton>
          </div>
          <div className="flex gap-3">
            <GlassButton
              onClick={() => {
                setActiveTab('list');
                setSelectedTemplate(null);
              }}
              variant="outline"
            >
              Cancel
            </GlassButton>
            <GlassButton
              onClick={() => handleSaveTemplate(formData)}
              disabled={saving || !formData.name}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Template'}
            </GlassButton>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading document templates...</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Document Templates</h2>
            <p className="text-sm text-gray-600">Customize invoice, quote, and order templates</p>
          </div>
        </div>
        {activeTab === 'list' && (
          <div className="flex gap-2">
            {templates.length === 0 && (
              <GlassButton
                onClick={createDefaultTemplates}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Create Default Templates
              </GlassButton>
            )}
            <GlassButton
              onClick={() => {
                setSelectedTemplate({
                  type: 'invoice',
                  name: '',
                  content: defaultTemplateContent('invoice'),
                  is_default: false,
                  variables: availableVariables.map(v => v.var),
                  paper_size: 'A4',
                  orientation: 'portrait',
                  show_logo: true,
                  show_business_info: true,
                  show_customer_info: true,
                  show_payment_info: true,
                  show_terms: true,
                  show_signature: true
                });
                setActiveTab('edit');
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Template
            </GlassButton>
          </div>
        )}
      </div>

      {/* Template List */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No document templates configured</p>
              <GlassButton
                onClick={createDefaultTemplates}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Default Templates
              </GlassButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const typeInfo = templateTypes.find(t => t.value === template.type);
                const Icon = typeInfo?.icon || FileText;
                
                return (
                  <div
                    key={template.id}
                    className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-blue-600" />
                        <div>
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600">{typeInfo?.label}</p>
                        </div>
                      </div>
                      {template.is_default && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <p>Paper: {template.paper_size} • {template.orientation}</p>
                      <p>{template.variables?.length || 0} variables configured</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedTemplate(template);
                          setActiveTab('edit');
                        }}
                        className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => duplicateTemplate(template)}
                        className="flex-1 p-2 text-purple-600 hover:bg-purple-50 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => downloadTemplate(template)}
                        className="flex-1 p-2 text-green-600 hover:bg-green-50 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Template Editor */}
      {activeTab === 'edit' && selectedTemplate && (
        <TemplateEditor template={selectedTemplate} />
      )}

      {/* Template Preview */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Template Preview</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <iframe
                srcDoc={previewTemplate.content}
                className="w-full h-[600px] border-2 border-gray-200 rounded-lg"
                title="Template Preview"
              />
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default DocumentTemplatesSettings;


/**
 * Campaign Templates Modal - Redesigned to match TemplateManagerModal polish
 * Save, load, edit, and manage campaign templates with categories and favorites
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Save, FolderOpen, Trash2, Edit3, Copy, Search,
  Clock, Star, TrendingUp, Plus, Eye, Download, Upload, FileText, Folder, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getAllTemplates,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplate,
  incrementTemplateUse,
  type CampaignTemplate
} from '../utils/campaignTemplates';

interface CampaignTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (template: CampaignTemplate) => void;
  currentCampaignData?: {
    message: string;
    messageType: string;
    settings: Record<string, any>;
  };
}

const CampaignTemplatesModal: React.FC<CampaignTemplatesModalProps> = ({
  isOpen,
  onClose,
  onLoadTemplate,
  currentCampaignData
}) => {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CampaignTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<CampaignTemplate | null>(null);
  
  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    message: '',
    messageType: 'text' as 'text' | 'image' | 'video' | 'document' | 'audio' | 'poll',
    category: 'promotional',
    settings: {
      usePersonalization: true,
      randomDelay: true,
      minDelay: 3,
      maxDelay: 10,
      usePresence: true,
      batchSize: 10,
      batchDelay: 5,
      maxPerHour: 50,
      dailyLimit: 200,
      skipRecentlyContacted: false,
      respectQuietHours: false,
      useInvisibleChars: false,
      useEmojiVariation: false,
      varyMessageLength: false,
      viewOnce: false,
      pollQuestion: '',
      pollOptions: [] as string[],
      allowMultiSelect: false
    }
  });

  const categories = [
    { id: 'all', name: 'All Templates', icon: '📋' },
    { id: 'promotional', name: 'Promotional', icon: '🎁' },
    { id: 'onboarding', name: 'Onboarding', icon: '👋' },
    { id: 'reminder', name: 'Reminders', icon: '⏰' },
    { id: 'support', name: 'Support', icon: '🆘' },
    { id: 'announcement', name: 'Announcements', icon: '📢' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadFavorites();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    setLoading(true);
    try {
    const loaded = getAllTemplates();
    setTemplates(loaded);
      console.log(`📋 Fetched ${loaded.length} template(s)`);
      
      if (loaded.length === 0) {
        console.log('💡 No templates found. Create your first template to get started!');
      }
    } catch (error) {
      console.error('❌ Error fetching templates:', error);
      toast.error('Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    const stored = localStorage.getItem('campaign_templates_favorites');
    if (stored) {
      setFavorites(new Set(JSON.parse(stored)));
    }
  };

  const saveFavorites = (newFavorites: Set<string>) => {
    localStorage.setItem('campaign_templates_favorites', JSON.stringify([...newFavorites]));
    setFavorites(newFavorites);
  };

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    saveFavorites(newFavorites);
  };

  const handleSaveTemplate = () => {
    if (!currentCampaignData) {
      toast.error('No campaign data to save');
      return;
    }

    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      saveTemplate({
        name: templateName,
        message: currentCampaignData.message,
        messageType: currentCampaignData.messageType,
        settings: currentCampaignData.settings
      });
      toast.success('Template saved successfully!');
      setTemplateName('');
      setShowSaveModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleCreateTemplate = () => {
    if (!templateForm.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    // For text and poll types, message is required. For media types, it's optional (caption)
    if (templateForm.messageType === 'text' && !templateForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (templateForm.messageType === 'poll') {
      if (!templateForm.settings.pollQuestion?.trim()) {
        toast.error('Please enter a poll question');
        return;
      }
      if (!templateForm.settings.pollOptions || templateForm.settings.pollOptions.length < 2) {
        toast.error('Please add at least 2 poll options');
        return;
      }
    }

    try {
      saveTemplate({
        name: templateForm.name,
        message: templateForm.message,
        messageType: templateForm.messageType,
        settings: templateForm.settings
      });
      toast.success('Template created successfully!');
      resetTemplateForm();
      setShowCreateModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleEditTemplate = () => {
    if (!editingTemplate) return;
    if (!templateForm.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    // For text and poll types, message is required. For media types, it's optional (caption)
    if (templateForm.messageType === 'text' && !templateForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (templateForm.messageType === 'poll') {
      if (!templateForm.settings.pollQuestion?.trim()) {
        toast.error('Please enter a poll question');
        return;
      }
      if (!templateForm.settings.pollOptions || templateForm.settings.pollOptions.length < 2) {
        toast.error('Please add at least 2 poll options');
        return;
      }
    }

    try {
      updateTemplate(editingTemplate.id, {
        name: templateForm.name,
        message: templateForm.message,
        messageType: templateForm.messageType,
        settings: templateForm.settings
      });
      toast.success('Template updated successfully!');
      resetTemplateForm();
      setShowEditModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleStartEdit = (template: CampaignTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      message: template.message,
      messageType: template.messageType as any,
      category: 'promotional', // Default, could be stored in template later
      settings: { ...template.settings }
    });
    setShowEditModal(true);
  };

  const handleStartCreate = () => {
    resetTemplateForm();
    setShowCreateModal(true);
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      message: '',
      messageType: 'text',
      category: 'promotional',
      settings: {
        usePersonalization: true,
        randomDelay: true,
        minDelay: 3,
        maxDelay: 10,
        usePresence: true,
        batchSize: 10,
        batchDelay: 5,
        maxPerHour: 50,
        dailyLimit: 200,
        skipRecentlyContacted: false,
        respectQuietHours: false,
        useInvisibleChars: false,
        useEmojiVariation: false,
        varyMessageLength: false,
        viewOnce: false,
        pollQuestion: '',
        pollOptions: [],
        allowMultiSelect: false
      }
    });
  };

  const handlePreview = (template: CampaignTemplate) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  const handleDuplicate = (template: CampaignTemplate) => {
    try {
      saveTemplate({
        name: `${template.name} (Copy)`,
        message: template.message,
        messageType: template.messageType,
        settings: template.settings
      });
      toast.success('Template duplicated!');
      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(templates, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaign-templates-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Templates exported successfully!');
    } catch (error) {
      console.error('Error exporting templates:', error);
      toast.error('Failed to export templates');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (!Array.isArray(imported)) {
          toast.error('Invalid template file format');
          return;
        }

        let importedCount = 0;
        imported.forEach((template: any) => {
          try {
            saveTemplate({
              name: template.name || 'Imported Template',
              message: template.message || '',
              messageType: template.messageType || 'text',
              settings: template.settings || {}
            });
            importedCount++;
          } catch (err) {
            console.error('Error importing template:', err);
          }
        });

        toast.success(`Imported ${importedCount} template(s)!`);
        loadTemplates();
      } catch (error) {
        console.error('Error parsing import file:', error);
        toast.error('Failed to import templates. Invalid file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleLoadTemplate = (template: CampaignTemplate) => {
    incrementTemplateUse(template.id);
    onLoadTemplate(template);
    onClose();
    toast.success(`Template "${template.name}" loaded!`);
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('Delete this template?')) {
      deleteTemplate(id);
      const newFavorites = new Set(favorites);
      newFavorites.delete(id);
      saveFavorites(newFavorites);
      loadTemplates();
      toast.success('Template deleted');
    }
  };

  // Extract variables from message
  const extractVariables = (message: string): string[] => {
    const matches = message.matchAll(/\{(\w+)\}/g);
    return Array.from(matches, m => m[1]);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.message.toLowerCase().includes(searchQuery.toLowerCase());
    // For now, all templates match all categories (can be enhanced later)
    const matchesCategory = selectedCategory === 'all';
    return matchesSearch && matchesCategory;
  });

  const favoriteTemplates = filteredTemplates.filter(t => favorites.has(t.id));

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <FileText className="w-8 h-8" />
                  Campaign Templates
                </h2>
                <p className="text-purple-100">Organize and reuse your best campaign configurations</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStartCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                  New Template
                </button>
                {currentCampaignData && (
                  <button
                  onClick={() => setShowSaveModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Current
                </button>
              )}
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                    id="import-templates"
                  />
                  <label
                    htmlFor="import-templates"
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </label>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              <button
                  onClick={() => {
                    loadTemplates();
                    loadFavorites();
                    toast.success('Templates refreshed!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-colors"
                  title="Refresh templates"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
              </div>
            </div>

            {/* Search */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 border-r-2 border-gray-200 p-4 overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-600 mb-3 uppercase">Categories</h3>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-6 p-3 bg-white rounded-lg border-2 border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : templates.length}
                  </div>
                  <div className="text-xs text-gray-600">Total Templates</div>
                  {templates.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {templates.reduce((sum, t) => sum + t.useCount, 0)} total uses
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                  <span className="ml-3 text-gray-600">Loading templates...</span>
                </div>
              ) : (
                <>
                  {/* Favorites Section */}
                  {favoriteTemplates.length > 0 && selectedCategory === 'all' && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        Favorites
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {favoriteTemplates.map(template => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            isFavorite={favorites.has(template.id)}
                            onSelect={() => handleLoadTemplate(template)}
                            onToggleFavorite={() => toggleFavorite(template.id)}
                            onPreview={() => handlePreview(template)}
                            onEdit={() => handleStartEdit(template)}
                            onDuplicate={() => handleDuplicate(template)}
                            onDelete={() => handleDeleteTemplate(template.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Templates */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      {selectedCategory === 'all' ? 'All Templates' : categories.find(c => c.id === selectedCategory)?.name}
                    </h3>
                    {filteredTemplates.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredTemplates.map(template => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            isFavorite={favorites.has(template.id)}
                            onSelect={() => handleLoadTemplate(template)}
                            onToggleFavorite={() => toggleFavorite(template.id)}
                            onPreview={() => handlePreview(template)}
                            onEdit={() => handleStartEdit(template)}
                            onDuplicate={() => handleDuplicate(template)}
                            onDelete={() => handleDeleteTemplate(template.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600">
                          {searchQuery ? 'No templates match your search' : 'No templates found'}
                        </p>
                        {!searchQuery && (
                          <button
                            onClick={handleStartCreate}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                          >
                            Create Your First Template
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            </div>
          </div>
        </div>

      {/* Save Current Modal */}
        {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Save Template</h3>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none mb-4"
                autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleSaveTemplate()}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSaveTemplate}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setTemplateName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <CreateEditModal
          isEdit={showEditModal}
          templateForm={templateForm}
          setTemplateForm={setTemplateForm}
          onSave={showEditModal ? handleEditTemplate : handleCreateTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingTemplate(null);
            resetTemplateForm();
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onLoad={() => {
            handleLoadTemplate(previewTemplate);
            setShowPreviewModal(false);
          }}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewTemplate(null);
          }}
        />
      )}
    </>,
    document.body
  );
};

// Template Card Component
interface TemplateCardProps {
  template: CampaignTemplate;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, isFavorite, onSelect, onToggleFavorite, onPreview, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  const variables = template.message.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) || [];

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-bold text-gray-900 flex-1">{template.name}</h4>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-50 rounded transition-colors text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.message}</p>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {template.useCount} uses
          </span>
          {variables.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {variables.length} variables
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(template.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSelect}
          className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          Use Template
        </button>
        <button
          onClick={onPreview}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          title="Preview"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={onDuplicate}
          className="px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Create/Edit Modal Component
interface CreateEditModalProps {
  isEdit: boolean;
  templateForm: any;
  setTemplateForm: (form: any) => void;
  onSave: () => void;
  onClose: () => void;
}

function CreateEditModal({ isEdit, templateForm, setTemplateForm, onSave, onClose }: CreateEditModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white rounded-t-2xl">
          <h3 className="text-2xl font-bold">{isEdit ? 'Edit Template' : 'Create New Template'}</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              placeholder="e.g., Summer Sale Message, Welcome Image, Product Poll"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{templateForm.name.length}/100 characters</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Message Type</label>
            <select
              value={templateForm.messageType}
              onChange={(e) => setTemplateForm({ ...templateForm, messageType: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
            >
              <option value="text">💬 Text Message</option>
              <option value="image">🖼️ Image Message</option>
              <option value="video">🎥 Video Message</option>
              <option value="document">📄 Document Message</option>
              <option value="audio">🎵 Audio Message</option>
              <option value="poll">📊 Poll Message</option>
            </select>
            {templateForm.messageType !== 'text' && templateForm.messageType !== 'poll' && (
              <p className="text-xs text-purple-600 mt-1 font-medium">
                ℹ️ Media will be selected when you use this template in a campaign
              </p>
            )}
        </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {templateForm.messageType === 'text' ? (
                <>Template Content <span className="text-red-500">*</span></>
              ) : templateForm.messageType === 'image' ? (
                <>Image Caption <span className="text-gray-500 text-xs font-normal">(Optional)</span></>
              ) : templateForm.messageType === 'video' ? (
                <>Video Caption <span className="text-gray-500 text-xs font-normal">(Optional)</span></>
              ) : templateForm.messageType === 'document' ? (
                <>Document Caption <span className="text-gray-500 text-xs font-normal">(Optional)</span></>
              ) : (
                <>Message Content <span className="text-red-500">*</span></>
              )}
            </label>
            <textarea
              value={templateForm.message}
              onChange={(e) => setTemplateForm({ ...templateForm, message: e.target.value })}
              placeholder={
                templateForm.messageType === 'text' 
                  ? "Your message here... Use {name}, {phone}, {date}, {time} for variables"
                  : templateForm.messageType === 'image'
                  ? "Image caption (optional)... Use {name}, {phone}, {date}, {time} for variables"
                  : templateForm.messageType === 'video'
                  ? "Video caption (optional)... Use {name}, {phone}, {date}, {time} for variables"
                  : templateForm.messageType === 'document'
                  ? "Document caption (optional)... Use {name}, {phone}, {date}, {time} for variables"
                  : "Your message here... Use {name}, {phone}, {date}, {time} for variables"
              }
              rows={templateForm.messageType === 'text' ? 6 : 4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-600">
                {templateForm.messageType === 'text' ? (
                  <>Tip: Use {'{name}'}, {'{phone}'}, {'{date}'}, {'{time}'} for personalization</>
                ) : templateForm.messageType === 'image' ? (
                  <>💡 For image templates: Select media when using this template. This field is for the caption.</>
                ) : templateForm.messageType === 'video' ? (
                  <>💡 For video templates: Select media when using this template. This field is for the caption.</>
                ) : templateForm.messageType === 'document' ? (
                  <>💡 For document templates: Select media when using this template. This field is for the caption.</>
                ) : (
                  <>Tip: Use {'{name}'}, {'{phone}'}, {'{date}'}, {'{time}'} for personalization</>
                )}
              </p>
              {templateForm.messageType === 'text' && (
                <span className={`text-xs font-medium ${
                  templateForm.message.length > 1000 ? 'text-red-600' : 
                  templateForm.message.length > 800 ? 'text-yellow-600' : 
                  'text-gray-500'
                }`}>
                  {templateForm.message.length} / 1024
                </span>
              )}
                    </div>
                  </div>
                  
          {templateForm.messageType === 'poll' && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Poll Question</label>
                <input
                  type="text"
                  value={templateForm.settings.pollQuestion || ''}
                  onChange={(e) => setTemplateForm({
                    ...templateForm,
                    settings: { ...templateForm.settings, pollQuestion: e.target.value }
                  })}
                  placeholder="Enter poll question"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Poll Options (one per line)</label>
                <textarea
                  value={templateForm.settings.pollOptions?.join('\n') || ''}
                  onChange={(e) => setTemplateForm({
                    ...templateForm,
                    settings: {
                      ...templateForm.settings,
                      pollOptions: e.target.value.split('\n').filter(o => o.trim())
                    }
                  })}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={templateForm.settings.allowMultiSelect || false}
                  onChange={(e) => setTemplateForm({
                    ...templateForm,
                    settings: { ...templateForm.settings, allowMultiSelect: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Allow multiple selections</span>
              </label>
            </div>
                    )}
                  </div>

        <div className="border-t-2 border-gray-200 p-6 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
            Cancel
                    </button>
                    <button
            onClick={onSave}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
            {isEdit ? 'Update Template' : 'Save Template'}
                    </button>
                  </div>
                </div>
    </div>
  );
}

// Preview Modal Component
interface PreviewModalProps {
  template: CampaignTemplate;
  onLoad: () => void;
  onClose: () => void;
}

function PreviewModal({ template, onLoad, onClose }: PreviewModalProps) {
  const variables = template.message.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Template Preview</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <p className="text-lg font-semibold text-gray-900">{template.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
            <p className="text-gray-900 capitalize">{template.messageType}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-900 whitespace-pre-wrap">{template.message}</p>
            </div>
          </div>

          {variables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variables</label>
              <div className="flex flex-wrap gap-2">
                {variables.map((v, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    {'{'}{v}{'}'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {template.messageType === 'poll' && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">Poll Details</label>
              {template.settings.pollQuestion && (
                <p className="font-semibold mb-2">{template.settings.pollQuestion}</p>
              )}
              {template.settings.pollOptions && template.settings.pollOptions.length > 0 && (
                <ul className="list-disc list-inside space-y-1">
                  {template.settings.pollOptions.map((option, idx) => (
                    <li key={idx} className="text-gray-700">{option}</li>
                  ))}
                </ul>
              )}
              {template.settings.allowMultiSelect && (
                <p className="text-xs text-gray-600 mt-2">Multiple selections allowed</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Used {template.useCount} times
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created {new Date(template.createdAt).toLocaleDateString()}
            </span>
        </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onLoad}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Load Template
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignTemplatesModal;

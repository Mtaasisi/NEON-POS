/**
 * Advanced Template Manager - Organize and manage message templates
 */

import React, { useState } from 'react';
import { X, FileText, Plus, Edit2, Trash2, Copy, Star, Search, Folder } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: MessageTemplate) => void;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  favorite: boolean;
  usageCount: number;
  lastUsed?: Date;
  variables: string[]; // e.g., ['name', 'phone']
}

export default function TemplateManagerModal({ isOpen, onClose, onSelectTemplate }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('promotional');

  // Mock templates - would come from database
  const [templates, setTemplates] = useState<MessageTemplate[]>([
    {
      id: '1',
      name: 'Welcome Message',
      content: 'Hi {name}! Welcome to our store. We\'re excited to serve you!',
      category: 'onboarding',
      favorite: true,
      usageCount: 45,
      variables: ['name']
    },
    {
      id: '2',
      name: 'Flash Sale',
      content: 'Hey {name}! 🔥 Flash Sale Alert! Get 50% off on selected items. Shop now!',
      category: 'promotional',
      favorite: true,
      usageCount: 123,
      variables: ['name']
    },
    {
      id: '3',
      name: 'Appointment Reminder',
      content: 'Hi {name}, this is a reminder about your appointment on {date} at {time}.',
      category: 'reminder',
      favorite: false,
      usageCount: 67,
      variables: ['name', 'date', 'time']
    },
    {
      id: '4',
      name: 'Payment Reminder',
      content: 'Dear {name}, your payment of ${amount} is due. Please clear your balance.',
      category: 'financial',
      favorite: false,
      usageCount: 34,
      variables: ['name', 'amount']
    }
  ]);

  const categories = [
    { id: 'all', name: 'All Templates', icon: '📋' },
    { id: 'promotional', name: 'Promotional', icon: '🎁' },
    { id: 'onboarding', name: 'Onboarding', icon: '👋' },
    { id: 'reminder', name: 'Reminders', icon: '⏰' },
    { id: 'financial', name: 'Financial', icon: '💰' },
    { id: 'support', name: 'Support', icon: '🆘' }
  ];

  if (!isOpen) return null;

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const favoriteTemplates = templates.filter(t => t.favorite);

  const handleSaveTemplate = () => {
    if (!newTemplateName || !newTemplateContent) {
      alert('Please fill in all fields');
      return;
    }

    const variables = [...newTemplateContent.matchAll(/\{(\w+)\}/g)].map(m => m[1]);

    const newTemplate: MessageTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      content: newTemplateContent,
      category: newTemplateCategory,
      favorite: false,
      usageCount: 0,
      variables
    };

    setTemplates([...templates, newTemplate]);
    setShowCreateModal(false);
    setNewTemplateName('');
    setNewTemplateContent('');
  };

  const toggleFavorite = (id: string) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, favorite: !t.favorite } : t));
  };

  const deleteTemplate = (id: string) => {
    if (confirm('Delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <FileText className="w-8 h-8" />
                  Template Manager
                </h2>
                <p className="text-green-100">Organize and reuse your best messages</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                  New Template
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
                        ? 'bg-green-600 text-white shadow-md'
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
                  <div className="text-2xl font-bold text-gray-900">{templates.length}</div>
                  <div className="text-xs text-gray-600">Total Templates</div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
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
                        onSelect={() => {
                          onSelectTemplate(template);
                          onClose();
                        }}
                        onToggleFavorite={() => toggleFavorite(template.id)}
                        onDelete={() => deleteTemplate(template.id)}
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
                        onSelect={() => {
                          onSelectTemplate(template);
                          onClose();
                        }}
                        onToggleFavorite={() => toggleFavorite(template.id)}
                        onDelete={() => deleteTemplate(template.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">No templates found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white rounded-t-2xl">
              <h3 className="text-2xl font-bold">Create New Template</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Summer Sale Message"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Category</label>
                <select
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none"
                >
                  {categories.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Template Content</label>
                <textarea
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  placeholder="Your message here... Use {name}, {phone}, {date}, {time} for variables"
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Tip: Use {'{name}'}, {'{phone}'}, {'{date}'}, {'{time}'} for personalization
                </p>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 p-6 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface TemplateCardProps {
  template: MessageTemplate;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, onSelect, onToggleFavorite, onDelete }: TemplateCardProps) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-green-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-bold text-gray-900">{template.name}</h4>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Star className={`w-4 h-4 ${template.favorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
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

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.content}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{template.usageCount} uses</span>
          {template.variables.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {template.variables.length} variables
            </span>
          )}
        </div>
        <button
          onClick={onSelect}
          className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Use Template
        </button>
      </div>
    </div>
  );
}


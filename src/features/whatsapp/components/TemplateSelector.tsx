/**
 * Template Selector Component
 * A reusable component to select and use campaign templates from anywhere
 */

import React, { useState } from 'react';
import { FolderOpen, Search, X, Star, Clock } from 'lucide-react';
import { getAllTemplates, getTemplate, incrementTemplateUse, type CampaignTemplate } from '../utils/campaignTemplates';
import { toast } from 'react-hot-toast';

interface TemplateSelectorProps {
  onSelect: (template: CampaignTemplate) => void;
  onClose?: () => void;
  className?: string;
  showAsDropdown?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelect,
  onClose,
  className = '',
  showAsDropdown = false
}) => {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    const loaded = getAllTemplates();
    setTemplates(loaded);
  };

  const handleSelect = (template: CampaignTemplate) => {
    incrementTemplateUse(template.id);
    onSelect(template);
    setIsOpen(false);
    if (onClose) onClose();
    toast.success(`Template "${template.name}" selected!`);
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showAsDropdown && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 ${className}`}
      >
        <FolderOpen className="w-4 h-4" />
        Use Template
      </button>
    );
  }

  if (!isOpen && !showAsDropdown) return null;

  return (
    <div className={`fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4 ${className}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              <h3 className="text-lg font-bold">Select Template</h3>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onClose) onClose();
              }}
              className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 bg-gray-50 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No templates found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {template.message.substring(0, 80)}...
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {template.useCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;

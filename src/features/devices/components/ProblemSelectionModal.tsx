import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  CheckSquare, 
  X, 
  AlertTriangle,
  Filter,
  Eye,
  FileText
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from '../../../lib/toastUtils';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

interface ProblemTemplate {
  id: string;
  problem_name: string;
  problem_description: string;
  category: string;
  checklist_items: any[];
  is_active: boolean;
}

interface ProblemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProblem: (template: ProblemTemplate) => void;
  currentIssueDescription?: string;
}

const ProblemSelectionModal: React.FC<ProblemSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectProblem,
  currentIssueDescription
}) => {
  const [templates, setTemplates] = useState<ProblemTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ProblemTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPreview, setShowPreview] = useState<ProblemTemplate | null>(null);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  const categories = [
    'all',
    'general',
    'power',
    'display',
    'audio',
    'camera',
    'network',
    'hardware',
    'software'
  ];

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, selectedCategory]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('diagnostic_problem_templates')
        .select('*')
        .eq('is_active', true)
        .order('problem_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load problem templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.problem_name.toLowerCase().includes(term) ||
        template.problem_description.toLowerCase().includes(term) ||
        template.category.toLowerCase().includes(term)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    setFilteredTemplates(filtered);
  };

  const handleSelectProblem = (template: ProblemTemplate) => {
    onSelectProblem(template);
    onClose();
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-gray-100 text-gray-700',
      power: 'bg-red-100 text-red-700',
      display: 'bg-blue-100 text-blue-700',
      audio: 'bg-green-100 text-green-700',
      camera: 'bg-purple-100 text-purple-700',
      network: 'bg-yellow-100 text-yellow-700',
      hardware: 'bg-orange-100 text-orange-700',
      software: 'bg-indigo-100 text-indigo-700'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[99999]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none"
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center mb-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Problem Type</h2>
                <p className="text-sm text-gray-600">Choose a diagnostic problem template</p>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search problems..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-12 pr-10 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
            <div className="py-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-600">Loading problems...</span>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No problems found</h3>
                  <p className="text-gray-600">
                    {searchTerm || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'No problem templates are available'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <div key={template.id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">{template.problem_name}</h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.problem_description}</p>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${getCategoryColor(template.category)}`}>
                              {template.category}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <CheckSquare size={12} />
                              <span>{template.checklist_items.length} items</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectProblem(template)}
                          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-semibold shadow-lg hover:shadow-xl"
                        >
                          Select This Problem
                        </button>
                        <button
                          onClick={() => setShowPreview(template)}
                          className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                          title="Preview checklist"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal - AddProductModal Style */}
      {showPreview && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-[100001]"
            onClick={() => setShowPreview(null)}
            aria-hidden="true"
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 flex items-center justify-center z-[100002] p-4 pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden relative pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPreview(null)}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon Header - Fixed */}
              <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Text */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {showPreview.problem_name}
                    </h3>
                    <p className="text-sm text-gray-600">Checklist Preview</p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
                <div className="py-6">
                  <p className="text-gray-700 mb-6">{showPreview.problem_description}</p>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 mb-4">Checklist Items:</h4>
                    {showPreview.checklist_items.map((item, index) => (
                      <div key={item.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-gray-900">{item.title}</h5>
                            {item.required && (
                              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Fixed Footer */}
              <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowPreview(null)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleSelectProblem(showPreview);
                      setShowPreview(null);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    Select This Problem
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>,
    document.body
  );
};

export default ProblemSelectionModal;

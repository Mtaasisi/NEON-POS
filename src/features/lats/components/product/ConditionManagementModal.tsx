/**
 * Condition Management Modal - Enhanced popup for comprehensive condition tracking
 * Provides detailed quality assessment, grading, and issue documentation
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Star, AlertTriangle, CheckCircle, Info,
  Camera, FileText, TrendingUp, Save, Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';

export interface ConditionData {
  condition: 'new' | 'used' | 'refurbished';
  qualityGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  notes: string;
  estimatedValue: number;
  repairCost?: number;
  photos?: string[];
  assessedBy?: string;
  assessedAt?: string;
}

interface ConditionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (conditionData: ConditionData) => void;
  initialData?: Partial<ConditionData>;
  productId: string;
  productName?: string;
  originalPrice?: number;
  isIMEI?: boolean; // For individual IMEI items
}

// Enhanced condition options with descriptions
const conditionOptions = [
  {
    value: 'new' as const,
    label: 'New',
    description: 'Brand new, never used, original packaging',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    value: 'used' as const,
    label: 'Used',
    description: 'Previously owned, shows normal wear',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    value: 'refurbished' as const,
    label: 'Refurbished',
    description: 'Repaired/reconditioned to working condition',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
];

// Quality grade options
const qualityGrades = [
  {
    value: 'A+' as const,
    label: 'A+ (Excellent)',
    description: 'Mint condition, like new',
    icon: Star,
    color: 'text-yellow-500'
  },
  {
    value: 'A' as const,
    label: 'A (Good)',
    description: 'Excellent condition, minor wear',
    icon: CheckCircle,
    color: 'text-green-500'
  },
  {
    value: 'B' as const,
    label: 'B (Fair)',
    description: 'Noticeable wear, fully functional',
    icon: Info,
    color: 'text-blue-500'
  },
  {
    value: 'C' as const,
    label: 'C (Poor)',
    description: 'Significant wear, working',
    icon: AlertTriangle,
    color: 'text-orange-500'
  },
  {
    value: 'D' as const,
    label: 'D (Damaged)',
    description: 'Major issues present',
    icon: AlertTriangle,
    color: 'text-red-500'
  },
  {
    value: 'F' as const,
    label: 'F (Broken)',
    description: 'Needs repair or parts',
    icon: AlertTriangle,
    color: 'text-red-700'
  }
];

// Common issue categories
const commonIssues = [
  // Cosmetic
  'Scratches on screen', 'Scratches on body', 'Dents or dings', 'Discoloration',
  // Functional
  'Buttons not working', 'Ports damaged', 'Speaker issues', 'Microphone problems',
  // Performance
  'Slow performance', 'Battery drains fast', 'Overheating', 'Software issues',
  // Hardware
  'Cracked screen', 'Bent frame', 'Water damage', 'Component failure'
];

const ConditionManagementModal: React.FC<ConditionManagementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  productId,
  productName = 'Product',
  originalPrice = 0,
  isIMEI = false
}) => {
  const [conditionData, setConditionData] = useState<ConditionData>({
    condition: initialData?.condition || 'new',
    qualityGrade: initialData?.qualityGrade || 'A+',
    issues: initialData?.issues || [],
    notes: initialData?.notes || '',
    estimatedValue: initialData?.estimatedValue || originalPrice,
    repairCost: initialData?.repairCost || 0,
    photos: initialData?.photos || [],
    assessedBy: initialData?.assessedBy,
    assessedAt: initialData?.assessedAt
  });

  const [selectedCondition, setSelectedCondition] = useState(initialData?.condition || 'new');
  const [customIssue, setCustomIssue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Update condition data when initial data changes
  useEffect(() => {
    if (initialData) {
      setConditionData(prev => ({ ...prev, ...initialData }));
      setSelectedCondition(initialData.condition || 'new');
    }
  }, [initialData]);

  // Auto-adjust estimated value based on condition and grade
  useEffect(() => {
    let multiplier = 1.0;

    // Condition multiplier
    switch (conditionData.condition) {
      case 'new': multiplier = 1.0; break;
      case 'used': multiplier = 0.7; break;
      case 'refurbished': multiplier = 0.8; break;
    }

    // Quality grade multiplier
    switch (conditionData.qualityGrade) {
      case 'A+': multiplier *= 1.0; break;
      case 'A': multiplier *= 0.9; break;
      case 'B': multiplier *= 0.75; break;
      case 'C': multiplier *= 0.6; break;
      case 'D': multiplier *= 0.4; break;
      case 'F': multiplier *= 0.2; break;
    }

    const estimatedValue = Math.round(originalPrice * multiplier);
    setConditionData(prev => ({ ...prev, estimatedValue }));
  }, [conditionData.condition, conditionData.qualityGrade, originalPrice]);

  const handleConditionChange = (condition: 'new' | 'used' | 'refurbished') => {
    setSelectedCondition(condition);
    setConditionData(prev => ({ ...prev, condition }));
  };

  const handleGradeChange = (grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F') => {
    setConditionData(prev => ({ ...prev, qualityGrade: grade }));
  };

  const addIssue = (issue: string) => {
    if (!conditionData.issues.includes(issue)) {
      setConditionData(prev => ({
        ...prev,
        issues: [...prev.issues, issue]
      }));
    }
  };

  const removeIssue = (issue: string) => {
    setConditionData(prev => ({
      ...prev,
      issues: prev.issues.filter(i => i !== issue)
    }));
  };

  const addCustomIssue = () => {
    if (customIssue.trim() && !conditionData.issues.includes(customIssue.trim())) {
      addIssue(customIssue.trim());
      setCustomIssue('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get current branch ID for proper isolation
      const currentBranchId = localStorage.getItem('current_branch_id');
      if (!currentBranchId) {
        toast.error('Branch ID is missing. Please refresh and try again.');
        return;
      }

      // Save to database with branch isolation
      const { error } = await supabase
        .from('lats_products')
        .update({
          condition: conditionData.condition,
          quality_grade: conditionData.qualityGrade,
          condition_issues: conditionData.issues,
          condition_notes: conditionData.notes,
          estimated_value: conditionData.estimatedValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .eq('branch_id', currentBranchId); // Ensure branch isolation

      if (error) throw error;

      // Call the parent onSave callback
      const finalData = {
        ...conditionData,
        assessedBy: 'Current User', // TODO: Get from auth context
        assessedAt: new Date().toISOString()
      };

      onSave(finalData);
      toast.success('Condition assessment saved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to save condition assessment');
      console.error('Error saving condition:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedConditionInfo = conditionOptions.find(c => c.value === conditionData.condition);
  const selectedGradeInfo = qualityGrades.find(g => g.value === conditionData.qualityGrade);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Condition Assessment</h2>
              <p className="text-sm text-gray-600">{productName} {isIMEI && '(IMEI Item)'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Column - Condition & Grade */}
            <div className="space-y-6">

              {/* Condition Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Product Condition
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {conditionOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleConditionChange(option.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedCondition === option.value
                          ? `${option.borderColor} ${option.bgColor} shadow-md`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${option.color} flex-shrink-0`} />
                        <div>
                          <div className={`font-semibold ${option.textColor}`}>{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Grade */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Quality Grade
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {qualityGrades.map((grade) => {
                    const Icon = grade.icon;
                    return (
                      <button
                        key={grade.value}
                        onClick={() => handleGradeChange(grade.value)}
                        className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                          conditionData.qualityGrade === grade.value
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${grade.color} flex-shrink-0`} />
                          <div>
                            <div className="font-medium text-gray-900">{grade.label}</div>
                            <div className="text-xs text-gray-600">{grade.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Value Estimation */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Value Assessment
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Original Price</div>
                    <div className="text-lg font-bold text-gray-900">
                      TZS {originalPrice.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Estimated Value</div>
                    <div className="text-lg font-bold text-blue-600">
                      TZS {conditionData.estimatedValue.toLocaleString()}
                    </div>
                  </div>
                </div>
                {conditionData.repairCost && conditionData.repairCost > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600">Estimated Repair Cost</div>
                    <input
                      type="number"
                      value={conditionData.repairCost}
                      onChange={(e) => setConditionData(prev => ({
                        ...prev,
                        repairCost: parseInt(e.target.value) || 0
                      }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Repair cost in TZS"
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Right Column - Issues & Notes */}
            <div className="space-y-6">

              {/* Issues */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Issues & Problems
                </h3>

                {/* Selected Issues */}
                {conditionData.issues.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {conditionData.issues.map((issue, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                        >
                          {issue}
                          <button
                            onClick={() => removeIssue(issue)}
                            className="hover:bg-red-200 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Issues */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Quick Select:</div>
                  <div className="flex flex-wrap gap-2">
                    {commonIssues.map((issue, index) => (
                      <button
                        key={index}
                        onClick={() => addIssue(issue)}
                        disabled={conditionData.issues.includes(issue)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          conditionData.issues.includes(issue)
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        {issue}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Issue */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customIssue}
                    onChange={(e) => setCustomIssue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomIssue()}
                    placeholder="Add custom issue..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addCustomIssue}
                    disabled={!customIssue.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Detailed Notes
                </h3>
                <textarea
                  value={conditionData.notes}
                  onChange={(e) => setConditionData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add detailed notes about the condition, repair history, or special considerations..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {conditionData.notes.length}/1000 characters
                </div>
              </div>

              {/* Photo Upload Placeholder */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-500" />
                  Photo Documentation
                </h4>
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Photo upload coming soon...</p>
                  <p className="text-gray-400 text-xs mt-1">Will allow attaching condition photos</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Assessment
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConditionManagementModal;

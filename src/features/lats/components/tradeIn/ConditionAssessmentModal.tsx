/**
 * Condition Assessment Modal
 * Interactive popup for assessing device condition with questions and image uploads
 */

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Camera, Upload, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';

interface ConditionIssue {
  id: string;
  question: string;
  checked: boolean;
  images: string[]; // Array of image URLs or base64 strings
}

interface ConditionAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assessment: {
    issues: ConditionIssue[];
    calculatedCondition: 'excellent' | 'good' | 'fair' | 'poor';
    images: string[];
  }) => void;
  initialIssues?: ConditionIssue[];
}

const DEFAULT_QUESTIONS = [
  { id: 'frame_scratch', question: 'Has scratches on frame' },
  { id: 'screen_scratch', question: 'Has scratches on screen' },
  { id: 'screen_crack', question: 'Has cracks on screen' },
  { id: 'back_scratch', question: 'Has scratches on back' },
  { id: 'back_crack', question: 'Has cracks on back' },
  { id: 'button_damage', question: 'Buttons not working properly' },
  { id: 'camera_damage', question: 'Camera has issues' },
  { id: 'water_damage', question: 'Signs of water damage' },
  { id: 'battery_swollen', question: 'Battery is swollen' },
  { id: 'charging_port', question: 'Charging port not working' },
  { id: 'speaker_issue', question: 'Speaker not working' },
  { id: 'microphone_issue', question: 'Microphone not working' },
  { id: 'display_issue', question: 'Display has issues (dead pixels, discoloration)' },
  { id: 'housing_damage', question: 'Housing is bent or damaged' },
];

const ConditionAssessmentModal: React.FC<ConditionAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialIssues,
}) => {
  const [issues, setIssues] = useState<ConditionIssue[]>(
    initialIssues ||
      DEFAULT_QUESTIONS.map((q) => ({
        id: q.id,
        question: q.question,
        checked: false,
        images: [],
      }))
  );
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const handleToggleIssue = (index: number) => {
    setIssues((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], checked: !updated[index].checked };
      return updated;
    });
  };

  const handleImageUpload = async (issueIndex: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    setUploadingIndex(issueIndex);

    try {
      // Convert to base64 for storage (or upload to Supabase storage)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setIssues((prev) => {
          const updated = [...prev];
          updated[issueIndex] = {
            ...updated[issueIndex],
            images: [...updated[issueIndex].images, base64String],
          };
          return updated;
        });
        setUploadingIndex(null);
      };
      reader.onerror = () => {
        alert('Failed to read image file');
        setUploadingIndex(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setUploadingIndex(null);
    }
  };

  const handleRemoveImage = (issueIndex: number, imageIndex: number) => {
    setIssues((prev) => {
      const updated = [...prev];
      updated[issueIndex] = {
        ...updated[issueIndex],
        images: updated[issueIndex].images.filter((_, i) => i !== imageIndex),
      };
      return updated;
    });
  };

  const calculateCondition = (): 'excellent' | 'good' | 'fair' | 'poor' => {
    const checkedCount = issues.filter((issue) => issue.checked).length;
    const totalIssues = issues.length;

    if (checkedCount === 0) return 'excellent';
    if (checkedCount <= 2) return 'good';
    if (checkedCount <= 5) return 'fair';
    return 'poor';
  };

  const handleSave = () => {
    const allImages = issues.flatMap((issue) => issue.images);
    const calculatedCondition = calculateCondition();

    onSave({
      issues,
      calculatedCondition,
      images: allImages,
    });
    onClose();
  };

  if (!isOpen) return null;

  const checkedCount = issues.filter((issue) => issue.checked).length;
  const calculatedCondition = calculateCondition();

  return createPortal(
    <>
      <div
        className="fixed bg-black/60 flex items-center justify-center p-2 sm:p-4 z-[99999]"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none',
        }}
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden relative"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Compact Header */}
          <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Device Condition Assessment</h3>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Issues:</span>
                  <span className="ml-1 font-semibold text-gray-900">{checkedCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Condition:</span>
                  <span
                    className={`ml-1 font-bold ${
                      calculatedCondition === 'excellent'
                        ? 'text-green-600'
                        : calculatedCondition === 'good'
                        ? 'text-blue-600'
                        : calculatedCondition === 'fair'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {calculatedCondition.charAt(0).toUpperCase() + calculatedCondition.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content - Grid Layout */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {issues.map((issue, index) => (
                <div
                  key={issue.id}
                  className={`border rounded-lg p-2 transition-colors ${
                    issue.checked
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {/* Question with Checkbox - Compact */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => handleToggleIssue(index)}
                      className={`w-4 h-4 flex items-center justify-center rounded border-2 transition-colors flex-shrink-0 ${
                        issue.checked
                          ? 'bg-orange-600 border-orange-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {issue.checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <label
                      className="flex-1 text-xs font-medium text-gray-900 cursor-pointer leading-tight"
                      onClick={() => handleToggleIssue(index)}
                    >
                      {issue.question}
                    </label>
                  </div>

                  {/* Image Upload Section - Compact */}
                  {issue.checked && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {issue.images.map((image, imageIndex) => (
                          <div
                            key={imageIndex}
                            className="relative group"
                          >
                            <img
                              src={image}
                              alt={`${issue.question} - Image ${imageIndex + 1}`}
                              className="w-12 h-12 object-cover rounded border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index, imageIndex)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <input
                          ref={(el) => {
                            fileInputRefs.current[index] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(index, file);
                            }
                            if (e.target) {
                              e.target.value = '';
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[index]?.click()}
                          disabled={uploadingIndex === index}
                          className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center hover:border-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingIndex === index ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-orange-500 border-t-transparent"></div>
                          ) : (
                            <Camera className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Compact Footer */}
          <div className="flex gap-2 pt-2 pb-3 px-3 border-t border-gray-200 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Assessment
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ConditionAssessmentModal;


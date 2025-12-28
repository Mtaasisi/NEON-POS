import React, { useState, useEffect } from 'react';
import { 
  FileText, Upload, Download, Trash2, Eye, Calendar, AlertTriangle, 
  Plus, X, Save, File, Image, FileArchive
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import {
  getSupplierDocuments,
  createSupplierDocument,
  deleteSupplierDocument,
  uploadDocumentFile,
  type SupplierDocument
} from '../../../lib/supplierDocumentsApi';

interface SupplierDocumentsTabProps {
  supplierId: string;
  supplierName: string;
}

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract', icon: FileText },
  { value: 'license', label: 'Business License', icon: FileText },
  { value: 'certificate', label: 'Certificate', icon: FileText },
  { value: 'insurance', label: 'Insurance', icon: FileText },
  { value: 'tax_certificate', label: 'Tax Certificate', icon: FileText },
  { value: 'quality_cert', label: 'Quality Certification', icon: FileText },
  { value: 'other', label: 'Other', icon: File }
];

const SupplierDocumentsTab: React.FC<SupplierDocumentsTabProps> = ({ 
  supplierId, 
  supplierName 
}) => {
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('contract');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [supplierId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await getSupplierDocuments(supplierId);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);

      // Upload file
      const fileUrl = await uploadDocumentFile(selectedFile, supplierId);

      // Create document record
      await createSupplierDocument({
        supplier_id: supplierId,
        document_type: documentType,
        file_url: fileUrl,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        expiry_date: expiryDate || undefined,
        notes: notes || undefined
      });

      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      resetForm();
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteSupplierDocument(id);
      toast.success('Document deleted');
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentType('contract');
    setExpiryDate('');
    setNotes('');
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="w-8 h-8" />;
    
    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />;
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) 
      return <FileArchive className="w-8 h-8 text-yellow-500" />;
    
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const days = Math.floor((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">Documents</h4>
          <p className="text-xs text-gray-500">Manage supplier documents and certificates</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Upload Document
        </button>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Documents</h4>
          <p className="text-gray-600 mb-6">Upload your first document to get started</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Upload size={18} />
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <GlassCard key={doc.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getDocumentIcon(doc.mime_type)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {doc.file_name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Info */}
              <div className="space-y-2 text-xs text-gray-600 mb-3">
                <div className="flex items-center justify-between">
                  <span>Size:</span>
                  <span className="font-medium">{formatFileSize(doc.file_size)}</span>
                </div>
                
                {doc.expiry_date && (
                  <div className="flex items-center justify-between">
                    <span>Expires:</span>
                    <span className={`font-medium ${
                      isExpired(doc.expiry_date) ? 'text-red-600' :
                      isExpiringSoon(doc.expiry_date) ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {new Date(doc.expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span>Uploaded:</span>
                  <span className="font-medium">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Expiry Warning */}
              {doc.expiry_date && (isExpired(doc.expiry_date) || isExpiringSoon(doc.expiry_date)) && (
                <div className={`flex items-center gap-2 p-2 rounded-md mb-3 ${
                  isExpired(doc.expiry_date) ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  <AlertTriangle size={14} />
                  <span className="text-xs font-medium">
                    {isExpired(doc.expiry_date) ? 'Expired' : 'Expiring Soon'}
                  </span>
                </div>
              )}

              {/* Notes */}
              {doc.notes && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{doc.notes}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <button
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-1 text-xs"
                  >
                    <Eye size={14} />
                    View
                  </button>
                </a>
                <button
                  onClick={() => window.open(doc.file_url, '_blank')}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Download"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          <div 
            className="fixed bg-black/50"
            onClick={() => {
              if (!uploading) {
                setShowUploadModal(false);
                resetForm();
              }
            }}
            style={{
              left: 'var(--sidebar-width, 0px)',
              top: 'var(--topbar-height, 64px)',
              right: 0,
              bottom: 0,
              zIndex: 55
            }}
          />
          
          <div 
            className="fixed flex items-center justify-center p-4"
            style={{
              left: 'var(--sidebar-width, 0px)',
              top: 'var(--topbar-height, 64px)',
              right: 0,
              bottom: 0,
              zIndex: 60,
              pointerEvents: 'none'
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
              style={{ pointerEvents: 'auto' }}
            >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetForm();
                }}
                disabled={uploading}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File *
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={uploading}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any notes about this document..."
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  resetForm();
                }}
                disabled={uploading}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload
                  </>
                )}
              </button>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SupplierDocumentsTab;


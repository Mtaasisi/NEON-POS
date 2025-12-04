/**
 * Media Library Modal
 * Organize and reuse images, videos, documents for WhatsApp campaigns
 * 
 * Features:
 * - Upload and organize media files
 * - Folder organization
 * - Search and filter
 * - Quick insert into campaigns
 * - Usage tracking
 * - Preview before use
 */

import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Video, FileText, Music, Upload, Folder, Trash2, Search, Eye, ChevronDown, CheckCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import whatsappAdvancedService from '../../../services/whatsappAdvancedService';
import type { MediaLibraryItem } from '../../../types/whatsapp-advanced';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (media: MediaLibraryItem) => void;
}

export default function MediaLibraryModal({ isOpen, onClose, onSelect }: Props) {
  const [media, setMedia] = useState<MediaLibraryItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaLibraryItem | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMedia();
      loadFolders();
    }
  }, [isOpen]);

  async function loadMedia() {
    try {
      setLoading(true);
      const data = await whatsappAdvancedService.mediaLibrary.getAll();
      setMedia(data);
    } catch (error) {
      console.error('Error loading media:', error);
      toast.error('Failed to load media library');
    } finally {
      setLoading(false);
    }
  }

  async function loadFolders() {
    try {
      const data = await whatsappAdvancedService.mediaLibrary.getFolders();
      setFolders(['All', ...data]);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 16MB for WhatsApp)
    if (file.size > 16 * 1024 * 1024) {
      toast.error('File too large. Maximum 16MB for WhatsApp.');
      return;
    }

    try {
      setUploading(true);
      const folder = selectedFolder === 'All' ? 'General' : selectedFolder;
      
      console.log('📤 Starting media upload to library:', { fileName: file.name, folder, size: file.size });
      
      await whatsappAdvancedService.mediaLibrary.upload(file, folder);
      
      toast.success('Media uploaded successfully!');
      console.log('✅ Media uploaded to library successfully');
      
      loadMedia();
    } catch (error: any) {
      console.error('❌ Media library upload error:', error);
      const errorMessage = error.message || 'Upload failed';
      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  }

  async function handleDelete(mediaId: string) {
    if (!confirm('Delete this media file?')) return;

    try {
      await whatsappAdvancedService.mediaLibrary.delete(mediaId);
      toast.success('Media deleted');
      loadMedia();
    } catch (error) {
      toast.error('Delete failed');
    }
  }

  function handleSelect(mediaItem: MediaLibraryItem) {
    if (onSelect) {
      onSelect(mediaItem);
      onClose();
      toast.success('Media selected!');
    }
  }

  const filteredMedia = media.filter(item => {
    if (selectedFolder !== 'All' && item.folder !== selectedFolder) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(search) || 
             item.file_name.toLowerCase().includes(search);
    }
    return true;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-6 h-6" />;
      case 'video': return <Video className="w-6 h-6" />;
      case 'audio': return <Music className="w-6 h-6" />;
      default: return <FileText className="w-6 h-6" />;
    }
  };

  const stats = {
    total: media.length,
    images: media.filter(m => m.file_type === 'image').length,
    videos: media.filter(m => m.file_type === 'video').length,
    documents: media.filter(m => m.file_type === 'document').length,
    audio: media.filter(m => m.file_type === 'audio').length,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-600 to-pink-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Folder className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Media Library</h2>
                <p className="text-purple-100">Organize and reuse your media files</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Stats & Upload Bar */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{stats.images}</p>
                <p className="text-xs text-gray-600">Images</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">{stats.videos}</p>
                <p className="text-xs text-gray-600">Videos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-orange-600">{stats.documents}</p>
                <p className="text-xs text-gray-600">Docs</p>
              </div>
            </div>
            
            <label className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold flex items-center gap-2 cursor-pointer shadow-lg">
              <input
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <Upload className="w-5 h-5" />
              {uploading ? 'Uploading...' : 'Upload Media'}
            </label>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search media by name..."
              className="w-full pl-12 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
            />
          </div>
        </div>

        {/* Folder Tabs */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 overflow-x-auto">
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                  selectedFolder === folder
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📁 {folder}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-20">
              <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No media files yet</p>
              <p className="text-sm text-gray-400 mt-2">Upload images, videos, or documents to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-purple-400 transition-all group"
                >
                  {/* Media Preview */}
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {item.file_type === 'image' ? (
                      <img 
                        src={item.file_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                        {getFileIcon(item.file_type)}
                      </div>
                    )}
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedMedia(item)}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100"
                        title="Preview"
                      >
                        <Eye className="w-5 h-5 text-gray-700" />
                      </button>
                      {onSelect && (
                        <button
                          onClick={() => handleSelect(item)}
                          className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700"
                          title="Use this media"
                        >
                          <CheckCheck className="w-5 h-5 text-white" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Media Info */}
                  <div className="p-3">
                    <p className="font-bold text-sm text-gray-900 truncate" title={item.name}>
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-600">
                        {(item.file_size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <span className="text-xs text-gray-500">
                        Used {item.usage_count || 0}x
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            💡 Tip: Upload frequently used media here for quick access. Max file size: 16MB (WhatsApp limit)
          </p>
        </div>
      </div>

      {/* Media Preview Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="p-4 bg-gray-900 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-white">{selectedMedia.name}</h3>
              <button
                onClick={() => setSelectedMedia(null)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-6">
              {selectedMedia.file_type === 'image' ? (
                <img 
                  src={selectedMedia.file_url} 
                  alt={selectedMedia.name}
                  className="w-full rounded-lg"
                />
              ) : selectedMedia.file_type === 'video' ? (
                <video 
                  src={selectedMedia.file_url} 
                  controls
                  className="w-full rounded-lg"
                />
              ) : (
                <div className="text-center py-10">
                  {getFileIcon(selectedMedia.file_type)}
                  <p className="mt-4 text-gray-700">{selectedMedia.file_name}</p>
                  <a 
                    href={selectedMedia.file_url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Open File
                  </a>
                </div>
              )}
              
              {onSelect && (
                <button
                  onClick={() => handleSelect(selectedMedia)}
                  className="w-full mt-4 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCheck className="w-5 h-5" />
                  Use This Media in Campaign
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


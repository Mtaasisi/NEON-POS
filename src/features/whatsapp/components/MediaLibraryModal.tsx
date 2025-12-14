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
import { X, Image as ImageIcon, Video, FileText, Music, Upload, Folder, Trash2, Search, Eye, ChevronDown, CheckCheck, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
import whatsappAdvancedService from '../../../services/whatsappAdvancedService';
import { localMediaStorage } from '../../../lib/localMediaStorage';
import MediaBackupRestore from './MediaBackupRestore';
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
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [retriedMedia, setRetriedMedia] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadMedia();
      loadFolders();
      // Reset image states when modal opens
      setImageLoadErrors(new Set());
      setImageLoading(new Set());
      setRetriedMedia(new Set());
    }
  }, [isOpen]);

  // Initialize loading state for all images when media is loaded
  useEffect(() => {
    if (media.length > 0) {
      const imageIds = media
        .filter(item => item.file_type === 'image')
        .map(item => item.id);
      setImageLoading(new Set(imageIds));
    }
  }, [media]);

  async function loadMedia() {
    console.log('🔍 [DEBUG] loadMedia() called');
    const startTime = performance.now();
    try {
      setLoading(true);
      console.log('📥 [DEBUG] Calling whatsappAdvancedService.mediaLibrary.getAll()...');
      const data = await whatsappAdvancedService.mediaLibrary.getAll();
      
      // Media URLs are already resolved by the service
      // Each item's file_url is either a base64 data URL or a relative path
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`✅ [DEBUG] Loaded ${data.length} media items from library in ${duration}ms`);
      console.log('📊 [DEBUG] Media items breakdown:', {
        total: data.length,
        images: data.filter(m => m.file_type === 'image').length,
        videos: data.filter(m => m.file_type === 'video').length,
        documents: data.filter(m => m.file_type === 'document').length,
        audio: data.filter(m => m.file_type === 'audio').length,
      });
      console.log('📋 [DEBUG] First 3 items:', data.slice(0, 3).map(item => ({
        id: item.id,
        name: item.name,
        file_type: item.file_type,
        file_url_preview: item.file_url?.substring(0, 50) + '...',
        folder: item.folder
      })));
      
      setMedia(data);
      console.log('✅ [DEBUG] Media state updated successfully');
    } catch (error: any) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.error('❌ [DEBUG] Error loading media after', duration, 'ms:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error('Failed to load media library');
    } finally {
      setLoading(false);
      console.log('🏁 [DEBUG] loadMedia() completed, loading state set to false');
    }
  }

  async function loadFolders() {
    console.log('🔍 [DEBUG] loadFolders() called');
    try {
      console.log('📥 [DEBUG] Calling whatsappAdvancedService.mediaLibrary.getFolders()...');
      const data = await whatsappAdvancedService.mediaLibrary.getFolders();
      console.log('📁 [DEBUG] Received folders from service:', data);
      const allFolders = ['All', ...data];
      console.log('📁 [DEBUG] Setting folders state:', allFolders);
      setFolders(allFolders);
      console.log('✅ [DEBUG] Folders loaded successfully');
    } catch (error: any) {
      console.error('❌ [DEBUG] Error loading folders:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    console.log('🔍 [DEBUG] handleUpload() called');
    const startTime = performance.now();
    const file = event.target.files?.[0];
    
    console.log('📄 [DEBUG] File input event:', {
      filesCount: event.target.files?.length || 0,
      selectedFile: file ? {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      } : null
    });
    
    if (!file) {
      console.warn('⚠️ [DEBUG] No file selected, returning early');
      return;
    }

    // Validate file size (max 16MB for WhatsApp)
    const maxSize = 16 * 1024 * 1024;
    console.log('📏 [DEBUG] Validating file size:', {
      fileSize: file.size,
      maxSize: maxSize,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2),
      isValid: file.size <= maxSize
    });
    
    if (file.size > maxSize) {
      console.error('❌ [DEBUG] File too large:', {
        fileSize: file.size,
        maxSize: maxSize,
        exceedsBy: ((file.size - maxSize) / 1024 / 1024).toFixed(2) + 'MB'
      });
      toast.error('File too large. Maximum 16MB for WhatsApp.');
      return;
    }

    try {
      setUploading(true);
      const folder = selectedFolder === 'All' ? 'General' : selectedFolder;
      
      console.log('📤 [DEBUG] Starting media upload to library:', { 
        fileName: file.name, 
        fileType: file.type,
        fileSize: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2),
        folder,
        selectedFolder,
        timestamp: new Date().toISOString()
      });
      
      console.log('📥 [DEBUG] Calling whatsappAdvancedService.mediaLibrary.upload()...');
      const uploadStartTime = performance.now();
      const result = await whatsappAdvancedService.mediaLibrary.upload(file, folder);
      const uploadDuration = (performance.now() - uploadStartTime).toFixed(2);
      
      console.log('✅ [DEBUG] Upload completed in', uploadDuration, 'ms');
      console.log('📦 [DEBUG] Upload result:', {
        id: result.id,
        name: result.name,
        file_type: result.file_type,
        file_url_preview: result.file_url?.substring(0, 100) + '...',
        folder: result.folder,
        file_size: result.file_size
      });
      
      toast.success('Media uploaded successfully!');
      console.log('✅ [DEBUG] Media uploaded to library successfully');
      
      console.log('🔄 [DEBUG] Reloading media list...');
      await loadMedia();
      
      const totalDuration = (performance.now() - startTime).toFixed(2);
      console.log('✅ [DEBUG] handleUpload() completed successfully in', totalDuration, 'ms');
    } catch (error: any) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.error('❌ [DEBUG] Media library upload error after', duration, 'ms:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      const errorMessage = error.message || 'Upload failed';
      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
      console.log('🏁 [DEBUG] handleUpload() cleanup completed, uploading state set to false');
    }
  }

  async function handleDelete(mediaId: string) {
    console.log('🔍 [DEBUG] handleDelete() called for mediaId:', mediaId);
    
    const mediaItem = media.find(m => m.id === mediaId);
    console.log('📄 [DEBUG] Media item to delete:', mediaItem ? {
      id: mediaItem.id,
      name: mediaItem.name,
      file_type: mediaItem.file_type,
      file_url: mediaItem.file_url?.substring(0, 50) + '...',
      folder: mediaItem.folder
    } : 'NOT FOUND');
    
    if (!confirm('Delete this media file?')) {
      console.log('🚫 [DEBUG] User cancelled deletion');
      return;
    }

    const startTime = performance.now();
    try {
      console.log('🗑️ [DEBUG] Calling whatsappAdvancedService.mediaLibrary.delete()...');
      await whatsappAdvancedService.mediaLibrary.delete(mediaId);
      const duration = (performance.now() - startTime).toFixed(2);
      console.log('✅ [DEBUG] Delete completed in', duration, 'ms');
      toast.success('Media deleted');
      
      console.log('🔄 [DEBUG] Reloading media list after deletion...');
      await loadMedia();
      console.log('✅ [DEBUG] handleDelete() completed successfully');
    } catch (error: any) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.error('❌ [DEBUG] Delete error after', duration, 'ms:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        mediaId
      });
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

  const handleImageLoad = (itemId: string) => {
    console.log('🖼️ [DEBUG] handleImageLoad() called for itemId:', itemId);
    const mediaItem = media.find(m => m.id === itemId);
    console.log('🖼️ [DEBUG] Image loaded successfully:', {
      itemId,
      name: mediaItem?.name,
      file_url_preview: mediaItem?.file_url?.substring(0, 50) + '...'
    });
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      console.log('🖼️ [DEBUG] Updated imageLoading state, remaining:', Array.from(newSet));
      return newSet;
    });
  };

  const handleImageError = (itemId: string, url: string) => {
    console.log('❌ [DEBUG] handleImageError() called for itemId:', itemId);
    console.log('❌ [DEBUG] Error details:', {
      itemId,
      url: url?.substring(0, 100) + '...',
      alreadyRetried: retriedMedia.has(itemId),
      retriedCount: retriedMedia.size
    });
    
    const mediaItem = media.find(m => m.id === itemId);
    console.log('📄 [DEBUG] Media item with error:', mediaItem ? {
      id: mediaItem.id,
      name: mediaItem.name,
      file_type: mediaItem.file_type,
      file_url: mediaItem.file_url?.substring(0, 50) + '...',
      folder: mediaItem.folder
    } : 'NOT FOUND');
    
    // Prevent infinite retry loops - if we've already retried this item, just mark it as error
    if (retriedMedia.has(itemId)) {
      console.log('⚠️ [DEBUG] Already retried this item, marking as error');
      setImageLoadErrors(prev => new Set(prev).add(itemId));
      setImageLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      return;
    }

    // If URL is already a fallback path (starts with /media/whatsapp), don't try to reload
    // This means we've already tried localStorage and it's not there
    if (url.startsWith('/media/whatsapp/')) {
      // Extract relative path and check localStorage silently one more time
      const relativePath = url.replace(/^\/media\/whatsapp\//, '');
      const storedUrl = localMediaStorage.getMediaUrl(relativePath, true); // silent mode
      
      // If still not found, mark as error
      if (!storedUrl || storedUrl === url || !storedUrl.startsWith('data:')) {
        setRetriedMedia(prev => new Set(prev).add(itemId));
        setImageLoadErrors(prev => new Set(prev).add(itemId));
        setImageLoading(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
        return;
      }
      
      // Found in localStorage, update and retry
      setRetriedMedia(prev => new Set(prev).add(itemId));
      setMedia(prev => prev.map(item => 
        item.id === itemId ? { ...item, file_url: storedUrl } : item
      ));
      return;
    }
    
    // Try to reload from local storage if it's not a data URL
    if (mediaItem && !url.startsWith('data:')) {
      // Extract relative path from the stored file_url
      // Handle both formats: relative path or full path
      let originalPath = mediaItem.file_url;
      if (originalPath.startsWith('/media/whatsapp/')) {
        originalPath = originalPath.replace(/^\/media\/whatsapp\//, '');
      }
      
      // Try to get from localStorage (silent mode to avoid duplicate warnings)
      const storedUrl = localMediaStorage.getMediaUrl(originalPath, true);
      
      if (storedUrl && storedUrl !== url && storedUrl.startsWith('data:')) {
        // Found in localStorage, update and retry
        setRetriedMedia(prev => new Set(prev).add(itemId));
        setMedia(prev => prev.map(item => 
          item.id === itemId ? { ...item, file_url: storedUrl } : item
        ));
        return; // Don't mark as error yet, let it try the new URL
      }
    }
    
    // Mark as retried and error
    setRetriedMedia(prev => new Set(prev).add(itemId));
    setImageLoadErrors(prev => new Set(prev).add(itemId));
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBackupRestore(true)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                title="Backup & Restore"
              >
                <Database className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
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
                      imageLoadErrors.has(item.id) ? (
                        // Error State - Show fallback
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
                          <ImageIcon className="w-12 h-12 text-red-300 mb-2" />
                          <p className="text-xs text-red-600 text-center font-medium">Failed to load</p>
                          <p className="text-xs text-gray-500 text-center mt-1 truncate w-full px-2">{item.file_name}</p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => {
                                // Retry loading the image
                                setImageLoadErrors(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(item.id);
                                  return newSet;
                                });
                                setImageLoading(prev => new Set(prev).add(item.id));
                                // Force image reload by updating the URL with a cache buster
                                setMedia(prevMedia => prevMedia.map(m => 
                                  m.id === item.id ? { ...m, file_url: m.file_url + '?reload=' + Date.now() } : m
                                ));
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Retry
                            </button>
                            <a 
                              href={item.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                              title={item.file_url}
                            >
                              Open URL
                            </a>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Loading State */}
                          {imageLoading.has(item.id) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                          )}
                          {/* Actual Image */}
                          <img 
                            src={item.file_url} 
                            alt={item.name}
                            className="w-full h-full object-contain bg-white"
                            onLoad={() => handleImageLoad(item.id)}
                            onError={() => handleImageError(item.id, item.file_url)}
                            loading="lazy"
                            title={item.name}
                          />
                        </>
                      )
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-600">
              💡 Tip: All media is stored locally in your browser. Max file size: 16MB (WhatsApp limit)
            </p>
            <div className="flex items-center gap-2">
              {imageLoadErrors.size > 0 && (
                <button
                  onClick={() => {
                    // Retry all failed images
                    setImageLoadErrors(new Set());
                    loadMedia();
                    toast.success('Reloading all images...');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Reload All Images ({imageLoadErrors.size})
                </button>
              )}
              <button
                onClick={() => setShowBackupRestore(true)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                title="Backup & Restore Media"
              >
                <Database className="w-4 h-4" />
                Backup & Restore
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Restore Modal */}
      {showBackupRestore && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <MediaBackupRestore onClose={() => setShowBackupRestore(false)} />
          </div>
        </div>
      )}

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
                <div className="relative">
                  <img 
                    src={selectedMedia.file_url} 
                    alt={selectedMedia.name}
                    className="w-full max-h-[70vh] object-contain rounded-lg bg-gray-50"
                    onError={(e) => {
                      console.error('Preview image failed to load:', selectedMedia.file_url);
                      (e.target as HTMLImageElement).style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'w-full h-64 flex flex-col items-center justify-center bg-red-50 rounded-lg';
                      errorDiv.innerHTML = `
                        <svg class="w-16 h-16 text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p class="text-red-600 font-medium">Failed to load image</p>
                        <p class="text-sm text-gray-500 mt-2">${selectedMedia.file_name}</p>
                      `;
                      (e.target as HTMLElement).parentElement?.appendChild(errorDiv);
                    }}
                  />
                </div>
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


/**
 * [YourFeature]Page.tsx
 * 
 * Template for creating new pages that use modals
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import { toast } from 'react-hot-toast';
import [YourFeature]Modal from '../components/[YourFeature]Modal';
import { useAuth } from '../../context/AuthContext';

const [YourFeature]Page: React.FC = () => {
  const { currentUser } = useAuth();
  
  // State
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Load data on mount
  useEffect(() => {
    loadItems();
  }, []);

  // Load items
  const loadItems = async () => {
    setLoading(true);
    try {
      // Your data loading logic
      // const data = await yourApi.getItems();
      // setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      // Your delete logic
      // await yourApi.deleteItem(item.id);
      toast.success('Item deleted successfully');
      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      // Your create logic
      // await yourApi.createItem(data);
      toast.success('Item created successfully');
      setIsCreateModalOpen(false);
      loadItems();
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
      throw error;
    }
  };

  const handleEditSubmit = async (data: any) => {
    try {
      // Your update logic
      // await yourApi.updateItem(selectedItem.id, data);
      toast.success('Item updated successfully');
      setIsEditModalOpen(false);
      setSelectedItem(null);
      loadItems();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
      throw error;
    }
  };

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            [Your Feature Name]
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your items here
          </p>
        </div>
        <GlassButton onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </GlassButton>
      </div>

      {/* Search */}
      <GlassCard className="p-4 mb-6">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <GlassInput
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
      </GlassCard>

      {/* Content */}
      <GlassCard className="p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No items found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Modals */}
      <[YourFeature]Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      <[YourFeature]Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={handleEditSubmit}
        data={selectedItem}
      />
    </div>
  );
};

export default [YourFeature]Page;


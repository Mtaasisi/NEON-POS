/**
 * Blacklist Management Modal
 * GDPR-compliant opt-out system for WhatsApp bulk messaging
 * 
 * Features:
 * - View all blacklisted numbers
 * - Add/remove from blacklist
 * - Import blacklist from CSV
 * - Export blacklist to CSV
 * - Auto-detect "STOP" commands
 * - Link to customer records
 * - Search and filter
 */

import React, { useState, useEffect } from 'react';
import { X, UserX, Upload, Download, Search, Trash2, Plus, AlertCircle, CheckCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import whatsappAdvancedService from '../../../services/whatsappAdvancedService';
import type { BlacklistEntry } from '../../../types/whatsapp-advanced';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function BlacklistManagementModal({ isOpen, onClose, onUpdate }: Props) {
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBlacklist();
    }
  }, [isOpen]);

  async function loadBlacklist() {
    try {
      setLoading(true);
      const data = await whatsappAdvancedService.blacklist.getAll();
      setBlacklist(data);
    } catch (error) {
      console.error('Error loading blacklist:', error);
      toast.error('Failed to load blacklist');
    } finally {
      setLoading(false);
    }
  }

  async function addToBlacklist() {
    if (!newPhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    // Validate phone format
    const cleaned = newPhone.replace(/[^\d+]/g, '');
    if (cleaned.length < 10) {
      toast.error('Invalid phone number format');
      return;
    }

    try {
      await whatsappAdvancedService.blacklist.add(newPhone, newReason || 'Manual addition', newNotes);
      toast.success('Number added to blacklist');
      
      // Reset form
      setNewPhone('');
      setNewReason('');
      setNewNotes('');
      setShowAddForm(false);
      
      // Reload
      loadBlacklist();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to add to blacklist');
    }
  }

  async function removeFromBlacklist(phone: string) {
    if (!confirm(`Remove ${phone} from blacklist?`)) return;

    try {
      await whatsappAdvancedService.blacklist.remove(phone);
      toast.success('Number removed from blacklist');
      loadBlacklist();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to remove from blacklist');
    }
  }

  async function handleCsvImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const phones = lines.slice(1).map(line => {
        const [phone] = line.split(',');
        return phone.trim();
      }).filter(p => p);

      const result = await whatsappAdvancedService.blacklist.importFromCSV(phones, 'CSV import');
      toast.success(`Imported ${result.added} numbers (${result.skipped} skipped)`);
      loadBlacklist();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to import CSV');
    }
  }

  function exportToCSV() {
    const csv = [
      'phone,reason,opted_out_at,notes',
      ...blacklist.map(b => `${b.phone},${b.reason || ''},${b.opted_out_at},${b.notes || ''}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-blacklist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Blacklist exported!');
  }

  const filteredBlacklist = blacklist.filter(entry => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return entry.phone.toLowerCase().includes(search) || 
           entry.reason?.toLowerCase().includes(search);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-red-600 to-rose-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <UserX className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Blacklist Management</h2>
                <p className="text-red-100">Manage opt-outs and blocked numbers</p>
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

        {/* Stats & Actions Bar */}
        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-600">Total Blacklisted</p>
                <p className="text-3xl font-bold text-red-600">{blacklist.length}</p>
              </div>
              <div className="text-sm text-gray-600">
                <p>These numbers will <strong>NOT</strong> receive any bulk messages</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Number
              </button>
              <button
                onClick={exportToCSV}
                disabled={blacklist.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvImport}
                  className="hidden"
                />
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blacklist by phone or reason..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
            />
          </div>
        </div>

        {/* Blacklist Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : filteredBlacklist.length === 0 ? (
            <div className="text-center py-20">
              <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'No matches found' : 'No blacklisted numbers yet'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Numbers added here will be excluded from all bulk campaigns
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBlacklist.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-4 bg-white border-2 border-red-200 rounded-xl hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserX className="w-6 h-6 text-red-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-base">{entry.phone}</p>
                    <p className="text-sm text-gray-600">
                      Reason: {entry.reason || 'Not specified'}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Added: {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => removeFromBlacklist(entry.phone)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">🛡️ GDPR Compliance:</p>
              <p>Blacklisted numbers are automatically excluded from all bulk campaigns. System also auto-detects and blocks users who reply with "STOP", "UNSUBSCRIBE", or similar commands.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Blacklist Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 bg-gradient-to-r from-red-600 to-rose-600">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Add to Blacklist</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPhone('');
                    setNewReason('');
                    setNewNotes('');
                  }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+255712345678"
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Reason
                </label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                >
                  <option value="">Select reason...</option>
                  <option value="stop_command">Customer requested (STOP)</option>
                  <option value="manual">Manual addition</option>
                  <option value="spam_report">Spam report</option>
                  <option value="invalid_number">Invalid number</option>
                  <option value="complaint">Customer complaint</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 resize-none"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPhone('');
                    setNewReason('');
                    setNewNotes('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={addToBlacklist}
                  disabled={!newPhone.trim()}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add to Blacklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


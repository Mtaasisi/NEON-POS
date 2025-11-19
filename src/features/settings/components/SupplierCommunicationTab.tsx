import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, Phone, Mail, Video, MessageSquare, Calendar, Plus, X, Save,
  User, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import {
  getSupplierCommunications,
  createSupplierCommunication,
  updateSupplierCommunication,
  type SupplierCommunication
} from '../../../lib/supplierCommunicationsApi';

interface SupplierCommunicationTabProps {
  supplierId: string;
  supplierName: string;
}

const COMMUNICATION_TYPES = [
  { value: 'email', label: 'Email', icon: Mail, color: 'text-blue-500' },
  { value: 'phone', label: 'Phone Call', icon: Phone, color: 'text-green-500' },
  { value: 'meeting', label: 'Meeting', icon: Video, color: 'text-purple-500' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
  { value: 'wechat', label: 'WeChat', icon: MessageSquare, color: 'text-green-500' },
  { value: 'sms', label: 'SMS', icon: MessageSquare, color: 'text-orange-500' },
  { value: 'other', label: 'Other', icon: MessageCircle, color: 'text-gray-500' }
];

const SupplierCommunicationTab: React.FC<SupplierCommunicationTabProps> = ({
  supplierId,
  supplierName
}) => {
  const [communications, setCommunications] = useState<SupplierCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [commType, setCommType] = useState('email');
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    loadCommunications();
  }, [supplierId]);

  const loadCommunications = async () => {
    try {
      setLoading(true);
      const data = await getSupplierCommunications(supplierId);
      setCommunications(data);
    } catch (error) {
      console.error('Error loading communications:', error);
      toast.error('Failed to load communications');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    try {
      setSubmitting(true);
      await createSupplierCommunication({
        supplier_id: supplierId,
        communication_type: commType,
        direction,
        subject,
        message: message || undefined,
        notes: notes || undefined,
        contact_person: contactPerson || undefined,
        follow_up_required: followUpRequired,
        follow_up_date: followUpRequired && followUpDate ? followUpDate : undefined
      });

      toast.success('Communication logged successfully');
      setShowAddModal(false);
      resetForm();
      loadCommunications();
    } catch (error) {
      console.error('Error logging communication:', error);
      toast.error('Failed to log communication');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await updateSupplierCommunication(id, {
        follow_up_required: false
      });
      toast.success('Follow-up marked as complete');
      loadCommunications();
    } catch (error) {
      console.error('Error updating communication:', error);
      toast.error('Failed to update communication');
    }
  };

  const resetForm = () => {
    setCommType('email');
    setDirection('outbound');
    setSubject('');
    setMessage('');
    setNotes('');
    setContactPerson('');
    setFollowUpRequired(false);
    setFollowUpDate('');
  };

  const getTypeIcon = (type: string) => {
    const commType = COMMUNICATION_TYPES.find(t => t.value === type);
    if (!commType) return <MessageCircle className="w-5 h-5" />;
    const Icon = commType.icon;
    return <Icon className={`w-5 h-5 ${commType.color}`} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading communications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">Communication History</h4>
          <p className="text-xs text-gray-500">Track all interactions with {supplierName}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors inline-flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Log Communication
        </button>
      </div>

      {/* Communications Timeline */}
      {communications.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Communications</h4>
          <p className="text-gray-600 mb-6">Start logging communications with this supplier</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Log Communication
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {communications.map((comm) => (
            <GlassCard key={comm.id} className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="mt-1">
                  {getTypeIcon(comm.communication_type)}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{comm.subject}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          comm.direction === 'inbound' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {comm.direction === 'inbound' ? 'Received' : 'Sent'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(comm.created_at).toLocaleString()}
                        </span>
                        {comm.contact_person && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {comm.contact_person}
                          </span>
                        )}
                      </div>
                    </div>

                    {comm.follow_up_required && (
                      <button
                        onClick={() => handleMarkComplete(comm.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 transition-colors text-sm"
                      >
                        <Clock size={14} />
                        Follow-up Required
                      </button>
                    )}
                  </div>

                  {comm.message && (
                    <p className="text-gray-700 text-sm mb-2">{comm.message}</p>
                  )}

                  {comm.notes && (
                    <p className="text-gray-600 text-sm italic">{comm.notes}</p>
                  )}

                  {comm.follow_up_date && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-yellow-700">
                      <AlertCircle size={14} />
                      <span>Follow-up by: {new Date(comm.follow_up_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Add Communication Modal */}
      {showAddModal && (
        <>
          <div 
            className="fixed bg-black/50"
            onClick={() => {
              if (!submitting) {
                setShowAddModal(false);
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
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              style={{ pointerEvents: 'auto' }}
            >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Log Communication</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Communication Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    value={commType}
                    onChange={(e) => setCommType(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {COMMUNICATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Direction *
                  </label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'inbound' | 'outbound')}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="outbound">Outbound (Sent)</option>
                    <option value="inbound">Inbound (Received)</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Brief subject or title"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person (Optional)
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Who did you communicate with?"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={submitting}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="What was discussed?"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Private notes about this communication"
                />
              </div>

              {/* Follow-up */}
              <div className="border-t border-gray-200 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUpRequired}
                    onChange={(e) => setFollowUpRequired(e.target.checked)}
                    disabled={submitting}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Requires Follow-up</span>
                </label>

                {followUpRequired && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Communication
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

export default SupplierCommunicationTab;


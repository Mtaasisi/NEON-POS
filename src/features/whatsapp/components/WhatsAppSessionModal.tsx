/**
 * WhatsApp Session Management Modal
 * Manage WhatsApp sessions: create, connect, view QR code, disconnect
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, RefreshCw, Smartphone, QrCode, CheckCircle, XCircle, Loader, Trash2, Settings, Phone, Link, Zap, Eye, EyeOff, Copy, Key } from 'lucide-react';
import whatsappSessionService, { WhatsAppSession, CreateSessionPayload } from '../../../services/whatsappSessionService';
import { toast } from 'react-hot-toast';

interface WhatsAppSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionConnected?: (session: WhatsAppSession) => void;
}

export default function WhatsAppSessionModal({ isOpen, onClose, onSessionConnected }: WhatsAppSessionModalProps) {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [qrPolling, setQrPolling] = useState<NodeJS.Timeout | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [integrationNotConfigured, setIntegrationNotConfigured] = useState(false);
  
  // Create form state
  const [formData, setFormData] = useState<CreateSessionPayload>({
    name: '',
    phone_number: '',
    account_protection: true,
    log_messages: true,
    webhook_enabled: false,
    webhook_url: '',
    webhook_events: ['messages.received', 'messages.upsert', 'session.status'],
    read_incoming_messages: false,
    auto_reject_calls: false,
  });

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }

    return () => {
      if (qrPolling) {
        clearInterval(qrPolling);
      }
    };
  }, [isOpen]);

  const loadSessions = async () => {
    setLoading(true);
    setIntegrationNotConfigured(false);
    try {
      const result = await whatsappSessionService.getAllSessions();
      if (result.success) {
        setSessions(result.data);
        setIntegrationNotConfigured(false);
      } else {
        // Check if error is about missing/disabled integration or authentication
        const errorMsg = result.error || '';
        if (errorMsg.includes('not configured') || 
            errorMsg.includes('disabled') || 
            errorMsg.includes('Authentication failed') ||
            errorMsg.includes('API token is missing')) {
          setIntegrationNotConfigured(true);
        } else {
          toast.error(errorMsg || 'Failed to load sessions');
        }
      }
    } catch (error: any) {
      // Check if error is about missing/disabled integration or authentication
      const errorMsg = error?.message || '';
      if (errorMsg.includes('not configured') || 
          errorMsg.includes('disabled') || 
          errorMsg.includes('Authentication failed') ||
          errorMsg.includes('API token is missing')) {
        setIntegrationNotConfigured(true);
      } else {
        console.error('Error loading sessions:', error);
        toast.error(errorMsg || 'Failed to load sessions');
      }
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!formData.name || !formData.phone_number) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await whatsappSessionService.createSession(formData);
      if (result.success && result.data) {
        toast.success('Session created successfully!');
        setShowCreateForm(false);
        setFormData({
          name: '',
          phone_number: '',
          account_protection: true,
          log_messages: true,
          webhook_enabled: false,
          webhook_url: '',
          webhook_events: ['messages.received', 'messages.upsert', 'session.status'],
          read_incoming_messages: false,
          auto_reject_calls: false,
        });
        loadSessions();
      } else {
        toast.error(result.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const connectSession = async (session: WhatsAppSession) => {
    setSelectedSession(session);
    setLoadingQR(true);
    setQrCode(null);

    try {
      const result = await whatsappSessionService.connectSession(session.id);
      if (result.success) {
        toast.success('Connecting... Please scan QR code');
        
        // Start polling for QR code and status
        startQRPolling(session.id);
      } else {
        toast.error(result.error || 'Failed to connect session');
        setLoadingQR(false);
      }
    } catch (error) {
      console.error('Error connecting session:', error);
      toast.error('Failed to connect session');
      setLoadingQR(false);
    }
  };

  const startQRPolling = (sessionId: number) => {
    // Clear any existing polling
    if (qrPolling) {
      clearInterval(qrPolling);
    }

    // Poll every 2 seconds for QR code and status
    const interval = setInterval(async () => {
      try {
        // Get QR code
        const qrResult = await whatsappSessionService.getQRCode(sessionId);
        if (qrResult.success && qrResult.qr_code) {
          setQrCode(qrResult.qr_code);
          setLoadingQR(false);
        }

        // Check status
        const statusResult = await whatsappSessionService.getSessionStatus(sessionId);
        if (statusResult.success && statusResult.status === 'connected') {
          clearInterval(interval);
          setQrPolling(null);
          setQrCode(null);
          setSelectedSession(null);
          toast.success('WhatsApp connected successfully!');
          loadSessions();
          
          // Notify parent component
          const session = sessions.find(s => s.id === sessionId);
          if (session && onSessionConnected) {
            onSessionConnected(session);
          }
        }
      } catch (error) {
        console.error('Error polling QR code:', error);
      }
    }, 2000);

    setQrPolling(interval);

    // Stop polling after 60 seconds
    setTimeout(() => {
      if (qrPolling) {
        clearInterval(interval);
        setQrPolling(null);
        setLoadingQR(false);
        toast.error('QR code expired. Please try again.');
      }
    }, 60000);
  };

  const disconnectSession = async (session: WhatsAppSession) => {
    const confirm = window.confirm(`Are you sure you want to disconnect "${session.name}"?`);
    if (!confirm) return;

    try {
      const result = await whatsappSessionService.disconnectSession(session.id);
      if (result.success) {
        toast.success('Session disconnected');
        loadSessions();
      } else {
        toast.error(result.error || 'Failed to disconnect session');
      }
    } catch (error) {
      console.error('Error disconnecting session:', error);
      toast.error('Failed to disconnect session');
    }
  };

  const deleteSession = async (session: WhatsAppSession) => {
    const confirm = window.confirm(`Are you sure you want to delete "${session.name}"? This cannot be undone.`);
    if (!confirm) return;

    try {
      const result = await whatsappSessionService.deleteSession(session.id);
      if (result.success) {
        toast.success('Session deleted');
        loadSessions();
      } else {
        toast.error(result.error || 'Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const restartSession = async (session: WhatsAppSession) => {
    try {
      const result = await whatsappSessionService.restartSession(session.id);
      if (result.success) {
        toast.success('Session restarted');
        loadSessions();
      } else {
        toast.error(result.error || 'Failed to restart session');
      }
    } catch (error) {
      console.error('Error restarting session:', error);
      toast.error('Failed to restart session');
    }
  };

  const syncFromWasender = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/whatsapp-sessions/sync-from-wasender', {
        method: 'POST',
      });
      
      // Always try to parse JSON response
      const data = await response.json().catch(() => ({ 
        success: false, 
        error: 'Invalid server response' 
      }));
      
      if (response.ok && data.success) {
        toast.success(data.message || 'Sessions synced successfully!');
        loadSessions(); // Reload to show imported sessions
      } else {
        // Handle error responses properly
        const errorMessage = data.error || `Server error: ${response.status} ${response.statusText}`;
        toast.error(errorMessage);
        console.warn('Sync from WasenderAPI failed:', errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error syncing from WasenderAPI:', error);
      toast.error(`Failed to sync sessions: ${errorMessage}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">WhatsApp Sessions</h2>
                <p className="text-sm text-green-100">Manage your WhatsApp Business connections</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* QR Code View */}
          {selectedSession && (
            <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Connect WhatsApp</h3>
                  <p className="text-sm text-gray-600">Scan QR code with WhatsApp mobile app</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSession(null);
                    setQrCode(null);
                    if (qrPolling) {
                      clearInterval(qrPolling);
                      setQrPolling(null);
                    }
                  }}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-8">
                {loadingQR ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader className="w-12 h-12 text-green-600 animate-spin" />
                    <p className="text-gray-600 font-medium">Generating QR code...</p>
                  </div>
                ) : qrCode ? (
                  <div className="bg-white p-4 rounded-2xl shadow-lg">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                    <p className="text-center text-sm text-gray-600 mt-4">
                      Open WhatsApp → Settings → Linked Devices → Link a Device
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">QR code will appear here...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!integrationNotConfigured && (
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Your Sessions</h3>
              <div className="flex gap-2">
                <button
                  onClick={syncFromWasender}
                  disabled={syncing || loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  title="Import sessions from WasenderAPI"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sync from API
                </button>
                <button
                  onClick={loadSessions}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Session
                </button>
              </div>
            </div>
          )}

          {/* Create Session Form */}
          {showCreateForm && (
            <div className="mb-6 p-6 bg-gray-50 rounded-2xl border-2 border-gray-200">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Create New Session</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Business WhatsApp"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+1234567890"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.account_protection}
                    onChange={(e) => setFormData({ ...formData, account_protection: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-900">Account Protection</span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.log_messages}
                    onChange={(e) => setFormData({ ...formData, log_messages: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-900">Log Messages</span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.read_incoming_messages}
                    onChange={(e) => setFormData({ ...formData, read_incoming_messages: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-900">Auto-Read Messages</span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.auto_reject_calls}
                    onChange={(e) => setFormData({ ...formData, auto_reject_calls: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-900">Auto-Reject Calls</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={createSession}
                  disabled={loading || !formData.name || !formData.phone_number}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all font-semibold"
                >
                  {loading ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </div>
          )}

          {/* Integration Not Configured Warning */}
          {integrationNotConfigured && (
            <div className="mb-6 p-6 bg-amber-50 border-2 border-amber-300 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 mb-2 text-lg">WhatsApp Integration Not Configured</h4>
                  <p className="text-sm text-amber-800 mb-4">
                    To use WhatsApp features, you need to configure the WaSender API integration first.
                  </p>
                  <div className="space-y-3">
                    <div className="text-sm text-amber-900 font-medium">Steps to configure:</div>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-amber-800 ml-2">
                      <li>Go to <span className="font-semibold">Admin Settings → Integrations</span></li>
                      <li>Find <span className="font-semibold">WhatsApp (WaSender)</span> integration</li>
                      <li>Enter your WaSender API Bearer Token</li>
                      <li>Enable the integration and save</li>
                      <li>Come back here to create or import WhatsApp sessions</li>
                    </ol>
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <p className="text-xs text-amber-700">
                        Don't have a WaSender account? Visit <a href="https://wasenderapi.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-amber-900">wasenderapi.com</a> to get started.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import Notice */}
          {!integrationNotConfigured && sessions.length === 0 && !showCreateForm && (
            <div className="mb-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 mb-2">Already Have Sessions on WasenderAPI?</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    If you've already created sessions on WasenderAPI dashboard, click "Sync from API" to import them into this system.
                  </p>
                  <button
                    onClick={syncFromWasender}
                    disabled={syncing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 font-semibold"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Importing...' : 'Import Existing Sessions'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sessions List */}
          {loading && sessions.length === 0 && !integrationNotConfigured ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-8 h-8 text-green-600 animate-spin mb-3" />
              <p className="text-gray-600">Loading sessions...</p>
            </div>
          ) : !integrationNotConfigured && sessions.length === 0 && !showCreateForm ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Smartphone className="w-16 h-16 text-gray-400 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">No sessions yet</h3>
              <p className="text-gray-600 mb-4">Create your first WhatsApp session to get started</p>
              <div className="flex gap-3">
                <button
                  onClick={syncFromWasender}
                  disabled={syncing}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 font-semibold"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Importing...' : 'Import from WasenderAPI'}
                </button>
                <span className="text-gray-400 flex items-center">or</span>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2 font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Create New Session
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-5 rounded-2xl border-2 transition-all ${
                    session.status === 'connected'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        session.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900">{session.name}</h4>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                          <Phone className="w-3 h-3" />
                          {session.phone_number}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            session.status === 'connected'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-400 text-white'
                          }`}>
                            {session.status === 'connected' ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Connected
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Disconnected
                              </span>
                            )}
                          </span>
                          {session.account_protection && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                              Protected
                            </span>
                          )}
                          {session.log_messages && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                              Logging
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {session.status !== 'connected' ? (
                      <button
                        onClick={() => connectSession(session)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-semibold"
                      >
                        <Link className="w-4 h-4" />
                        Connect
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => disconnectSession(session)}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all flex items-center gap-2 text-sm font-semibold"
                        >
                          <XCircle className="w-4 h-4" />
                          Disconnect
                        </button>
                        <button
                          onClick={() => restartSession(session)}
                          className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all flex items-center gap-2 text-sm font-semibold"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Restart
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteSession(session)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} • {sessions.filter(s => s.status === 'connected').length} connected
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-all font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


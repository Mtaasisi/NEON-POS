import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, FileText, Calendar, User, Clock, Save, Send, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../lib/branchAwareApi';
import { useAuth } from '../../../context/AuthContext';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType?: 'daily' | 'monthly';
  editReport?: any; // For editing existing reports
  onSuccess?: () => void;
}

interface ReportData {
  id?: string;
  report_type: 'daily' | 'monthly';
  report_date: string;
  report_month?: string;
  title: string;
  customer_interactions: string;
  pending_work: string;
  recommendations: string;
  additional_notes: string;
  customers_served: number;
  sales_made: number;
  issues_resolved: number;
  pending_tasks: number;
  status: 'draft' | 'submitted';
}

const REPORT_TEMPLATES = {
  technician: {
    daily: {
      title: "REPORT YA LEO - TEKNISIANI",
      customer_interactions: "Leo nimepokea vifaa V vya kutengeneza. Vifaa vilivyokamilika: X. Wateja waliofika kuangalia maendeleo:",
      pending_work: "Vifaa bado kwenye repair: • iPhone 15 Pro Max - screen • Samsung A54 - battery • Huawei P40 - charging port",
      recommendations: "Mapendekezo: • Spare parts zinahitajika: screens x5, batteries x3 • Mafunzo ya ziada kwenye complex repairs",
      additional_notes: ""
    },
    monthly: {
      title: "REPORT YA MWEZI - TEKNISIANI",
      customer_interactions: "Katika mwezi huu, nimetengeneza vifaa V jumla. Maelezo ya kazi: • Screen repairs: X • Battery replacements: Y • Software issues: Z",
      pending_work: "Vifaa bado pending mwishoni mwa mwezi: • Complex motherboard repairs • Waiting for spare parts",
      recommendations: "Mapendekezo ya kuboresha: • Ongeza inventory ya spare parts • Training kwenye latest models",
      additional_notes: ""
    }
  },
  'customer-care': {
    daily: {
      title: "REPORT YA LEO - HUDUMA KWA WATEJA",
      customer_interactions: "Leo nimehudumia wateja X. Mauzi yaliyofanyika: TZS Y. Wateja waliofika: • Walk-ins: A • Appointments: B • WhatsApp inquiries: C",
      pending_work: "Masuala ya wateja yaliyopo pending: • Device diagnostics pending • Price quotations needed • Follow-ups required",
      recommendations: "Mapendekezo: • Improve appointment booking system • Add more customer education materials",
      additional_notes: ""
    },
    monthly: {
      title: "REPORT YA MWEZI - HUDUMA KWA WATEJA",
      customer_interactions: "Katika mwezi huu, jumla ya wateja X walihudumiwa. Mauzi jumla: TZS Y. Maelezo: • New customers: A • Returning customers: B • Support calls resolved: C",
      pending_work: "Masuala pending mwishoni mwa mwezi: • Customer feedback follow-ups • Warranty claims processing",
      recommendations: "Mapendekezo ya kuboresha: • Enhance loyalty program • Improve customer communication channels",
      additional_notes: ""
    }
  },
  sales: {
    daily: {
      title: "REPORT YA LEO - MAUZI",
      customer_interactions: "Leo nimefanya mauzi ya bidhaa X, jumla TZS Y. Wateja waliohudumiwa: A. Mauzo makubwa: • iPhone 15 Pro Max • Samsung accessories",
      pending_work: "Masuala ya mauzi pending: • Price negotiations ongoing • Product demonstrations scheduled • Customer follow-ups needed",
      recommendations: "Mapendekezo: • Focus on high-margin products • Improve product display • Add sales training",
      additional_notes: ""
    },
    monthly: {
      title: "REPORT YA MWEZI - MAUZI",
      customer_interactions: "Katika mwezi huu, mauzi jumla TZS X yamefikiwa. Maelezo: • Target achieved: Y% • Top products sold: iPhones, Samsung phones • Customer conversions: Z%",
      pending_work: "Mauzo pending: • Large corporate orders • Bulk accessory purchases",
      recommendations: "Mapendekezo ya kuongeza mauzi: • Marketing campaigns • Product bundles • Customer referral program",
      additional_notes: ""
    }
  },
  admin: {
    daily: {
      title: "REPORT YA LEO - USIMAMIZI",
      customer_interactions: "Nimefuatilia shughuli zote za leo. Jumla wateja: X. Mauzi jumla: TZS Y. Vifaa vya repair: Z",
      pending_work: "Masuala ya usimamizi pending: • Staff scheduling • Inventory replenishment • System maintenance",
      recommendations: "Mapendekezo: • Optimize staff allocation • Improve inventory management • System performance monitoring",
      additional_notes: ""
    },
    monthly: {
      title: "REPORT YA MWEZI - USIMAMIZI",
      customer_interactions: "Mfuatilio wa mwezi mzima: • Jumla wateja: X • Mauzi jumla: TZS Y • Profit margin: Z% • Staff performance ratings",
      pending_work: "Masuala ya usimamizi pending: • Monthly financial reports • Staff performance reviews • System backups",
      recommendations: "Mapendekezo ya kuboresha: • Process automation • Staff training programs • Customer satisfaction surveys",
      additional_notes: ""
    }
  },
  manager: {
    daily: {
      title: "REPORT YA LEO - USIMAMIZI WA TIMU",
      customer_interactions: "Nimefuatilia timu ya leo. Jumla shughuli: • Technicians: X repairs • Sales: TZS Y revenue • Customer care: Z interactions",
      pending_work: "Masuala ya timu pending: • Staff performance reviews • Training sessions needed • Team coordination issues",
      recommendations: "Mapendekezo: • Improve team communication • Staff motivation programs • Process optimization",
      additional_notes: ""
    },
    monthly: {
      title: "REPORT YA MWEZI - USIMAMIZI WA TIMU",
      customer_interactions: "Mfuatilio wa timu mwezi mzima: • Overall performance: Excellent • Key achievements: Target exceeded by X% • Team challenges: Staff turnover",
      pending_work: "Masuala ya timu pending: • Performance evaluations • Training budget allocation • Succession planning",
      recommendations: "Mapendekezo ya kuboresha timu: • Professional development programs • Performance incentives • Work-life balance initiatives",
      additional_notes: ""
    }
  },
  user: {
    daily: {
      title: "REPORT YA LEO - KAZI ZA UFUNZI",
      customer_interactions: "Leo nimefanya kazi za msingi katika duka. Shughuli zilizofanyika: • Customer assistance • Basic device checks • Inventory organization",
      pending_work: "Kazi zilizopo pending: • Learning advanced repair techniques • Customer service training • Product knowledge improvement",
      recommendations: "Mapendekezo: • More hands-on training • Mentorship program • Clear job responsibilities",
      additional_notes: ""
    },
    monthly: {
      title: "REPORT YA MWEZI - KAZI ZA UFUNZI",
      customer_interactions: "Katika mwezi huu, nimejifunza na kusaidia katika shughuli mbalimbali za duka. Maendeleo: • Basic skills acquired • Customer interaction experience",
      pending_work: "Masuala ya maendeleo pending: • Advanced training modules • Certification programs • Specialized skill development",
      recommendations: "Mapendekezo ya kuboresha: • Structured training program • Performance feedback system • Career development path",
      additional_notes: ""
    }
  }
};

const DailyReportModal: React.FC<DailyReportModalProps> = ({
  isOpen,
  onClose,
  reportType = 'daily',
  editReport,
  onSuccess
}) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ReportData>({
    report_type: reportType,
    report_date: new Date().toISOString().split('T')[0],
    title: '',
    customer_interactions: '',
    pending_work: '',
    recommendations: '',
    additional_notes: '',
    customers_served: 0,
    sales_made: 0,
    issues_resolved: 0,
    pending_tasks: 0,
    status: 'draft'
  });

  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pendingItems, setPendingItems] = useState<string[]>(['']);

  // Get user role for template selection
  const userRole = currentUser?.role || 'technician';
  const templateKey = userRole === 'customer-care' ? 'customer-care' : userRole;

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const canSubmit = data.customer_interactions.trim().length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave(false);
      }

      // Ctrl+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canSubmit) {
          handleSave(true);
        }
      }

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Ctrl+Shift+P to add pending item
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        addPendingItem();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canSubmit, onClose]);

  // Initialize data from template or edit report
  useEffect(() => {
    if (isOpen) {
      if (editReport) {
        // Filter out the user field that comes from JOIN queries
        const { user, ...reportData } = editReport;
        setData({
          ...reportData,
          report_date: editReport.report_date || new Date().toISOString().split('T')[0],
        });
        setPendingItems(editReport.pending_work ? editReport.pending_work.split('\n').filter((item: string) => item.trim()) : ['']);
      } else {
        const template = REPORT_TEMPLATES[templateKey as keyof typeof REPORT_TEMPLATES]?.[reportType] ||
                        REPORT_TEMPLATES.technician[reportType];

        setData({
          report_type: reportType,
          report_date: new Date().toISOString().split('T')[0],
          report_month: reportType === 'monthly' ? new Date().toISOString().substring(0, 7) + '-01' : undefined,
          title: template.title,
          customer_interactions: template.customer_interactions,
          pending_work: template.pending_work,
          recommendations: template.recommendations,
          additional_notes: template.additional_notes,
          customers_served: 0,
          sales_made: 0,
          issues_resolved: 0,
          pending_tasks: 0,
          status: 'draft'
        });
        setPendingItems(['']);
      }
    }
  }, [isOpen, reportType, templateKey, editReport]);

  // Auto-save draft functionality
  const autoSave = useCallback(async () => {
    if (!data.title && !data.customer_interactions) return; // Don't save empty drafts

    try {
      const saveData = {
        ...data,
        user_id: currentUser?.id,
        branch_id: getCurrentBranchId(),
        updated_at: new Date().toISOString()
      };

      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('daily_reports')
          .update(saveData)
          .eq('id', data.id);

        if (error) throw error;
      } else {
        // Create new draft
        const { data: newReport, error } = await supabase
          .from('daily_reports')
          .insert(saveData)
          .select()
          .single();

        if (error) throw error;

        setData(prev => ({ ...prev, id: newReport.id }));
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [data, currentUser?.id]);

  // Set up auto-save timer
  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      autoSave();
    }, 3000); // Auto-save after 3 seconds of inactivity

    setAutoSaveTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [data, autoSave]);

  const updateData = (field: keyof ReportData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const addPendingItem = () => {
    setPendingItems(prev => [...prev, '']);
  };

  const removePendingItem = (index: number) => {
    setPendingItems(prev => prev.filter((_, i) => i !== index));
  };

  const updatePendingItem = (index: number, value: string) => {
    setPendingItems(prev => prev.map((item, i) => i === index ? value : item));
  };

  const getPendingWorkText = () => {
    return pendingItems.filter(item => item.trim()).join('\n• ');
    return pendingItems.filter(item => item.trim()).length > 0 ? '• ' + pendingItems.filter(item => item.trim()).join('\n• ') : '';
  };

  const handleSave = async (submit: boolean = false) => {
    if (!data.customer_interactions.trim()) {
      toast.error('Tafadhali jaza sehemu ya mwingiliano na wateja');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        ...data,
        pending_work: getPendingWorkText(),
        status: submit ? 'submitted' : 'draft',
        submitted_at: submit ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (data.id) {
        const { error } = await supabase
          .from('daily_reports')
          .update(saveData)
          .eq('id', data.id);

        if (error) throw error;
      } else {
        const { data: newReport, error } = await supabase
          .from('daily_reports')
          .insert({
            ...saveData,
            user_id: currentUser?.id,
            branch_id: getCurrentBranchId(),
          })
          .select()
          .single();

        if (error) throw error;
        setData(prev => ({ ...prev, id: newReport.id }));
      }

      if (submit) {
        toast.success('Report imetumwa kikamilifu! 🎉');
        onSuccess?.();
        onClose();
      } else {
        toast.success('Report imehifadhiwa kama draft');
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Imeshindikana kuhifadhi report');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isDraft = data.status === 'draft';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>

            <div>
              <h3 id="report-modal-title" className="text-2xl font-bold text-gray-900 mb-3">
                {editReport ? 'Hariri Report' : `Report Mpya ya ${reportType === 'daily' ? 'Kila Siku' : 'Mwezi'}`}
              </h3>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">
                    {reportType === 'daily'
                      ? new Date(data.report_date).toLocaleDateString('sw-TZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                      : `Mwezi: ${new Date(data.report_month || data.report_date).toLocaleDateString('sw-TZ', { year: 'numeric', month: 'long' })}`
                    }
                  </span>
                </div>

                {lastSaved && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <Save className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">
                      Imehifadhi: {lastSaved.toLocaleTimeString('sw-TZ')}
                    </span>
                  </div>
                )}

                {isDraft ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg animate-pulse">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-bold text-orange-700">Draft - Haijatumwa</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">Imetumwa</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* Title */}
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Kichwa cha Report</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => updateData('title', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold bg-white"
              placeholder="Mfano: REPORT YA LEO"
            />
          </div>

          {/* Customer Interactions */}
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mwingiliano na Wateja *
            </label>
            <textarea
              value={data.customer_interactions}
              onChange={(e) => updateData('customer_interactions', e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 bg-white resize-none"
              placeholder="Eleza mwingiliano wako na wateja, mauzi yaliyofanyika, matatizo yaliyotatuliwa..."
            />
          </div>

          {/* Quick Stats - Role-based */}
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Takwimu Muhimu (Hiari)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userRole === 'technician' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Vifaa Vilivyotengenezwa</label>
                    <input
                      type="number"
                      min="0"
                      value={data.issues_resolved}
                      onChange={(e) => updateData('issues_resolved', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Vifaa Bado Pending</label>
                    <input
                      type="number"
                      min="0"
                      value={data.pending_tasks}
                      onChange={(e) => updateData('pending_tasks', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Spare Parts Zilizotumika</label>
                    <input
                      type="number"
                      min="0"
                      value={data.customers_served}
                      onChange={(e) => updateData('customers_served', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Wateja Waliofika</label>
                    <input
                      type="number"
                      min="0"
                      value={data.sales_made}
                      onChange={(e) => updateData('sales_made', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                </>
              )}

              {(userRole === 'customer-care' || userRole === 'sales') && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Wateja Waliohudumiwa</label>
                    <input
                      type="number"
                      min="0"
                      value={data.customers_served}
                      onChange={(e) => updateData('customers_served', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mauzi Yaliyofanyika</label>
                    <input
                      type="number"
                      min="0"
                      value={data.sales_made}
                      onChange={(e) => updateData('sales_made', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Masuala Yaliyotatuliwa</label>
                    <input
                      type="number"
                      min="0"
                      value={data.issues_resolved}
                      onChange={(e) => updateData('issues_resolved', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Wateja Wapya</label>
                    <input
                      type="number"
                      min="0"
                      value={data.pending_tasks}
                      onChange={(e) => updateData('pending_tasks', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                </>
              )}

              {(userRole === 'admin' || userRole === 'manager') && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Wateja Jumla</label>
                    <input
                      type="number"
                      min="0"
                      value={data.customers_served}
                      onChange={(e) => updateData('customers_served', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mauzi Jumla (TZS)</label>
                    <input
                      type="number"
                      min="0"
                      value={data.sales_made}
                      onChange={(e) => updateData('sales_made', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Vifaa Vya Repair</label>
                    <input
                      type="number"
                      min="0"
                      value={data.issues_resolved}
                      onChange={(e) => updateData('issues_resolved', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Masuala Pending</label>
                    <input
                      type="number"
                      min="0"
                      value={data.pending_tasks}
                      onChange={(e) => updateData('pending_tasks', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                </>
              )}

              {userRole === 'user' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Siku za Kazi</label>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={data.customers_served}
                      onChange={(e) => updateData('customers_served', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mafunzo Yaliyopata</label>
                    <input
                      type="number"
                      min="0"
                      value={data.sales_made}
                      onChange={(e) => updateData('sales_made', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Wateja Waliosaidiwa</label>
                    <input
                      type="number"
                      min="0"
                      value={data.issues_resolved}
                      onChange={(e) => updateData('issues_resolved', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Maswali Yaliyoulizwa</label>
                    <input
                      type="number"
                      min="0"
                      value={data.pending_tasks}
                      onChange={(e) => updateData('pending_tasks', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-bold"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pending Work */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Kazi Zilizopo Pending</label>
              <button
                type="button"
                onClick={addPendingItem}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ongeza
              </button>
            </div>

            <div className="space-y-2">
              {pendingItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updatePendingItem(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 text-gray-900"
                    placeholder="Andika kazi iliyobaki..."
                  />
                  {pendingItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePendingItem(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Mapendekezo</label>
            <textarea
              value={data.recommendations}
              onChange={(e) => updateData('recommendations', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 bg-white resize-none"
              placeholder="Toa mapendekezo yoyote ya kuboresha kazi..."
            />
          </div>

          {/* Additional Notes */}
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Maelezo Ya Ziada (Hiari)</label>
            <textarea
              value={data.additional_notes}
              onChange={(e) => updateData('additional_notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 bg-white resize-none"
              placeholder="Maelezo yoyote ya ziada..."
            />
          </div>
        </div>

        {/* Role-specific Tips */}
        <div className="px-6 pb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">💡</span>
              </div>
              <span className="text-sm font-semibold text-green-800">
                {userRole === 'technician' && 'Maelekezo kwa Teknisiani'}
                {userRole === 'customer-care' && 'Maelekezo kwa Huduma kwa Wateja'}
                {userRole === 'sales' && 'Maelekezo kwa Mauzi'}
                {userRole === 'admin' && 'Maelekezo kwa Usimamizi'}
                {userRole === 'manager' && 'Maelekezo kwa Usimamizi wa Timu'}
                {userRole === 'user' && 'Maelekezo kwa Mfanyakazi Mpya'}
              </span>
            </div>
            <div className="text-xs text-green-700">
              {userRole === 'technician' && 'Jumuisha: vifaa vilivyotengenezwa, spare parts zilizotumika, changamoto zilizopata, na vifaa bado kwenye repair.'}
              {userRole === 'customer-care' && 'Jumuisha: wateja waliohudumiwa, mauzi yaliyofanyika, masuala yaliyotatuliwa, na maoni ya wateja.'}
              {userRole === 'sales' && 'Jumuisha: bidhaa zilizouzwa, wateja wapya, lengo lililovutiwa, na fursa za mauzi zaidi.'}
              {userRole === 'admin' && 'Jumuisha: muhtasari wa shughuli zote, changamoto za mfumo, na maamuzi muhimu.'}
              {userRole === 'manager' && 'Jumuisha: utendaji wa timu, changamoto za wafanyakazi, na mipango ya kuboresha.'}
              {userRole === 'user' && 'Jumuisha: kazi ulizofanya, mafunzo uliyopata, changamoto ulizokutana nazo, na maendeleo yako.'}
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="px-6 pb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">⌨</span>
              </div>
              <span className="text-sm font-semibold text-blue-800">Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
              <div><kbd className="px-1 py-0.5 bg-white rounded border">Ctrl+S</kbd> Save Draft</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded border">Ctrl+Enter</kbd> Submit Report</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded border">Ctrl+Shift+P</kbd> Add Pending Item</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded border">Esc</kbd> Close Modal</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {!canSubmit && (
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-orange-700">
                Jaza sehemu ya mwingiliano na wateja ili kutuma report
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="w-4 h-4" />
              <span>{currentUser?.name}</span>
              <span className="text-gray-400">•</span>
              <span className="capitalize">{userRole.replace('-', ' ')}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? 'Inahifadhi...' : 'Hifadhi Draft'}
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving || !canSubmit}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Inatuma...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Tuma Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyReportModal;

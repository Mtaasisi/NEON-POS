import React, { useState, useEffect } from 'react';
import { Device } from '../../../types';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import {
  CheckCircle, XCircle, AlertTriangle, TestTube, ClipboardList,
  UserCheck, MessageSquare, Star, Camera, FileText, Clock,
  Shield, Zap, Volume2, Wifi, Battery, Smartphone, Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';

interface QualityChecklist {
  id: string;
  category: 'hardware' | 'software' | 'functionality' | 'appearance' | 'performance';
  item: string;
  description: string;
  required: boolean;
  testMethod: string;
  expectedResult: string;
}

interface QualityTest {
  checklistId: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  notes?: string;
  testedBy?: string;
  testedAt?: string;
  evidence?: string[]; // URLs to photos/videos
}

interface QualityAssurancePanelProps {
  device: Device;
  onQualityApproved: (approved: boolean, notes: string) => void;
  isReadOnly?: boolean;
}

const QualityAssurancePanel: React.FC<QualityAssurancePanelProps> = ({
  device,
  onQualityApproved,
  isReadOnly = false
}) => {
  const [qualityTests, setQualityTests] = useState<{ [key: string]: QualityTest }>({});
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('hardware');
  const [finalApproval, setFinalApproval] = useState<{
    approved: boolean;
    notes: string;
    approvedBy?: string;
    approvedAt?: string;
  } | null>(null);

  // Predefined quality checklists based on device type
  const qualityChecklists: { [key: string]: QualityChecklist[] } = {
    smartphone: [
      // Hardware Tests
      { id: 'hw_power', category: 'hardware', item: 'Power Functions', description: 'Device powers on/off correctly', required: true, testMethod: 'Physical test', expectedResult: 'Device boots to home screen within 30 seconds' },
      { id: 'hw_screen', category: 'hardware', item: 'Screen Display', description: 'Screen shows no dead pixels, scratches, or discoloration', required: true, testMethod: 'Visual inspection', expectedResult: 'Screen is clear and responsive' },
      { id: 'hw_buttons', category: 'hardware', item: 'Buttons & Ports', description: 'All buttons and ports function correctly', required: true, testMethod: 'Physical test', expectedResult: 'All buttons click firmly, ports accept connections' },
      { id: 'hw_camera', category: 'hardware', item: 'Camera System', description: 'Front and rear cameras capture clear images', required: true, testMethod: 'Functional test', expectedResult: 'Photos are clear, no distortion or black screens' },
      { id: 'hw_audio', category: 'hardware', item: 'Audio System', description: 'Speakers and microphone work properly', required: true, testMethod: 'Functional test', expectedResult: 'Clear audio output and input' },

      // Software Tests
      { id: 'sw_os', category: 'software', item: 'Operating System', description: 'OS boots correctly and responds promptly', required: true, testMethod: 'System test', expectedResult: 'OS loads within 60 seconds, no crashes' },
      { id: 'sw_apps', category: 'software', item: 'Core Applications', description: 'Phone, messages, settings apps work', required: true, testMethod: 'App testing', expectedResult: 'All core apps open and function' },
      { id: 'sw_network', category: 'software', item: 'Network Connectivity', description: 'WiFi, cellular, and Bluetooth connect', required: true, testMethod: 'Connectivity test', expectedResult: 'All networks connect and maintain signal' },

      // Functionality Tests
      { id: 'func_touch', category: 'functionality', item: 'Touch Response', description: 'Touchscreen responds accurately to input', required: true, testMethod: 'Touch test', expectedResult: 'All areas respond, no dead zones' },
      { id: 'func_sensors', category: 'functionality', item: 'Sensors', description: 'Accelerometer, gyroscope, proximity work', required: true, testMethod: 'Sensor test', expectedResult: 'All sensors provide accurate readings' },
      { id: 'func_battery', category: 'functionality', item: 'Battery Performance', description: 'Battery charges and holds charge appropriately', required: true, testMethod: 'Battery test', expectedResult: 'Charges to 100%, holds charge for expected duration' },

      // Performance Tests
      { id: 'perf_speed', category: 'performance', item: 'System Performance', description: 'Apps open quickly, no lag or freezing', required: true, testMethod: 'Performance test', expectedResult: 'Smooth operation, <2s app launch time' },
      { id: 'perf_memory', category: 'performance', item: 'Memory Usage', description: 'Stable memory usage, no memory leaks', required: false, testMethod: 'Memory monitoring', expectedResult: 'Stable memory usage over time' },

      // Appearance Tests
      { id: 'app_exterior', category: 'appearance', item: 'Exterior Condition', description: 'Clean exterior, no visible damage beyond original issue', required: true, testMethod: 'Visual inspection', expectedResult: 'Clean, professional appearance' },
      { id: 'app_fit', category: 'appearance', item: 'Parts Fitment', description: 'All parts fit properly, no gaps or misalignment', required: true, testMethod: 'Fitment check', expectedResult: 'All parts align perfectly' }
    ],
    laptop: [
      { id: 'hw_power_laptop', category: 'hardware', item: 'Power & Boot', description: 'Laptop powers on and boots to OS', required: true, testMethod: 'Power test', expectedResult: 'Clean boot to desktop within 45 seconds' },
      { id: 'hw_keyboard', category: 'hardware', item: 'Keyboard', description: 'All keys function correctly', required: true, testMethod: 'Typing test', expectedResult: 'All keys respond, no stuck keys' },
      { id: 'hw_screen_laptop', category: 'hardware', item: 'Display', description: 'Screen shows clear image, correct resolution', required: true, testMethod: 'Display test', expectedResult: 'Clear display at native resolution' },
      { id: 'hw_ports', category: 'hardware', item: 'Ports & Connectivity', description: 'USB, HDMI, audio ports work', required: true, testMethod: 'Port test', expectedResult: 'All ports accept and transfer data' },
      { id: 'sw_os_laptop', category: 'software', item: 'Operating System', description: 'OS loads and functions properly', required: true, testMethod: 'OS test', expectedResult: 'Stable OS operation' },
      { id: 'func_trackpad', category: 'functionality', item: 'Trackpad/Touchpad', description: 'Cursor moves smoothly, gestures work', required: true, testMethod: 'Input test', expectedResult: 'Smooth cursor movement and gestures' }
    ],
    tablet: [
      { id: 'hw_power_tablet', category: 'hardware', item: 'Power Functions', description: 'Tablet powers on/off correctly', required: true, testMethod: 'Power test', expectedResult: 'Device boots within 30 seconds' },
      { id: 'hw_screen_tablet', category: 'hardware', item: 'Touch Screen', description: 'Screen responds to touch input', required: true, testMethod: 'Touch test', expectedResult: 'Accurate touch response across entire screen' },
      { id: 'hw_buttons_tablet', category: 'hardware', item: 'Buttons & Switches', description: 'Power, volume, home buttons work', required: true, testMethod: 'Button test', expectedResult: 'All buttons function correctly' },
      { id: 'sw_apps_tablet', category: 'software', item: 'App Functionality', description: 'Core apps and gestures work', required: true, testMethod: 'App test', expectedResult: 'Smooth app operation and gestures' }
    ]
  };

  // Load existing quality tests
  useEffect(() => {
    loadQualityTests();
  }, [device.id]);

  const loadQualityTests = async () => {
    try {
      const { data, error } = await supabase
        .from('quality_tests')
        .select('*')
        .eq('device_id', device.id);

      if (error) throw error;

      const testsMap: { [key: string]: QualityTest } = {};
      (data || []).forEach(test => {
        testsMap[test.checklist_id] = {
          checklistId: test.checklist_id,
          status: test.status,
          notes: test.notes,
          testedBy: test.tested_by,
          testedAt: test.tested_at,
          evidence: test.evidence || []
        };
      });

      setQualityTests(testsMap);

      // Check for final approval
      const { data: approvalData } = await supabase
        .from('quality_approvals')
        .select('*')
        .eq('device_id', device.id)
        .single();

      if (approvalData) {
        setFinalApproval({
          approved: approvalData.approved,
          notes: approvalData.notes,
          approvedBy: approvalData.approved_by,
          approvedAt: approvalData.approved_at
        });
      }
    } catch (error) {
      console.error('Error loading quality tests:', error);
    }
  };

  // Get device type for checklist selection
  const getDeviceType = (device: Device): string => {
    const brand = device.brand.toLowerCase();
    const model = device.model.toLowerCase();

    if (brand.includes('iphone') || brand.includes('samsung') || brand.includes('google') ||
        model.includes('phone') || model.includes('smartphone')) {
      return 'smartphone';
    }
    if (brand.includes('macbook') || brand.includes('dell') || brand.includes('hp') || brand.includes('lenovo') ||
        model.includes('laptop') || model.includes('notebook')) {
      return 'laptop';
    }
    if (brand.includes('ipad') || model.includes('tablet')) {
      return 'tablet';
    }
    return 'smartphone'; // default
  };

  const deviceType = getDeviceType(device);
  const currentChecklist = qualityChecklists[deviceType] || [];
  const categoryItems = currentChecklist.filter(item => item.category === activeCategory);

  // Update test status
  const updateTestStatus = async (checklistId: string, status: QualityTest['status'], notes?: string) => {
    try {
      const testData = {
        device_id: device.id,
        checklist_id: checklistId,
        status,
        notes: notes || '',
        tested_by: 'current_user', // Replace with actual user
        tested_at: new Date().toISOString(),
        evidence: qualityTests[checklistId]?.evidence || []
      };

      const { error } = await supabase
        .from('quality_tests')
        .upsert(testData, { onConflict: 'device_id,checklist_id' });

      if (error) throw error;

      setQualityTests(prev => ({
        ...prev,
        [checklistId]: {
          ...prev[checklistId],
          status,
          notes,
          testedBy: 'Current User',
          testedAt: new Date().toISOString()
        }
      }));

      toast.success('Test status updated');
    } catch (error) {
      console.error('Error updating test:', error);
      toast.error('Failed to update test');
    }
  };

  // Final quality approval
  const submitFinalApproval = async (approved: boolean, notes: string) => {
    try {
      const approvalData = {
        device_id: device.id,
        approved,
        notes,
        approved_by: 'current_user', // Replace with actual user
        approved_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('quality_approvals')
        .upsert(approvalData, { onConflict: 'device_id' });

      if (error) throw error;

      setFinalApproval({
        approved,
        notes,
        approvedBy: 'Current User',
        approvedAt: new Date().toISOString()
      });

      onQualityApproved(approved, notes);
      toast.success(approved ? 'Quality approved!' : 'Quality rejected');
    } catch (error) {
      console.error('Error submitting approval:', error);
      toast.error('Failed to submit approval');
    }
  };

  // Calculate completion status
  const getCompletionStatus = () => {
    const requiredTests = currentChecklist.filter(item => item.required);
    const completedRequired = requiredTests.filter(test =>
      qualityTests[test.id]?.status === 'passed' || qualityTests[test.id]?.status === 'failed'
    ).length;

    return {
      completed: completedRequired,
      total: requiredTests.length,
      percentage: requiredTests.length > 0 ? Math.round((completedRequired / requiredTests.length) * 100) : 0
    };
  };

  const completion = getCompletionStatus();

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'skipped': return <AlertTriangle className="w-5 h-5 text-gray-500" />;
      default: return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hardware': return <Settings className="w-4 h-4" />;
      case 'software': return <FileText className="w-4 h-4" />;
      case 'functionality': return <Zap className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      case 'appearance': return <Eye className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  if (!currentChecklist.length) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Quality Checklist Not Available</h3>
          <p className="text-gray-600">
            No quality checklist available for this device type ({deviceType}).
            Please contact administrator to add quality standards.
          </p>
        </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Quality Assurance</h3>
            <p className="text-gray-600">
              Device: {device.brand} {device.model} • Type: {deviceType}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{completion.percentage}%</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Required Tests</span>
            <span>{completion.completed}/{completion.total} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
        </div>

        {/* Final Approval Status */}
        {finalApproval && (
          <div className={`p-4 rounded-lg ${
            finalApproval.approved ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {finalApproval.approved ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">
                Quality {finalApproval.approved ? 'Approved' : 'Rejected'}
              </span>
              <span className="text-sm text-gray-500">
                by {finalApproval.approvedBy} on {new Date(finalApproval.approvedAt!).toLocaleDateString()}
              </span>
            </div>
            {finalApproval.notes && (
              <p className="text-sm text-gray-700">{finalApproval.notes}</p>
            )}
          </div>
        )}
      </GlassCard>

      {/* Category Navigation */}
      <GlassCard className="p-2">
        <div className="flex gap-1 overflow-x-auto">
          {['hardware', 'software', 'functionality', 'performance', 'appearance'].map((category) => {
            const categoryTests = currentChecklist.filter(item => item.category === category);
            const completedTests = categoryTests.filter(test =>
              qualityTests[test.id]?.status === 'passed' || qualityTests[test.id]?.status === 'failed'
            ).length;

            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeCategory === category
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {getCategoryIcon(category)}
                <span className="capitalize">{category}</span>
                <span className="text-xs">({completedTests}/{categoryTests.length})</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Quality Tests */}
      <div className="space-y-4">
        {categoryItems.map((item) => {
          const test = qualityTests[item.id];
          return (
            <GlassCard key={item.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(test?.status)}
                    <h4 className="font-medium">{item.item}</h4>
                    {item.required && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        Required
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Test Method:</span>
                      <p className="text-gray-600">{item.testMethod}</p>
                    </div>
                    <div>
                      <span className="font-medium">Expected Result:</span>
                      <p className="text-gray-600">{item.expectedResult}</p>
                    </div>
                  </div>

                  {test?.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">Test Notes:</span>
                      </div>
                      <p className="text-sm text-gray-700">{test.notes}</p>
                    </div>
                  )}

                  {test?.testedBy && test?.testedAt && (
                    <div className="mt-2 text-xs text-gray-500">
                      Tested by {test.testedBy} on {new Date(test.testedAt).toLocaleString()}
                    </div>
                  )}
                </div>

                {!isReadOnly && (
                  <div className="flex flex-col gap-2 ml-4">
                    <div className="flex gap-1">
                      <GlassButton
                        variant={test?.status === 'passed' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => updateTestStatus(item.id, 'passed')}
                      >
                        Pass
                      </GlassButton>
                      <GlassButton
                        variant={test?.status === 'failed' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => updateTestStatus(item.id, 'failed')}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Fail
                      </GlassButton>
                    </div>
                    {item.required && (
                      <GlassButton
                        variant="outline"
                        size="sm"
                        onClick={() => updateTestStatus(item.id, 'skipped')}
                        disabled={test?.status === 'passed' || test?.status === 'failed'}
                      >
                        Skip
                      </GlassButton>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Final Approval Section */}
      {!isReadOnly && completion.percentage === 100 && !finalApproval && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Final Quality Approval</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassButton
                onClick={() => submitFinalApproval(true, 'All quality tests passed successfully')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Approve Quality
              </GlassButton>
              <GlassButton
                onClick={() => submitFinalApproval(false, 'Quality standards not met')}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Reject Quality
              </GlassButton>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approval Notes
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                rows={3}
                placeholder="Add any final notes about the quality approval..."
                onChange={(e) => {
                  // Store notes for later use
                  const notes = e.target.value;
                  setFinalApproval(prev => prev ? { ...prev, notes } : { approved: false, notes });
                }}
              />
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default QualityAssurancePanel;

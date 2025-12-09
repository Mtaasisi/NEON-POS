import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../../../context/DevicesContext';
import { useAuth } from '../../../context/AuthContext';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { BackButton } from '../../shared/components/ui/BackButton';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import {
  Users, UserPlus, Calendar, Clock, Wrench, TrendingUp,
  AlertTriangle, CheckCircle, UserCheck, UserX, BarChart3,
  Settings, Plus, Edit, Eye, Activity, Target
} from 'lucide-react';
import { Device, DeviceStatus } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface Technician {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'on-leave';
  skills: string[];
  currentWorkload: number;
  maxCapacity: number;
  activeRepairs: Device[];
  completedToday: number;
  efficiency: number;
  averageCompletionTime: number;
  performanceRating: number;
  schedule: TechnicianSchedule;
}

interface TechnicianSchedule {
  monday: string[];
  tuesday: string[];
  wednesday: string[];
  thursday: string[];
  friday: string[];
  saturday: string[];
  sunday: string[];
}

interface WorkloadAssignment {
  technicianId: string;
  deviceId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  dueDate: string;
}

const TechnicianManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [workloadView, setWorkloadView] = useState<'overview' | 'detailed' | 'schedule'>('overview');
  const [unassignedDevices, setUnassignedDevices] = useState<Device[]>([]);

  // Safely access devices context
  let devices: Device[] = [];
  let updateDeviceStatus: any = null;

  try {
    const devicesContext = useDevices();
    devices = devicesContext?.devices || [];
    updateDeviceStatus = devicesContext?.updateDeviceStatus || null;
  } catch (error) {
    console.warn('Devices context not available:', error);
  }

  // Load technicians and their data
  useEffect(() => {
    loadTechniciansData();
  }, [devices]);

  const loadTechniciansData = async () => {
    setLoading(true);
    try {
      // Load technicians from database
      const { data: techData, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'technician')
        .order('full_name');

      if (error) throw error;

      // Load technician skills/preferences (if stored)
      const { data: skillsData } = await supabase
        .from('technician_skills')
        .select('*');

      // Calculate technician stats
      const techniciansWithStats: Technician[] = (techData || []).map(tech => {
        const techDevices = devices.filter(d => d.assignedTo === tech.id);
        const activeRepairs = techDevices.filter(d =>
          !['done', 'failed'].includes(d.status)
        );
        const completedToday = techDevices.filter(d =>
          d.status === 'done' &&
          new Date(d.updatedAt).toDateString() === new Date().toDateString()
        ).length;

        // Calculate efficiency and other metrics
        const efficiency = calculateTechnicianEfficiency(tech.id, techDevices);
        const averageCompletionTime = calculateAverageCompletionTime(techDevices);

        return {
          id: tech.id,
          name: tech.full_name || tech.email,
          email: tech.email,
          status: 'active', // Default status
          skills: getTechnicianSkills(tech.id, skillsData || []),
          currentWorkload: activeRepairs.length,
          maxCapacity: 5, // Default capacity
          activeRepairs,
          completedToday,
          efficiency,
          averageCompletionTime,
          performanceRating: calculatePerformanceRating(efficiency, completedToday),
          schedule: getDefaultSchedule()
        };
      });

      setTechnicians(techniciansWithStats);

      // Find unassigned devices
      const unassigned = devices.filter(d =>
        !d.assignedTo &&
        !['done', 'failed'].includes(d.status)
      );
      setUnassignedDevices(unassigned);

    } catch (error) {
      console.error('Error loading technicians:', error);
      toast.error('Failed to load technician data');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getTechnicianSkills = (technicianId: string, skillsData: any[]): string[] => {
    const techSkills = skillsData.find(s => s.technician_id === technicianId);
    return techSkills?.skills || ['General Repair'];
  };

  const calculateTechnicianEfficiency = (technicianId: string, techDevices: Device[]): number => {
    if (techDevices.length === 0) return 0;

    const completed = techDevices.filter(d => d.status === 'done').length;
    const total = techDevices.length;
    return Math.round((completed / total) * 100);
  };

  const calculateAverageCompletionTime = (techDevices: Device[]): number => {
    const completedDevices = techDevices.filter(d =>
      d.status === 'done' && d.transitions && d.transitions.length > 0
    );

    if (completedDevices.length === 0) return 0;

    const totalTime = completedDevices.reduce((sum, device) => {
      const transitions = device.transitions || [];
      if (transitions.length > 0) {
        const startTime = new Date(transitions[0].timestamp);
        const endTime = new Date(transitions[transitions.length - 1].timestamp);
        return sum + (endTime.getTime() - startTime.getTime());
      }
      return sum;
    }, 0);

    return Math.round((totalTime / completedDevices.length) / (1000 * 60 * 60)); // hours
  };

  const calculatePerformanceRating = (efficiency: number, completedToday: number): number => {
    // Simple rating calculation
    const baseRating = efficiency / 20; // 0-5 scale
    const bonus = Math.min(completedToday * 0.2, 1); // Bonus for daily completions
    return Math.min(5, Math.max(1, Math.round(baseRating + bonus)));
  };

  const getDefaultSchedule = (): TechnicianSchedule => ({
    monday: ['09:00-17:00'],
    tuesday: ['09:00-17:00'],
    wednesday: ['09:00-17:00'],
    thursday: ['09:00-17:00'],
    friday: ['09:00-17:00'],
    saturday: [],
    sunday: []
  });

  // Auto-assign devices to technicians
  const autoAssignDevices = async () => {
    if (unassignedDevices.length === 0) {
      toast.info('No unassigned devices to distribute');
      return;
    }

    try {
      const jobId = startLoading('Auto-assigning devices to technicians...');

      // Sort technicians by current workload (lowest first)
      const availableTechnicians = technicians
        .filter(t => t.status === 'active')
        .sort((a, b) => a.currentWorkload - b.currentWorkload);

      let assignmentCount = 0;

      for (const device of unassignedDevices) {
        // Find technician with lowest workload and matching skills
        const suitableTechnician = availableTechnicians.find(tech => {
          const deviceComplexity = getDeviceComplexity(device);
          return tech.currentWorkload < tech.maxCapacity &&
                 tech.skills.some(skill => deviceComplexity.includes(skill));
        });

        if (suitableTechnician) {
          // Assign device to technician
          await updateDeviceStatus(device.id, 'assigned', `Auto-assigned to ${suitableTechnician.name}`);
          assignmentCount++;
        }
      }

      completeLoading(jobId);
      toast.success(`Auto-assigned ${assignmentCount} devices`);
      loadTechniciansData(); // Refresh data

    } catch (error) {
      failLoading(jobId, 'Failed to auto-assign devices');
      console.error('Error auto-assigning devices:', error);
    }
  };

  const getDeviceComplexity = (device: Device): string[] => {
    // Simple complexity assessment based on device type and issue
    const complexity = ['General Repair'];

    if (device.brand.toLowerCase().includes('iphone') ||
        device.brand.toLowerCase().includes('samsung')) {
      complexity.push('Smartphone Repair');
    }

    if (device.issueDescription.toLowerCase().includes('screen') ||
        device.issueDescription.toLowerCase().includes('display')) {
      complexity.push('Screen Repair');
    }

    if (device.issueDescription.toLowerCase().includes('battery')) {
      complexity.push('Battery Repair');
    }

    return complexity;
  };

  // Manual assignment
  const assignDeviceToTechnician = async (deviceId: string, technicianId: string) => {
    try {
      const technician = technicians.find(t => t.id === technicianId);
      const device = devices.find(d => d.id === deviceId);

      if (!technician || !device) return;

      await updateDeviceStatus(deviceId, 'assigned', `Assigned to ${technician.name}`);
      toast.success(`Device assigned to ${technician.name}`);
      loadTechniciansData();

    } catch (error) {
      console.error('Error assigning device:', error);
      toast.error('Failed to assign device');
    }
  };

  const getWorkloadColor = (workload: number, capacity: number) => {
    const percentage = (workload / capacity) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading technician data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Wrapper Container - Single rounded container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section */}
        <div className="p-8 border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
          <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Technician Management</h1>
                <p className="text-sm text-gray-600">
                  Manage technicians, workloads, and assignments
                </p>
          </div>
        </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
            onClick={() => setWorkloadView('schedule')}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 rounded-xl font-semibold transition-all"
          >
                <Calendar className="w-4 h-4" />
            Schedules
              </button>
              <button
            onClick={autoAssignDevices}
            disabled={unassignedDevices.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
              <UserCheck className="w-4 h-4" />
            Auto Assign ({unassignedDevices.length})
            </button>
          </div>
        </div>
      </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
      {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-semibold text-gray-600">Active Technicians</p>
              <p className="text-2xl font-bold text-blue-600">
                {technicians.filter(t => t.status === 'active').length}
              </p>
            </div>
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
          </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-semibold text-gray-600">Total Workload</p>
              <p className="text-2xl font-bold text-orange-600">
                {technicians.reduce((sum, t) => sum + t.currentWorkload, 0)}
              </p>
            </div>
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
              </div>
          </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-semibold text-gray-600">Unassigned Devices</p>
              <p className="text-2xl font-bold text-red-600">
                {unassignedDevices.length}
              </p>
            </div>
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
          </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-semibold text-gray-600">Avg Efficiency</p>
              <p className="text-2xl font-bold text-green-600">
                {technicians.length > 0
                  ? Math.round(technicians.reduce((sum, t) => sum + t.efficiency, 0) / technicians.length)
                  : 0}%
              </p>
            </div>
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
          </div>
              </div>
            </div>
      </div>

      {/* View Toggle */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-2 mb-6 shadow-sm">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'detailed', label: 'Detailed View', icon: Activity },
            { id: 'schedule', label: 'Schedules', icon: Calendar }
          ].map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setWorkloadView(view.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  workloadView === view.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {view.label}
              </button>
            );
          })}
        </div>
          </div>

      {/* Main Content */}
      {workloadView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Technician Overview */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Technician Overview</h3>
            <div className="space-y-3">
              {technicians.map((tech) => (
                <div key={tech.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      tech.status === 'active' ? 'bg-green-500' :
                      tech.status === 'on-leave' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium">{tech.name}</div>
                      <div className="text-sm text-gray-600">
                        {tech.currentWorkload}/{tech.maxCapacity} active repairs
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getWorkloadColor(tech.currentWorkload, tech.maxCapacity)}`}>
                      {tech.currentWorkload}/{tech.maxCapacity}
                    </div>
                    <div className={`text-sm font-bold ${getPerformanceColor(tech.performanceRating)}`}>
                      {tech.performanceRating.toFixed(1)}⭐
                    </div>
                  </div>
                </div>
              ))}
            </div>
              </div>

          {/* Unassigned Devices */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Unassigned Devices</h3>
            {unassignedDevices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>All devices are assigned!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {unassignedDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{device.customerName}</div>
                      <div className="text-sm text-gray-600">
                        {device.brand} {device.model}
                      </div>
                      <div className="text-xs text-gray-500">{device.issueDescription}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <GlassSelect
                        onChange={(e) => assignDeviceToTechnician(device.id, e.target.value)}
                        className="text-sm"
                      >
                        <option value="">Assign to...</option>
                        {technicians
                          .filter(t => t.status === 'active' && t.currentWorkload < t.maxCapacity)
                          .map(tech => (
                          <option key={tech.id} value={tech.id}>{tech.name}</option>
                        ))}
                      </GlassSelect>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </div>
        </div>
      )}

      {workloadView === 'detailed' && (
        <div className="space-y-6">
          {technicians.map((tech) => (
                <div key={tech.id} className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                      <h3 className="text-lg font-bold">{tech.name}</h3>
                  <p className="text-gray-600">{tech.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{tech.efficiency}%</div>
                    <div className="text-xs text-gray-500">Efficiency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{tech.completedToday}</div>
                    <div className="text-xs text-gray-500">Completed Today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{tech.averageCompletionTime}h</div>
                    <div className="text-xs text-gray-500">Avg Time</div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {tech.skills.map((skill) => (
                    <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Repairs */}
              <div>
                <h4 className="font-medium mb-2">Active Repairs ({tech.activeRepairs.length})</h4>
                {tech.activeRepairs.length === 0 ? (
                  <p className="text-gray-500 text-sm">No active repairs</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tech.activeRepairs.map((device) => (
                      <div key={device.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium">{device.customerName}</div>
                        <div className="text-sm text-gray-600">{device.brand} {device.model}</div>
                        <div className="text-xs text-gray-500 mt-1">{device.issueDescription}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </div>
          ))}
        </div>
      )}

      {workloadView === 'schedule' && (
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Technician Schedules</h3>
          <div className="space-y-4">
            {technicians.map((tech) => (
                  <div key={tech.id} className="border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{tech.name}</h4>
                      <button className="px-3 py-1.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 rounded-lg font-medium text-sm transition-all flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                    Edit Schedule
                      </button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-sm">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const dayKey = day.toLowerCase() as keyof TechnicianSchedule;
                    const hours = tech.schedule[dayKey];
                    return (
                      <div key={day} className="text-center">
                        <div className="font-medium mb-1">{day}</div>
                        <div className={`p-2 rounded text-xs ${
                          hours.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {hours.length > 0 ? hours.join(', ') : 'Off'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
            </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianManagementPage;

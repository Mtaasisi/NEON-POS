/**
 * Advanced Features Toolbar - Quick access to all advanced features
 * Clean, icon-based toolbar that opens modals/panels
 */

import React from 'react';
import { 
  BarChart3, Zap, Users, Calendar, FileText, Link, MousePointer, 
  DollarSign, Settings, HelpCircle 
} from 'lucide-react';

interface Props {
  onOpenAnalytics: () => void;
  onOpenABTesting: () => void;
  onOpenSegmentation: () => void;
  onOpenScheduling: () => void;
  onOpenTemplates: () => void;
  onToggleLinkTracking: () => void;
  onToggleInteractive: () => void;
  onOpenROI: () => void;
}

export default function AdvancedFeaturesToolbar(props: Props) {
  const features = [
    {
      id: 'analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      label: 'Analytics',
      color: 'purple',
      onClick: props.onOpenAnalytics
    },
    {
      id: 'ab-test',
      icon: <Zap className="w-5 h-5" />,
      label: 'A/B Test',
      color: 'orange',
      onClick: props.onOpenABTesting
    },
    {
      id: 'segments',
      icon: <Users className="w-5 h-5" />,
      label: 'Segments',
      color: 'indigo',
      onClick: props.onOpenSegmentation
    },
    {
      id: 'schedule',
      icon: <Calendar className="w-5 h-5" />,
      label: 'Schedule',
      color: 'blue',
      onClick: props.onOpenScheduling
    },
    {
      id: 'templates',
      icon: <FileText className="w-5 h-5" />,
      label: 'Templates',
      color: 'green',
      onClick: props.onOpenTemplates
    },
    {
      id: 'links',
      icon: <Link className="w-5 h-5" />,
      label: 'Links',
      color: 'cyan',
      onClick: props.onToggleLinkTracking
    },
    {
      id: 'interactive',
      icon: <MousePointer className="w-5 h-5" />,
      label: 'Interactive',
      color: 'pink',
      onClick: props.onToggleInteractive
    },
    {
      id: 'roi',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'ROI',
      color: 'emerald',
      onClick: props.onOpenROI
    }
  ];

  const colorClasses: Record<string, { bg: string; hover: string; text: string }> = {
    purple: { bg: 'bg-purple-100', hover: 'hover:bg-purple-200', text: 'text-purple-700' },
    orange: { bg: 'bg-orange-100', hover: 'hover:bg-orange-200', text: 'text-orange-700' },
    indigo: { bg: 'bg-indigo-100', hover: 'hover:bg-indigo-200', text: 'text-indigo-700' },
    blue: { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', text: 'text-blue-700' },
    green: { bg: 'bg-green-100', hover: 'hover:bg-green-200', text: 'text-green-700' },
    cyan: { bg: 'bg-cyan-100', hover: 'hover:bg-cyan-200', text: 'text-cyan-700' },
    pink: { bg: 'bg-pink-100', hover: 'hover:bg-pink-200', text: 'text-pink-700' },
    emerald: { bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200', text: 'text-emerald-700' }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900">✨ Advanced Features</h3>
        </div>
        <button
          className="p-2 bg-white/50 hover:bg-white rounded-lg transition-colors"
          title="Help"
        >
          <HelpCircle className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {features.map(feature => {
          const colors = colorClasses[feature.color];
          return (
            <button
              key={feature.id}
              onClick={feature.onClick}
              className={`flex flex-col items-center justify-center p-3 ${colors.bg} ${colors.hover} rounded-xl transition-all hover:shadow-md group`}
              title={feature.label}
            >
              <div className={`${colors.text} group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <span className={`text-xs font-medium mt-1 ${colors.text}`}>
                {feature.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Info */}
      <div className="mt-3 pt-3 border-t-2 border-purple-200">
        <p className="text-xs text-gray-600 text-center">
          Click any feature to access advanced campaign tools • <span className="font-semibold">All features maintain clean UI</span>
        </p>
      </div>
    </div>
  );
}


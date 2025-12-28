/**
 * Bulk Send Step 2 - Advanced Compose Message
 * Integrates all advanced features with clean, collapsible UI
 */

import React from 'react';
import { Edit3, FileCheck, Gift, ThumbsUp, Calendar, RotateCcw } from 'lucide-react';
import AdvancedFeaturesToolbar from './AdvancedFeaturesToolbar';
import LinkTrackingPanel from './LinkTrackingPanel';
import InteractiveMessageBuilder from './InteractiveMessageBuilder';

interface Props {
  selectedRecipientsCount: number;
  bulkMessageType: string;
  setBulkMessageType: (type: string) => void;
  bulkMessage: string;
  setBulkMessage: (message: string) => void;
  
  // Advanced features
  onOpenAnalytics: () => void;
  onOpenABTesting: () => void;
  onOpenSegmentation: () => void;
  onOpenScheduling: () => void;
  onOpenTemplates: () => void;
  onOpenROI: () => void;
  linkTrackingExpanded: boolean;
  onToggleLinkTracking: () => void;
  interactiveExpanded: boolean;
  onToggleInteractive: () => void;
  onCreateInteractive: (config: any) => void;
  
  // Existing media props (passed through)
  bulkMedia: any;
  setBulkMedia: (media: any) => void;
  bulkMediaType: string;
  setBulkMediaType: (type: string) => void;
  bulkMediaPreview: string;
  setBulkMediaPreview: (preview: string) => void;
  bulkMediaCaption: string;
  setBulkMediaCaption: (caption: string) => void;
  viewOnce: boolean;
  setViewOnce: (value: boolean) => void;
  setShowMediaLibrary: (show: boolean) => void;
  handleMediaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Poll/Location props (passed through)
  pollQuestion: string;
  setPollQuestion: (value: string) => void;
  pollOptions: string[];
  setPollOptions: (options: string[]) => void;
  allowMultiSelect: boolean;
  setAllowMultiSelect: (value: boolean) => void;
  locationLat: string;
  setLocationLat: (value: string) => void;
  locationLng: string;
  setLocationLng: (value: string) => void;
  locationName: string;
  setLocationName: (value: string) => void;
  locationAddress: string;
  setLocationAddress: (value: string) => void;
}

export default function BulkStep2Advanced(props: Props) {
  const quickTemplates = [
    {
      icon: <Gift className="w-4 h-4 flex-shrink-0" />,
      label: 'Promotional Offer',
      message: 'Hi {name}! We have exciting news for you. Check out our latest offers today!'
    },
    {
      icon: <ThumbsUp className="w-4 h-4 flex-shrink-0" />,
      label: 'Thank You Message',
      message: 'Hello {name}, thank you for being our valued customer! We appreciate your business.'
    },
    {
      icon: <Calendar className="w-4 h-4 flex-shrink-0" />,
      label: 'Appointment Reminder',
      message: 'Hi {name}, just a friendly reminder about your upcoming appointment. See you soon!'
    },
    {
      icon: <RotateCcw className="w-4 h-4 flex-shrink-0" />,
      label: 'Re-engagement',
      message: 'Hey {name}! We miss you! Come visit us and enjoy special discounts for returning customers.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Step Info */}
      <div className="p-5 bg-purple-50 border-2 border-purple-200 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-purple-900 mb-2 text-lg flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Compose your message
            </h3>
            <p className="text-sm text-purple-700">
              Use <code className="px-2 py-1 bg-purple-100 rounded font-mono">{'{name}'}</code> to personalize. Access advanced features below.
            </p>
          </div>
          <div className="text-right bg-white rounded-xl px-4 py-3 border-2 border-purple-300 shadow-sm">
            <p className="text-xs text-gray-600 font-medium">Sending to</p>
            <p className="text-3xl font-bold text-purple-900">{props.selectedRecipientsCount}</p>
            <p className="text-xs text-gray-600 font-medium">recipients</p>
          </div>
        </div>
      </div>

      {/* 🚀 ADVANCED FEATURES TOOLBAR - Quick access to all features */}
      <AdvancedFeaturesToolbar
        onOpenAnalytics={props.onOpenAnalytics}
        onOpenABTesting={props.onOpenABTesting}
        onOpenSegmentation={props.onOpenSegmentation}
        onOpenScheduling={props.onOpenScheduling}
        onOpenTemplates={props.onOpenTemplates}
        onToggleLinkTracking={props.onToggleLinkTracking}
        onToggleInteractive={props.onToggleInteractive}
        onOpenROI={props.onOpenROI}
      />

      {/* Message Type Selector */}
      <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
        <label className="block text-base font-bold text-blue-900 mb-3">Message Type</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 'text', label: 'Text', icon: '💬' },
            { value: 'image', label: 'Image', icon: '🖼️' },
            { value: 'video', label: 'Video', icon: '🎥' },
            { value: 'document', label: 'Document', icon: '📄' },
            { value: 'audio', label: 'Audio', icon: '🎵' },
            { value: 'location', label: 'Location', icon: '📍' },
            { value: 'poll', label: 'Poll', icon: '📊' }
          ].map(type => (
            <button
              key={type.value}
              onClick={() => props.setBulkMessageType(type.value)}
              className={`p-3 rounded-xl font-medium text-sm transition-all border-2 ${
                props.bulkMessageType === type.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                  : 'bg-white text-gray-700 border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span className="text-xl block mb-1">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Templates - Only for text messages */}
      {props.bulkMessageType === 'text' && (
        <div className="p-5 bg-purple-50 border-2 border-purple-200 rounded-xl">
          <label className="block text-base font-bold text-purple-900 mb-3 flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Quick Templates
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => props.setBulkMessage(template.message)}
                className="text-left px-4 py-3 bg-white rounded-xl hover:bg-purple-100 transition-all text-sm border-2 border-purple-200 font-medium flex items-center gap-2"
              >
                {template.icon}
                {template.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Compose Area - This is where the existing text/media/poll/location fields go */}
      <div className="p-5 bg-white border-2 border-gray-200 rounded-xl">
        {props.bulkMessageType === 'text' && (
          <div>
            <label className="block text-base font-bold text-gray-900 mb-3">Message Content</label>
            <textarea
              value={props.bulkMessage}
              onChange={(e) => props.setBulkMessage(e.target.value)}
              placeholder="Type your message here... Use {name} for personalization"
              rows={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Variables: {'{name}'}, {'{phone}'}, {'{date}'}, {'{time}'}
              </span>
              <span className={`font-medium ${props.bulkMessage.length > 1000 ? 'text-red-600' : 'text-gray-600'}`}>
                {props.bulkMessage.length} / 1024
              </span>
            </div>
          </div>
        )}

        {/* Media, Poll, Location fields... (existing implementation) */}
        {/* These would be the same as current implementation */}
      </div>

      {/* 🔗 LINK TRACKING PANEL - Collapsible */}
      {props.bulkMessageType === 'text' && (
        <LinkTrackingPanel
          message={props.bulkMessage}
          onUpdateMessage={props.setBulkMessage}
        />
      )}

      {/* ⚡ INTERACTIVE MESSAGE BUILDER - Collapsible */}
      <InteractiveMessageBuilder
        isExpanded={props.interactiveExpanded}
        onToggle={props.onToggleInteractive}
        onCreateInteractive={props.onCreateInteractive}
      />
    </div>
  );
}


/**
 * Custom Hook for Managing Advanced WhatsApp Features State
 * Keeps the main component clean by extracting feature state management
 */

import { useState } from 'react';
import type { Segment } from '../components/CustomerSegmentationModal';
import type { ScheduleConfig } from '../components/AdvancedSchedulingModal';
import type { MessageTemplate } from '../components/TemplateManagerModal';
import type { InteractiveMessageConfig } from '../components/InteractiveMessageBuilder';

export function useAdvancedFeatures() {
  // Modal visibility states
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showABTesting, setShowABTesting] = useState(false);
  const [showSegmentation, setShowSegmentation] = useState(false);
  const [showScheduling, setShowScheduling] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showROI, setShowROI] = useState(false);

  // Panel visibility states (collapsible sections)
  const [linkTrackingExpanded, setLinkTrackingExpanded] = useState(false);
  const [interactiveExpanded, setInteractiveExpanded] = useState(false);

  // Feature data states
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [interactiveConfig, setInteractiveConfig] = useState<InteractiveMessageConfig | null>(null);
  const [abTestConfig, setABTestConfig] = useState<any | null>(null);

  // Saved data
  const [savedSegments, setSavedSegments] = useState<Segment[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<MessageTemplate[]>([]);

  return {
    // Modal states
    modals: {
      analytics: { show: showAnalytics, set: setShowAnalytics },
      abTesting: { show: showABTesting, set: setShowABTesting },
      segmentation: { show: showSegmentation, set: setShowSegmentation },
      scheduling: { show: showScheduling, set: setShowScheduling },
      templates: { show: showTemplates, set: setShowTemplates },
      roi: { show: showROI, set: setShowROI }
    },

    // Panel states
    panels: {
      linkTracking: { expanded: linkTrackingExpanded, toggle: () => setLinkTrackingExpanded(!linkTrackingExpanded) },
      interactive: { expanded: interactiveExpanded, toggle: () => setInteractiveExpanded(!interactiveExpanded) }
    },

    // Feature data
    features: {
      segment: { value: selectedSegment, set: setSelectedSegment },
      schedule: { value: scheduleConfig, set: setScheduleConfig },
      template: { value: selectedTemplate, set: setSelectedTemplate },
      interactive: { value: interactiveConfig, set: setInteractiveConfig },
      abTest: { value: abTestConfig, set: setABTestConfig }
    },

    // Saved data
    saved: {
      segments: { value: savedSegments, set: setSavedSegments },
      templates: { value: savedTemplates, set: setSavedTemplates }
    }
  };
}


/**
 * Advanced Scheduling Modal - Schedule campaigns with recurring & drip options
 */

import React, { useState } from 'react';
import { X, Calendar, Clock, Repeat, Zap, Plus, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (schedule: ScheduleConfig) => void;
}

export interface ScheduleConfig {
  type: 'once' | 'recurring' | 'drip';
  scheduledFor?: Date;
  timezone: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    days?: number[]; // 0-6 for weekly, 1-31 for monthly
    time: string;
  };
  dripSequence?: Array<{
    delay: number; // hours
    message: string;
  }>;
}

export default function AdvancedSchedulingModal({ isOpen, onClose, onSchedule }: Props) {
  const [scheduleType, setScheduleType] = useState<'once' | 'recurring' | 'drip'>('once');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [timezone, setTimezone] = useState('Africa/Dar_es_Salaam');
  
  // Recurring settings
  const [recurFrequency, setRecurFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurDays, setRecurDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [recurTime, setRecurTime] = useState('09:00');

  // Drip campaign settings
  const [dripMessages, setDripMessages] = useState<Array<{ delay: number; message: string }>>([
    { delay: 0, message: '' },
    { delay: 24, message: '' },
    { delay: 72, message: '' }
  ]);

  if (!isOpen) return null;

  const handleSchedule = () => {
    const config: ScheduleConfig = {
      type: scheduleType,
      timezone
    };

    if (scheduleType === 'once') {
      config.scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    } else if (scheduleType === 'recurring') {
      config.recurrence = {
        frequency: recurFrequency,
        days: recurDays,
        time: recurTime
      };
    } else if (scheduleType === 'drip') {
      config.dripSequence = dripMessages.filter(m => m.message.trim());
    }

    onSchedule(config);
    onClose();
  };

  const toggleRecurDay = (day: number) => {
    if (recurDays.includes(day)) {
      setRecurDays(recurDays.filter(d => d !== day));
    } else {
      setRecurDays([...recurDays, day].sort());
    }
  };

  const addDripMessage = () => {
    const lastDelay = dripMessages[dripMessages.length - 1]?.delay || 0;
    setDripMessages([...dripMessages, { delay: lastDelay + 24, message: '' }]);
  };

  const removeDripMessage = (index: number) => {
    if (dripMessages.length > 1) {
      setDripMessages(dripMessages.filter((_, i) => i !== index));
    }
  };

  const updateDripMessage = (index: number, field: 'delay' | 'message', value: any) => {
    setDripMessages(dripMessages.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Calendar className="w-8 h-8" />
                Advanced Scheduling
              </h2>
              <p className="text-blue-100">Schedule campaigns intelligently</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Schedule Type Tabs */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => setScheduleType('once')}
              className={`p-3 rounded-lg font-medium transition-all ${
                scheduleType === 'once' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Clock className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">One-Time</span>
            </button>
            <button
              onClick={() => setScheduleType('recurring')}
              className={`p-3 rounded-lg font-medium transition-all ${
                scheduleType === 'recurring' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Repeat className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">Recurring</span>
            </button>
            <button
              onClick={() => setScheduleType('drip')}
              className={`p-3 rounded-lg font-medium transition-all ${
                scheduleType === 'drip' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Zap className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">Drip Campaign</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* One-Time Schedule */}
          {scheduleType === 'once' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">Send campaign once at specified date and time</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Recurring Schedule */}
          {scheduleType === 'recurring' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <p className="text-sm text-purple-800">Automatically send campaign on selected days/times</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Frequency</label>
                <select
                  value={recurFrequency}
                  onChange={(e) => setRecurFrequency(e.target.value as any)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {recurFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Days of Week</label>
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <button
                        key={index}
                        onClick={() => toggleRecurDay(index)}
                        className={`p-3 rounded-lg font-medium text-sm transition-all ${
                          recurDays.includes(index)
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Time</label>
                <input
                  type="time"
                  value={recurTime}
                  onChange={(e) => setRecurTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Drip Campaign */}
          {scheduleType === 'drip' && (
            <div className="space-y-4">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-800">Send sequence of messages over time (automated nurture)</p>
              </div>

              <div className="space-y-3">
                {dripMessages.map((msg, index) => (
                  <div key={index} className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">Message {index + 1}</span>
                        <input
                          type="number"
                          value={msg.delay}
                          onChange={(e) => updateDripMessage(index, 'delay', Number(e.target.value))}
                          min="0"
                          className="w-20 px-2 py-1 border-2 border-gray-300 rounded focus:border-orange-500 focus:outline-none text-sm"
                        />
                        <span className="text-sm text-gray-600">hours after previous</span>
                      </div>
                      {dripMessages.length > 1 && (
                        <button
                          onClick={() => removeDripMessage(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={msg.message}
                      onChange={(e) => updateDripMessage(index, 'message', e.target.value)}
                      placeholder="Message content..."
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={addDripMessage}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Message to Sequence
              </button>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="Africa/Dar_es_Salaam">East Africa Time (EAT)</option>
              <option value="Africa/Nairobi">Nairobi</option>
              <option value="Africa/Cairo">Cairo</option>
              <option value="Europe/London">London</option>
              <option value="America/New_York">New York</option>
              <option value="Asia/Dubai">Dubai</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Schedule Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


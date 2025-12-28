/**
 * Interactive Message Builder - Create messages with buttons and lists
 */

import React, { useState } from 'react';
import { MousePointer, List, Plus, X, Trash2 } from 'lucide-react';

interface Props {
  isExpanded: boolean;
  onToggle: () => void;
  onCreateInteractive: (config: InteractiveMessageConfig) => void;
}

export interface InteractiveMessageConfig {
  type: 'buttons' | 'list';
  header?: string;
  body: string;
  footer?: string;
  buttons?: Array<{ id: string; text: string }>;
  listSections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export default function InteractiveMessageBuilder({ isExpanded, onToggle, onCreateInteractive }: Props) {
  const [messageType, setMessageType] = useState<'buttons' | 'list'>('buttons');
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [buttons, setButtons] = useState<Array<{ id: string; text: string }>>([
    { id: '1', text: 'Option 1' },
    { id: '2', text: 'Option 2' }
  ]);
  const [listSections, setListSections] = useState<InteractiveMessageConfig['listSections']>([
    {
      title: 'Section 1',
      rows: [
        { id: '1', title: 'Option 1', description: '' },
        { id: '2', title: 'Option 2', description: '' }
      ]
    }
  ]);

  const addButton = () => {
    if (buttons.length < 3) {
      setButtons([...buttons, { id: String(buttons.length + 1), text: `Option ${buttons.length + 1}` }]);
    }
  };

  const removeButton = (id: string) => {
    if (buttons.length > 1) {
      setButtons(buttons.filter(b => b.id !== id));
    }
  };

  const updateButton = (id: string, text: string) => {
    setButtons(buttons.map(b => b.id === id ? { ...b, text } : b));
  };

  const addListSection = () => {
    setListSections([
      ...listSections,
      {
        title: `Section ${listSections.length + 1}`,
        rows: [{ id: '1', title: 'Option 1', description: '' }]
      }
    ]);
  };

  const addRowToSection = (sectionIndex: number) => {
    const newSections = [...listSections];
    const section = newSections[sectionIndex];
    section.rows.push({
      id: String(section.rows.length + 1),
      title: `Option ${section.rows.length + 1}`,
      description: ''
    });
    setListSections(newSections);
  };

  const handleCreate = () => {
    if (!body) {
      alert('Please enter message body');
      return;
    }

    const config: InteractiveMessageConfig = {
      type: messageType,
      header: header || undefined,
      body,
      footer: footer || undefined,
      ...(messageType === 'buttons' && { buttons }),
      ...(messageType === 'list' && { listSections })
    };

    onCreateInteractive(config);
  };

  return (
    <div className="border-2 border-purple-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <MousePointer className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">⚡ Interactive Messages</h3>
            <p className="text-sm text-gray-600">Add buttons or selection menus</p>
          </div>
        </div>
        <span className="text-2xl text-gray-400">{isExpanded ? '−' : '+'}</span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-4">
          {/* Message Type */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMessageType('buttons')}
              className={`p-4 rounded-xl font-medium transition-all border-2 ${
                messageType === 'buttons'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
              }`}
            >
              <MousePointer className="w-5 h-5 mx-auto mb-2" />
              Button Message
            </button>
            <button
              onClick={() => setMessageType('list')}
              className={`p-4 rounded-xl font-medium transition-all border-2 ${
                messageType === 'list'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
              }`}
            >
              <List className="w-5 h-5 mx-auto mb-2" />
              List Message
            </button>
          </div>

          {/* Header (Optional) */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Header <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="Message header"
              maxLength={60}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Body (Required) */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Message Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Your message content..."
              rows={4}
              maxLength={1024}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* Footer (Optional) */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Footer <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="Message footer"
              maxLength={60}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Buttons Configuration */}
          {messageType === 'buttons' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-gray-900">Buttons (Max 3)</label>
                <button
                  onClick={addButton}
                  disabled={buttons.length >= 3}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Button
                </button>
              </div>

              <div className="space-y-2">
                {buttons.map((button) => (
                  <div key={button.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={button.text}
                      onChange={(e) => updateButton(button.id, e.target.value)}
                      placeholder="Button text"
                      maxLength={20}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                    {buttons.length > 1 && (
                      <button
                        onClick={() => removeButton(button.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List Configuration */}
          {messageType === 'list' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-gray-900">List Sections</label>
                <button
                  onClick={addListSection}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>
              </div>

              <div className="space-y-4">
                {listSections.map((section, sIndex) => (
                  <div key={sIndex} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => {
                        const newSections = [...listSections];
                        newSections[sIndex].title = e.target.value;
                        setListSections(newSections);
                      }}
                      placeholder="Section title"
                      className="w-full px-3 py-2 mb-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none font-medium"
                    />

                    <div className="space-y-2">
                      {section.rows.map((row, rIndex) => (
                        <div key={row.id} className="bg-white p-2 rounded border border-gray-200">
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => {
                              const newSections = [...listSections];
                              newSections[sIndex].rows[rIndex].title = e.target.value;
                              setListSections(newSections);
                            }}
                            placeholder="Option title"
                            className="w-full px-2 py-1 mb-1 border border-gray-300 rounded text-sm focus:border-purple-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={row.description || ''}
                            onChange={(e) => {
                              const newSections = [...listSections];
                              newSections[sIndex].rows[rIndex].description = e.target.value;
                              setListSections(newSections);
                            }}
                            placeholder="Description (optional)"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addRowToSection(sIndex)}
                      className="w-full mt-2 py-2 border-2 border-dashed border-gray-300 rounded text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                    >
                      + Add Option
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Create Interactive Message
          </button>

          {/* Preview */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">Preview</h4>
            <div className="bg-white border border-gray-300 rounded-lg p-3 text-sm">
              {header && <p className="font-bold text-gray-900 mb-2">{header}</p>}
              <p className="text-gray-700">{body || 'Your message will appear here...'}</p>
              {footer && <p className="text-xs text-gray-500 mt-2">{footer}</p>}
              
              {messageType === 'buttons' && buttons.length > 0 && (
                <div className="mt-3 space-y-1">
                  {buttons.map(btn => (
                    <div key={btn.id} className="py-2 px-3 bg-blue-50 border border-blue-200 rounded text-center text-blue-700 font-medium">
                      {btn.text}
                    </div>
                  ))}
                </div>
              )}

              {messageType === 'list' && (
                <div className="mt-3">
                  <div className="py-2 px-3 bg-purple-50 border border-purple-200 rounded text-center text-purple-700 font-medium">
                    📋 View Options ({listSections.reduce((acc, s) => acc + s.rows.length, 0)} items)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


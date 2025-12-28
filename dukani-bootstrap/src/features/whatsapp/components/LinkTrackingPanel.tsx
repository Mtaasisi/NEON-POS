/**
 * Link Tracking Panel - Collapsible section for link tracking features
 */

import React, { useState } from 'react';
import { Link, TrendingUp, Copy, Check, AlertCircle } from 'lucide-react';

interface Props {
  message: string;
  onUpdateMessage: (message: string) => void;
}

export default function LinkTrackingPanel({ message, onUpdateMessage }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [utmSource, setUtmSource] = useState('whatsapp');
  const [utmMedium, setUtmMedium] = useState('bulk-message');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [shortenedLink, setShortenedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const generateShortLink = () => {
    if (!linkUrl) return;

    // Build UTM parameters
    const params = new URLSearchParams({
      utm_source: utmSource,
      utm_medium: utmMedium,
      ...(utmCampaign && { utm_campaign: utmCampaign })
    });

    const fullUrl = `${linkUrl}${linkUrl.includes('?') ? '&' : '?'}${params.toString()}`;
    
    // Generate short link (mock - would call actual shortener API)
    const shortCode = customAlias || Math.random().toString(36).substring(7);
    const shortened = `https://short.link/${shortCode}`;
    
    setShortenedLink(shortened);
  };

  const insertLinkIntoMessage = () => {
    if (!shortenedLink) return;
    
    const updatedMessage = message + (message ? ' ' : '') + shortenedLink;
    onUpdateMessage(updatedMessage);
  };

  const copyLink = () => {
    if (!shortenedLink) return;
    
    navigator.clipboard.writeText(shortenedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-2 border-blue-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Link className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">🔗 Link Tracking</h3>
            <p className="text-sm text-gray-600">Track clicks and conversions</p>
          </div>
        </div>
        <span className="text-2xl text-gray-400">{isExpanded ? '−' : '+'}</span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-4">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium">Track your campaign performance</p>
                <p className="text-xs text-blue-700 mt-1">
                  Add tracked links to measure clicks, conversions, and ROI
                </p>
              </div>
            </div>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Original URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/product"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Custom Alias (Optional) */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Custom Alias <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="summer-sale"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* UTM Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">UTM Source</label>
              <input
                type="text"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">UTM Medium</label>
              <input
                type="text"
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">UTM Campaign</label>
              <input
                type="text"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateShortLink}
            disabled={!linkUrl}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Tracked Short Link
          </button>

          {/* Shortened Link Result */}
          {shortenedLink && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Your Tracked Link:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shortenedLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border-2 border-green-300 rounded-lg text-sm font-mono"
                />
                <button
                  onClick={copyLink}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={insertLinkIntoMessage}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                >
                  Insert into Message
                </button>
              </div>

              {/* Tracking Info */}
              <div className="mt-3 pt-3 border-t-2 border-green-200">
                <p className="text-xs font-bold text-gray-700 mb-2">This link will track:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✓ Total clicks</li>
                  <li>✓ Unique visitors</li>
                  <li>✓ Click timestamps</li>
                  <li>✓ Conversion events</li>
                  <li>✓ Geographic data</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


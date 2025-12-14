/**
 * Behavior Settings Demo Component
 * 
 * This component demonstrates how to use all the behavior settings:
 * - Auto Complete Search
 * - Confirm Delete
 * - Show Confirmations
 * - Enable Sound Effects
 * - Enable Animations
 * 
 * You can use this as a reference for implementing behavior settings in your components.
 */

import React, { useState } from 'react';
import { useBehaviorSettings } from '../hooks/useBehaviorSettings';
import '../styles/behavior-settings.css';

interface DemoItem {
  id: string;
  name: string;
}

export const BehaviorSettingsDemo: React.FC = () => {
  const {
    autoCompleteSearch,
    confirmDelete,
    showConfirmations,
    enableSoundEffects,
    enableAnimations,
    showToast,
    confirmDeleteAction,
    playSound,
    getAnimationClass,
    getSearchConfig
  } = useBehaviorSettings();

  const [items, setItems] = useState<DemoItem[]>([
    { id: '1', name: 'Product A' },
    { id: '2', name: 'Product B' },
    { id: '3', name: 'Product C' }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchConfig = getSearchConfig();

  // Demo: Auto Complete Search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (searchConfig.autoComplete && query.length >= searchConfig.minLength) {
      setShowSuggestions(true);
      playSound('click');
    } else {
      setShowSuggestions(false);
    }
  };

  // Demo: Confirm Delete
  const handleDelete = async (item: DemoItem) => {
    const success = await confirmDeleteAction(
      item.name,
      async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Remove item from list
        setItems(items.filter(i => i.id !== item.id));
        
        // Show success message (respects showConfirmations setting)
        showToast(`${item.name} deleted successfully`, 'success');
        
        // Play sound (respects enableSoundEffects setting)
        playSound('success');
      },
      () => {
        // Cancellation callback
        showToast('Deletion cancelled', 'info');
      }
    );
  };

  // Demo: Toast Notifications
  const handleAddItem = () => {
    const newItem: DemoItem = {
      id: Date.now().toString(),
      name: `Product ${items.length + 1}`
    };
    
    setItems([...items, newItem]);
    playSound('success');
    showToast('Item added successfully!', 'success');
  };

  // Demo: Sound Effects
  const handlePlaySound = (soundType: 'click' | 'success' | 'error') => {
    playSound(soundType);
    showToast(`${soundType} sound played (if enabled)`, 'info');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Behavior Settings Demo</h1>

      {/* Settings Status Display */}
      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Current Settings</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="font-medium">Auto Complete:</span>{' '}
            <span className={autoCompleteSearch ? 'text-green-600' : 'text-red-600'}>
              {autoCompleteSearch ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="font-medium">Confirm Delete:</span>{' '}
            <span className={confirmDelete ? 'text-green-600' : 'text-red-600'}>
              {confirmDelete ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="font-medium">Show Confirmations:</span>{' '}
            <span className={showConfirmations ? 'text-green-600' : 'text-red-600'}>
              {showConfirmations ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="font-medium">Sound Effects:</span>{' '}
            <span className={enableSoundEffects ? 'text-green-600' : 'text-red-600'}>
              {enableSoundEffects ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="font-medium">Animations:</span>{' '}
            <span className={enableAnimations ? 'text-green-600' : 'text-red-600'}>
              {enableAnimations ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Demo 1: Auto Complete Search */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Auto Complete Search Demo</h2>
        <p className="mb-3 text-gray-600">
          Type in the search box. Suggestions appear only if Auto Complete is enabled.
        </p>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search products..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {showSuggestions && searchQuery && (
            <div className={getAnimationClass('search-suggestions animate-slide-in')}>
              {items
                .filter(item => 
                  item.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(item => (
                  <div
                    key={item.id}
                    className="search-suggestions-item"
                    onClick={() => {
                      setSearchQuery(item.name);
                      setShowSuggestions(false);
                      playSound('click');
                    }}
                  >
                    {item.name}
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Demo 2: Confirm Delete */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Confirm Delete Demo</h2>
        <p className="mb-3 text-gray-600">
          Click delete. A confirmation appears only if Confirm Delete is enabled.
        </p>
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className={getAnimationClass('flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg animate-fade-in')}
            >
              <span className="font-medium">{item.name}</span>
              <button
                onClick={() => handleDelete(item)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors requires-confirmation"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddItem}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add Item
        </button>
      </section>

      {/* Demo 3: Show Confirmations */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Show Confirmations Demo</h2>
        <p className="mb-3 text-gray-600">
          Click buttons below. Toast messages appear only if Show Confirmations is enabled.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => showToast('This is a success message!', 'success')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Show Success Toast
          </button>
          <button
            onClick={() => showToast('This is an error message!', 'error')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Show Error Toast
          </button>
          <button
            onClick={() => showToast('This is an info message!', 'info')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Show Info Toast
          </button>
        </div>
      </section>

      {/* Demo 4: Sound Effects */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Sound Effects Demo</h2>
        <p className="mb-3 text-gray-600">
          Click buttons to play sounds. Sounds play only if Enable Sound Effects is on.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handlePlaySound('click')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors sound-enabled"
          >
            Play Click Sound
          </button>
          <button
            onClick={() => handlePlaySound('success')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors sound-enabled"
          >
            Play Success Sound
          </button>
          <button
            onClick={() => handlePlaySound('error')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors sound-enabled"
          >
            Play Error Sound
          </button>
        </div>
      </section>

      {/* Demo 5: Animations */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Animations Demo</h2>
        <p className="mb-3 text-gray-600">
          Animations appear only if Enable Animations is on. Try toggling the setting.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={getAnimationClass('p-4 bg-blue-100 rounded-lg text-center animate-fade-in')}>
            Fade In
          </div>
          <div className={getAnimationClass('p-4 bg-green-100 rounded-lg text-center animate-slide-in')}>
            Slide In
          </div>
          <div className={getAnimationClass('p-4 bg-purple-100 rounded-lg text-center animate-scale-in')}>
            Scale In
          </div>
          <div className={getAnimationClass('p-4 bg-pink-100 rounded-lg text-center animate-bounce')}>
            Bounce
          </div>
        </div>
      </section>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How to Test:</h3>
        <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
          <li>Open POS Settings (⚙️ icon) → General tab → Behavior Settings</li>
          <li>Toggle each setting on/off</li>
          <li>Click Save</li>
          <li>Return to this demo page and test each feature</li>
          <li>Notice how behavior changes based on your settings</li>
        </ol>
      </div>
    </div>
  );
};

export default BehaviorSettingsDemo;


import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, X, Star, UserCheck, Tag, ChevronDown, Gift, Users, 
  Loader2, DollarSign, MapPin, TrendingUp, Calendar, MessageSquare, 
  Phone, Activity, Globe, Building2, RefreshCw, Award, UserMinus
} from 'lucide-react';
import { Customer, LoyaltyLevel } from '../../../types';

interface CustomerFiltersRedesignedProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loyaltyFilter: LoyaltyLevel[];
  onLoyaltyFilterChange: (filter: LoyaltyLevel[]) => void;
  statusFilter: Array<'active' | 'inactive'>;
  onStatusFilterChange: (filter: Array<'active' | 'inactive'>) => void;
  tagFilter: string[];
  onTagFilterChange: (filter: string[]) => void;
  referralFilter: string[];
  onReferralFilterChange: (filter: string[]) => void;
  birthdayFilter: boolean;
  onBirthdayFilterChange: (filter: boolean) => void;
  whatsappFilter: boolean;
  onWhatsappFilterChange?: (filter: boolean) => void;
  showInactive: boolean;
  onShowInactiveChange: (show: boolean) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  customers: Customer[];
  searchLoading?: boolean;
  filteredCount?: number;
  // Basic Filters
  genderFilter: Array<'male' | 'female' | 'other'>;
  onGenderFilterChange: (filter: Array<'male' | 'female' | 'other'>) => void;
  cityFilter: string[];
  onCityFilterChange: (filter: string[]) => void;
  countryFilter: string[];
  onCountryFilterChange: (filter: string[]) => void;
  // Numeric Range Filters
  minSpent: string;
  onMinSpentChange: (value: string) => void;
  maxSpent: string;
  onMaxSpentChange: (value: string) => void;
  minPoints: string;
  onMinPointsChange: (value: string) => void;
  maxPoints: string;
  onMaxPointsChange: (value: string) => void;
  minPurchases: string;
  onMinPurchasesChange: (value: string) => void;
  maxPurchases: string;
  onMaxPurchasesChange: (value: string) => void;
  minReturns: string;
  onMinReturnsChange: (value: string) => void;
  maxReturns: string;
  onMaxReturnsChange: (value: string) => void;
  // Date Range Filters
  joinDateFrom: string;
  onJoinDateFromChange: (value: string) => void;
  joinDateTo: string;
  onJoinDateToChange: (value: string) => void;
  lastVisitFrom: string;
  onLastVisitFromChange: (value: string) => void;
  lastVisitTo: string;
  onLastVisitToChange: (value: string) => void;
  lastPurchaseFrom: string;
  onLastPurchaseFromChange: (value: string) => void;
  lastPurchaseTo: string;
  onLastPurchaseToChange: (value: string) => void;
  lastActivityFrom: string;
  onLastActivityFromChange: (value: string) => void;
  lastActivityTo: string;
  onLastActivityToChange: (value: string) => void;
  // Advanced Filters
  branchFilter: string[];
  onBranchFilterChange: (filter: string[]) => void;
  hasNationalId: boolean | null;
  onHasNationalIdChange: (value: boolean | null) => void;
  whatsappOptOut: boolean | null;
  onWhatsappOptOutChange: (value: boolean | null) => void;
  // Call Analytics Filters
  minCalls: string;
  onMinCallsChange: (value: string) => void;
  maxCalls: string;
  onMaxCallsChange: (value: string) => void;
  callTypeFilter: Array<'incoming' | 'outgoing' | 'missed'>;
  onCallTypeFilterChange: (filter: Array<'incoming' | 'outgoing' | 'missed'>) => void;
}

const CustomerFiltersRedesigned: React.FC<CustomerFiltersRedesignedProps> = ({
  searchQuery,
  onSearchChange,
  loyaltyFilter,
  onLoyaltyFilterChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  referralFilter,
  onReferralFilterChange,
  birthdayFilter,
  onBirthdayFilterChange,
  whatsappFilter,
  onWhatsappFilterChange,
  showInactive,
  onShowInactiveChange,
  sortBy,
  onSortByChange,
  customers,
  searchLoading = false,
  filteredCount,
  genderFilter,
  onGenderFilterChange,
  cityFilter,
  onCityFilterChange,
  countryFilter,
  onCountryFilterChange,
  minSpent,
  onMinSpentChange,
  maxSpent,
  onMaxSpentChange,
  minPoints,
  onMinPointsChange,
  maxPoints,
  onMaxPointsChange,
  minPurchases,
  onMinPurchasesChange,
  maxPurchases,
  onMaxPurchasesChange,
  minReturns,
  onMinReturnsChange,
  maxReturns,
  onMaxReturnsChange,
  joinDateFrom,
  onJoinDateFromChange,
  joinDateTo,
  onJoinDateToChange,
  lastVisitFrom,
  onLastVisitFromChange,
  lastVisitTo,
  onLastVisitToChange,
  lastPurchaseFrom,
  onLastPurchaseFromChange,
  lastPurchaseTo,
  onLastPurchaseToChange,
  lastActivityFrom,
  onLastActivityFromChange,
  lastActivityTo,
  onLastActivityToChange,
  branchFilter,
  onBranchFilterChange,
  hasNationalId,
  onHasNationalIdChange,
  whatsappOptOut,
  onWhatsappOptOutChange,
  minCalls,
  onMinCallsChange,
  maxCalls,
  onMaxCallsChange,
  callTypeFilter,
  onCallTypeFilterChange,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('basic');

  const hasActiveFilters = searchQuery || 
    loyaltyFilter.length > 0 || 
    statusFilter.length > 0 || 
    tagFilter.length > 0 || 
    referralFilter.length > 0 ||
    birthdayFilter ||
    whatsappFilter ||
    showInactive ||
    genderFilter.length > 0 ||
    cityFilter.length > 0 ||
    countryFilter.length > 0 ||
    minSpent || maxSpent ||
    minPoints || maxPoints ||
    minPurchases || maxPurchases ||
    minReturns || maxReturns ||
    joinDateFrom || joinDateTo ||
    lastVisitFrom || lastVisitTo ||
    lastPurchaseFrom || lastPurchaseTo ||
    lastActivityFrom || lastActivityTo ||
    branchFilter.length > 0 ||
    hasNationalId !== null ||
    whatsappOptOut !== null ||
    minCalls || maxCalls ||
    callTypeFilter.length > 0;

  const clearAllFilters = () => {
    onSearchChange('');
    onLoyaltyFilterChange([]);
    onStatusFilterChange([]);
    onTagFilterChange([]);
    onReferralFilterChange([]);
    onBirthdayFilterChange(false);
    if (onWhatsappFilterChange) onWhatsappFilterChange(false);
    onShowInactiveChange(false);
    onGenderFilterChange([]);
    onCityFilterChange([]);
    onCountryFilterChange([]);
    onMinSpentChange('');
    onMaxSpentChange('');
    onMinPointsChange('');
    onMaxPointsChange('');
    onMinPurchasesChange('');
    onMaxPurchasesChange('');
    onMinReturnsChange('');
    onMaxReturnsChange('');
    onJoinDateFromChange('');
    onJoinDateToChange('');
    onLastVisitFromChange('');
    onLastVisitToChange('');
    onLastPurchaseFromChange('');
    onLastPurchaseToChange('');
    onLastActivityFromChange('');
    onLastActivityToChange('');
    onBranchFilterChange([]);
    onHasNationalIdChange(null);
    onWhatsappOptOutChange(null);
    onMinCallsChange('');
    onMaxCallsChange('');
    onCallTypeFilterChange([]);
  };

  // Get unique values for dropdowns
  const uniqueTags = Array.from(new Set(
    customers.map(c => c.colorTag).filter(Boolean)
  ));
  
  const uniqueReferralSources = Array.from(new Set(
    customers.map(c => c.referralSource).filter(Boolean)
  ));

  const uniqueCities = Array.from(new Set(
    customers.map(c => c.city).filter(Boolean)
  ));

  const uniqueCountries = Array.from(new Set(
    customers.map(c => (c as any).country).filter(Boolean)
  ));

  const uniqueBranches = Array.from(new Set(
    customers.map(c => (c as any).createdByBranchName || (c as any).branchName).filter(Boolean)
  ));

  // Fixed loyalty levels without "active" duplication
  const LOYALTY_LEVELS: LoyaltyLevel[] = [
    'bronze', 'silver', 'gold', 'platinum',
    'interested', 'engaged', 'payment_customer', 
    'regular', 'premium', 'vip'
  ];

  const filterSections = [
    { id: 'basic', label: 'Basic Filters', icon: Filter },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'dates', label: 'Date Ranges', icon: Calendar },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'advanced', label: 'Advanced', icon: Award },
  ];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        {searchLoading && (
          <Loader2 size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-200 animate-spin opacity-30" />
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search customers by name, phone, email, or ID..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
          autoComplete="off"
        />
        {searchLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <div className="flex items-center gap-1 text-xs text-gray-300 opacity-40">
              <Loader2 size={8} className="animate-spin" />
              <span>Searching</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              showFilters 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Filter size={16} />
            Advanced Filters
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {Object.values({
                  loyaltyFilter: loyaltyFilter.length,
                  statusFilter: statusFilter.length,
                  tagFilter: tagFilter.length,
                  genderFilter: genderFilter.length,
                  cityFilter: cityFilter.length,
                }).reduce((a, b) => a + b, 0)}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 border border-red-200"
            >
              <X size={14} />
              Clear all filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Filter Count */}
          {filteredCount !== undefined && (
            <div className="text-sm">
              <span className="font-semibold text-gray-900">{filteredCount.toLocaleString()}</span>
              <span className="text-gray-600"> customers</span>
            </div>
          )}
          
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="appearance-none px-4 py-2 pr-10 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-medium text-gray-700"
            >
              <option value="name">Name (A-Z)</option>
              <option value="recent">Recently Added</option>
              <option value="spent">Highest Spent</option>
              <option value="points">Most Points</option>
              <option value="lastVisit">Last Visit</option>
              <option value="purchases">Most Purchases</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg">
          {/* Section Tabs */}
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-gray-100 overflow-x-auto">
            {filterSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all duration-200 whitespace-nowrap ${
                    activeSection === section.id
                      ? 'border-blue-500 text-blue-700 font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-sm">{section.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* Basic Filters */}
            {activeSection === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Loyalty Level */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <Star size={16} className="inline mr-2 text-yellow-500" />
                      Loyalty Level
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {LOYALTY_LEVELS.map(level => (
                        <label key={level} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={loyaltyFilter.includes(level)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onLoyaltyFilterChange([...loyaltyFilter, level]);
                              } else {
                                onLoyaltyFilterChange(loyaltyFilter.filter(l => l !== level));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 capitalize">
                            {level.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <UserCheck size={16} className="inline mr-2 text-green-500" />
                      Account Status
                    </label>
                    <div className="space-y-2">
                      {(['active', 'inactive'] as const).map(status => (
                        <label key={status} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={statusFilter.includes(status)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onStatusFilterChange([...statusFilter, status]);
                              } else {
                                onStatusFilterChange(statusFilter.filter(s => s !== status));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 capitalize">
                            {status}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <Users size={16} className="inline mr-2 text-blue-500" />
                      Gender
                    </label>
                    <div className="space-y-2">
                      {(['male', 'female', 'other'] as const).map(gender => (
                        <label key={gender} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={genderFilter.includes(gender)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onGenderFilterChange([...genderFilter, gender]);
                              } else {
                                onGenderFilterChange(genderFilter.filter(g => g !== gender));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 capitalize">
                            {gender}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <Tag size={16} className="inline mr-2 text-purple-500" />
                      Customer Tags
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uniqueTags.length > 0 ? (
                        uniqueTags.map(tag => (
                          <label key={tag} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={tagFilter.includes(tag)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  onTagFilterChange([...tagFilter, tag]);
                                } else {
                                  onTagFilterChange(tagFilter.filter(t => t !== tag));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900 capitalize">
                              {tag}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No tags available</p>
                      )}
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <MapPin size={16} className="inline mr-2 text-green-500" />
                      City
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uniqueCities.length > 0 ? (
                        uniqueCities.map(city => (
                          <label key={city} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={cityFilter.includes(city)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  onCityFilterChange([...cityFilter, city]);
                                } else {
                                  onCityFilterChange(cityFilter.filter(c => c !== city));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">
                              {city}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No cities available</p>
                      )}
                    </div>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <Globe size={16} className="inline mr-2 text-blue-600" />
                      Country
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uniqueCountries.length > 0 ? (
                        uniqueCountries.map(country => (
                          <label key={country} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={countryFilter.includes(country)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  onCountryFilterChange([...countryFilter, country]);
                                } else {
                                  onCountryFilterChange(countryFilter.filter(c => c !== country));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">
                              {country}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No countries available</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Filters</h4>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={birthdayFilter}
                        onChange={(e) => onBirthdayFilterChange(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Calendar size={16} className="text-pink-500" />
                      <span className="text-sm text-gray-700">Has Birthday</span>
                    </label>
                    
                    <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={whatsappFilter}
                        onChange={(e) => onWhatsappFilterChange?.(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <MessageSquare size={16} className="text-green-500" />
                      <span className="text-sm text-gray-700">Has WhatsApp</span>
                    </label>
                    
                    <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => onShowInactiveChange(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <UserMinus size={16} className="text-red-500" />
                      <span className="text-sm text-gray-700">Inactive Only</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Filters */}
            {activeSection === 'financial' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Spent */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <DollarSign size={16} className="inline mr-2 text-green-500" />
                    Total Spent (TSH)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={minSpent}
                      onChange={(e) => onMinSpentChange(e.target.value)}
                      placeholder="Min amount"
                      min="0"
                      step="1000"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="number"
                      value={maxSpent}
                      onChange={(e) => onMaxSpentChange(e.target.value)}
                      placeholder="Max amount"
                      min="0"
                      step="1000"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Points */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <Star size={16} className="inline mr-2 text-yellow-500" />
                    Loyalty Points
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={minPoints}
                      onChange={(e) => onMinPointsChange(e.target.value)}
                      placeholder="Min points"
                      min="0"
                      step="10"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="number"
                      value={maxPoints}
                      onChange={(e) => onMaxPointsChange(e.target.value)}
                      placeholder="Max points"
                      min="0"
                      step="10"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Purchase Count */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <TrendingUp size={16} className="inline mr-2 text-purple-500" />
                    Total Purchases
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={minPurchases}
                      onChange={(e) => onMinPurchasesChange(e.target.value)}
                      placeholder="Min purchases"
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="number"
                      value={maxPurchases}
                      onChange={(e) => onMaxPurchasesChange(e.target.value)}
                      placeholder="Max purchases"
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Returns Count */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <RefreshCw size={16} className="inline mr-2 text-orange-500" />
                    Total Returns
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={minReturns}
                      onChange={(e) => onMinReturnsChange(e.target.value)}
                      placeholder="Min returns"
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="number"
                      value={maxReturns}
                      onChange={(e) => onMaxReturnsChange(e.target.value)}
                      placeholder="Max returns"
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Referral Source */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <Gift size={16} className="inline mr-2 text-orange-500" />
                    Referral Source
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {uniqueReferralSources.length > 0 ? (
                      uniqueReferralSources.map(source => (
                        <label key={source} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={referralFilter.includes(source)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onReferralFilterChange([...referralFilter, source]);
                              } else {
                                onReferralFilterChange(referralFilter.filter(s => s !== source));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 capitalize">
                            {source}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic col-span-2">No referral sources available</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Date Range Filters */}
            {activeSection === 'dates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Join Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <Calendar size={16} className="inline mr-2 text-blue-500" />
                    Join Date Range
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={joinDateFrom}
                      onChange={(e) => onJoinDateFromChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="From"
                    />
                    <input
                      type="date"
                      value={joinDateTo}
                      onChange={(e) => onJoinDateToChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="To"
                    />
                  </div>
                </div>

                {/* Last Visit */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <Calendar size={16} className="inline mr-2 text-green-500" />
                    Last Visit Range
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={lastVisitFrom}
                      onChange={(e) => onLastVisitFromChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="date"
                      value={lastVisitTo}
                      onChange={(e) => onLastVisitToChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Last Purchase */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <DollarSign size={16} className="inline mr-2 text-purple-500" />
                    Last Purchase Date
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={lastPurchaseFrom}
                      onChange={(e) => onLastPurchaseFromChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="date"
                      value={lastPurchaseTo}
                      onChange={(e) => onLastPurchaseToChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Last Activity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    <Activity size={16} className="inline mr-2 text-orange-500" />
                    Last Activity Date
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={lastActivityFrom}
                      onChange={(e) => onLastActivityFromChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="date"
                      value={lastActivityTo}
                      onChange={(e) => onLastActivityToChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Communication Filters */}
            {activeSection === 'communication' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Call Count */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <Phone size={16} className="inline mr-2 text-blue-500" />
                      Total Calls
                    </label>
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={minCalls}
                        onChange={(e) => onMinCallsChange(e.target.value)}
                        placeholder="Min calls"
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="number"
                        value={maxCalls}
                        onChange={(e) => onMaxCallsChange(e.target.value)}
                        placeholder="Max calls"
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Call Types */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <Phone size={16} className="inline mr-2 text-green-500" />
                      Call Types
                    </label>
                    <div className="space-y-2">
                      {(['incoming', 'outgoing', 'missed'] as const).map(type => (
                        <label key={type} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={callTypeFilter.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onCallTypeFilterChange([...callTypeFilter, type]);
                              } else {
                                onCallTypeFilterChange(callTypeFilter.filter(t => t !== type));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 capitalize">
                            {type} Calls
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* WhatsApp Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <MessageSquare size={16} className="inline mr-2 text-green-500" />
                      WhatsApp Status
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="whatsappOptOut"
                          checked={whatsappOptOut === false}
                          onChange={() => onWhatsappOptOutChange(false)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          Opted In
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="whatsappOptOut"
                          checked={whatsappOptOut === true}
                          onChange={() => onWhatsappOptOutChange(true)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          Opted Out
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="whatsappOptOut"
                          checked={whatsappOptOut === null}
                          onChange={() => onWhatsappOptOutChange(null)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          All
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Filters */}
            {activeSection === 'advanced' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Branch */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <Building2 size={16} className="inline mr-2 text-blue-600" />
                      Branch
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uniqueBranches.length > 0 ? (
                        uniqueBranches.map(branch => (
                          <label key={branch} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={branchFilter.includes(branch)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  onBranchFilterChange([...branchFilter, branch]);
                                } else {
                                  onBranchFilterChange(branchFilter.filter(b => b !== branch));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">
                              {branch}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No branches available</p>
                      )}
                    </div>
                  </div>

                  {/* National ID */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <Award size={16} className="inline mr-2 text-purple-600" />
                      National ID
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="hasNationalId"
                          checked={hasNationalId === true}
                          onChange={() => onHasNationalIdChange(true)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          Has National ID
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="hasNationalId"
                          checked={hasNationalId === false}
                          onChange={() => onHasNationalIdChange(false)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          No National ID
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="hasNationalId"
                          checked={hasNationalId === null}
                          onChange={() => onHasNationalIdChange(null)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          All
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Info Alert */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Filter size={18} className="text-blue-600 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-semibold text-blue-900 mb-1">Advanced Filtering</h5>
                      <p className="text-sm text-blue-700">
                        These filters allow you to segment customers by branch, identification status, and other advanced criteria.
                        Use multiple filters together for precise customer targeting.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerFiltersRedesigned;


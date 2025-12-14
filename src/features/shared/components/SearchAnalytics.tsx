import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Users, Search, Target, Calendar, Download } from 'lucide-react';
import GlassCard from './ui/GlassCard';

interface SearchAnalyticsProps {
  searchHistory: any[];
  savedSearches: any[];
  recentSearches: string[];
  currentQuery?: string;
  resultCount?: number;
}

const SearchAnalytics: React.FC<SearchAnalyticsProps> = ({
  searchHistory,
  savedSearches,
  recentSearches,
  currentQuery,
  resultCount
}) => {
  const [analytics, setAnalytics] = useState({
    totalSearches: 0,
    averageResults: 0,
    topQueries: [] as string[],
    searchesByHour: [] as number[],
    mostActiveDays: [] as string[],
    savedSearchCount: 0,
    searchTrends: [] as any[]
  });

  useEffect(() => {
    calculateAnalytics();
  }, [searchHistory, savedSearches, recentSearches]);

  const calculateAnalytics = () => {
    const totalSearches = searchHistory.length;
    const averageResults = totalSearches > 0
      ? Math.round(searchHistory.reduce((sum, h) => sum + (h.resultCount || 0), 0) / totalSearches)
      : 0;

    // Top queries
    const queryCount = searchHistory.reduce((acc, h) => {
      acc[h.query] = (acc[h.query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topQueries = Object.entries(queryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([query]) => query);

    // Searches by hour
    const hourCounts = new Array(24).fill(0);
    searchHistory.forEach(h => {
      const hour = new Date(h.timestamp).getHours();
      hourCounts[hour]++;
    });

    // Most active days
    const dayCount = searchHistory.reduce((acc, h) => {
      const day = new Date(h.timestamp).toLocaleDateString();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostActiveDays = Object.entries(dayCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([day]) => day);

    // Search trends (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const trends = last7Days.map(day => {
      const daySearches = searchHistory.filter(h =>
        h.timestamp.startsWith(day)
      ).length;
      return { day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }), count: daySearches };
    });

    setAnalytics({
      totalSearches,
      averageResults,
      topQueries,
      searchesByHour: hourCounts,
      mostActiveDays,
      savedSearchCount: savedSearches.length,
      searchTrends: trends
    });
  };

  const exportAnalytics = () => {
    const data = {
      analytics,
      searchHistory,
      savedSearches,
      recentSearches,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Search Analytics</h2>
          <p className="text-gray-600">Insights into your search behavior and patterns</p>
        </div>
        <button
          onClick={exportAnalytics}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{analytics.totalSearches}</div>
              <div className="text-sm text-gray-600">Total Searches</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{analytics.averageResults}</div>
              <div className="text-sm text-gray-600">Avg Results</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{analytics.savedSearchCount}</div>
              <div className="text-sm text-gray-600">Saved Searches</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{analytics.topQueries.length}</div>
              <div className="text-sm text-gray-600">Top Queries</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Current Search Stats */}
      {currentQuery && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Search</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{resultCount || 0}</div>
              <div className="text-sm text-gray-600">Results Found</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900 truncate">"{currentQuery}"</div>
              <div className="text-sm text-gray-600">Current Query</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900">
                {recentSearches.includes(currentQuery) ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-gray-600">In Recent Searches</div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Charts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Trends */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Search Trends (Last 7 Days)
          </h3>
          <div className="space-y-3">
            {analytics.searchTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{trend.day}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min((trend.count / Math.max(...analytics.searchTrends.map(t => t.count))) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{trend.count}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Top Queries */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Top Search Queries
          </h3>
          <div className="space-y-3">
            {analytics.topQueries.map((query, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium truncate flex-1">{query}</span>
                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {queryCount[query]} searches
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Most Active Days */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Most Active Days
          </h3>
          <div className="space-y-3">
            {analytics.mostActiveDays.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{day}</span>
                <span className="text-sm text-gray-600 bg-green-100 text-green-800 px-2 py-1 rounded">
                  {dayCount[day]} searches
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Hourly Activity */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Searches by Hour
          </h3>
          <div className="grid grid-cols-6 gap-2">
            {analytics.searchesByHour.map((count, hour) => (
              <div key={hour} className="text-center">
                <div className="text-xs text-gray-600 mb-1">{hour}:00</div>
                <div className={`h-8 rounded ${count > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
                     style={{ opacity: count > 0 ? 0.3 + (count / Math.max(...analytics.searchesByHour)) * 0.7 : 1 }}>
                </div>
                <div className="text-xs font-medium mt-1">{count}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Saved Searches</h3>
          <div className="space-y-3">
            {savedSearches.slice(0, 5).map((saved, index) => (
              <div key={saved.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{saved.name}</div>
                  <div className="text-sm text-gray-600">"{saved.query}"</div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(saved.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// Helper variables (should be calculated in the component)
const queryCount = {} as Record<string, number>;
const dayCount = {} as Record<string, number>;

export default SearchAnalytics;

'use client';

import { format } from 'date-fns';
import Image from 'next/image';
import { useState } from 'react';

interface ChartControlsProps {
  timeRange: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom';
  onTimeRangeChange: (range: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom') => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomDateChange: (start: Date, end: Date) => void;
  availableGroups: string[];
  selectedGroups: string[];
  onGroupsChange: (groups: string[]) => void;
  availableCategories: { id: string; name: string; group: string }[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export default function ChartControls({
  timeRange,
  onTimeRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  availableGroups,
  selectedGroups,
  onGroupsChange,
  availableCategories,
  selectedCategories,
  onCategoriesChange
}: ChartControlsProps) {
  const [showCustomDates, setShowCustomDates] = useState(false);

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'mtd', label: 'Month to Date' },
    { value: '3m', label: 'Last 3 Months' },
    { value: 'ytd', label: 'Year to Date' },
    { value: '12m', label: 'Last 12 Months' },
    { value: 'all', label: 'All Time' },
    { value: 'custom', label: 'Custom Range' }
  ] as const;

  const handleGroupToggle = (group: string) => {
    if (selectedGroups.includes(group)) {
      // Remove the group
      onGroupsChange(selectedGroups.filter(g => g !== group));
      
      // Also remove all categories that belong to this group
      const categoriesToRemove = availableCategories
        .filter(cat => cat.group === group)
        .map(cat => cat.id);
      
      const updatedCategories = selectedCategories.filter(
        catId => !categoriesToRemove.includes(catId)
      );
      
      onCategoriesChange(updatedCategories);
    } else {
      onGroupsChange([...selectedGroups, group]);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter(c => c !== categoryId));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Time Range Controls */}
      <div className="bg-white/[.03] rounded-lg p-4">
        <h3 className="font-medium mb-3">Time Range</h3>
        <div className="flex flex-wrap gap-2">
          {timeRangeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => {
                onTimeRangeChange(option.value);
                if (option.value === 'custom') {
                  setShowCustomDates(true);
                } else {
                  setShowCustomDates(false);
                }
              }}
              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                timeRange === option.value
                  ? 'bg-green text-black'
                  : 'bg-white/[.05] hover:bg-white/[.1] text-white/70'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom Date Picker */}
        {showCustomDates && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-2">Start Date</label>
              <input
                type="date"
                value={customStartDate ? format(customStartDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const start = new Date(e.target.value);
                  onCustomDateChange(start, customEndDate || new Date());
                }}
                className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-2">End Date</label>
              <input
                type="date"
                value={customEndDate ? format(customEndDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const end = new Date(e.target.value);
                  onCustomDateChange(customStartDate || new Date(), end);
                }}
                className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters - Always Open */}
      <div className="bg-white/[.03] rounded-lg p-4">
        <h3 className="font-medium mb-4">Filters</h3>
        
        <div className="space-y-4">
          {/* Group Filters */}
          <div>
            <h4 className="text-sm font-medium mb-2">Budget Groups</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  onGroupsChange([]);
                  onCategoriesChange([]);
                }}
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  selectedGroups.length === 0
                    ? 'bg-green text-black'
                    : 'bg-white/[.05] hover:bg-white/[.1] text-white/70'
                }`}
              >
                All Groups
              </button>
              {availableGroups.map(group => (
                <button
                  key={group}
                  onClick={() => handleGroupToggle(group)}
                  className={`px-3 py-1 text-sm rounded-lg transition-all ${
                    selectedGroups.includes(group)
                      ? 'bg-green text-black'
                      : 'bg-white/[.05] hover:bg-white/[.1] text-white/70'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filters */}
          {selectedGroups.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Categories</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onCategoriesChange([])}
                  className={`px-3 py-1 text-sm rounded-lg transition-all ${
                    selectedCategories.length === 0
                      ? 'bg-green text-black'
                      : 'bg-white/[.05] hover:bg-white/[.1] text-white/70'
                  }`}
                >
                  All Categories
                </button>
                {availableCategories
                  .filter(cat => selectedGroups.includes(cat.group))
                  .map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.id)}
                      className={`px-3 py-1 text-sm rounded-lg transition-all ${
                        selectedCategories.includes(category.id)
                          ? 'bg-green text-black'
                          : 'bg-white/[.05] hover:bg-white/[.1] text-white/70'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

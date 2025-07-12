// Segment Analysis Component for Bar Chart
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { SegmentInfo } from './types';
import { formatCurrency } from './utils';

/**
 * SegmentAnalysis - Displays detailed information about a bar chart segment
 * 
 * Features:
 * - Shows basic segment info (name, value, percentage of total)
 * - Displays a breakdown of sub-segments when available:
 *   - For GROUP segments: Lists all categories in the group with their values
 *   - For CATEGORY segments: Lists all vendors in the category with their values
 *   - For VENDOR segments: No sub-segments are shown
 * - Persistent display: Remains visible until user clicks close button
 * - Memoized calculations for optimal performance
 */

// Interface for segment hover info from plugin
export interface SegmentHoverInfo {
  isIncome: boolean;
  segment: SegmentInfo;
  date: string;
  volumePoint: any;
  datasetIndex: number;
  index: number;
  segmentIndex: number;
  // Additional properties for detailed breakdown
  subSegments?: {
    type: 'category' | 'vendor';
    items: Array<{
      name: string;
      value: number;
      percentage: number;
    }>;
  };
}

interface SegmentAnalysisProps {
  hoverInfo: SegmentHoverInfo | null;
  segmentType?: 'category' | 'vendor' | 'group';
  onClose?: () => void; // Add callback for closing the component
}

export const SegmentAnalysis: React.FC<SegmentAnalysisProps> = React.memo(({
  hoverInfo,
  segmentType = 'category',
  onClose
}) => {
  // Memoize expensive calculations
  const memoizedData = useMemo(() => {
    if (!hoverInfo) return null;

    const { isIncome, segment, date, volumePoint, subSegments } = hoverInfo;
    const total = isIncome ? volumePoint.total : volumePoint.total;
    
    // Format the date
    let formattedDate = '';
    try {
      formattedDate = format(new Date(date), 'MMM dd, yyyy');
    } catch (error) {
      formattedDate = 'Invalid date';
    }

    // Determine the type of segment (vendor, category, group)
    const segmentTypeLabel = volumePoint.segmentType === 'vendor' 
      ? 'Vendor' 
      : volumePoint.segmentType === 'category' ? 'Category' : 'Group';

    // Pre-format currency values to avoid recalculation
    const formattedValue = formatCurrency(segment.value);
    const formattedTotal = formatCurrency(total);
    const formattedPercentage = segment.percentage.toFixed(1);

    // Process sub-segments if available (format values, sort by value)
    const formattedSubSegments = subSegments?.items
      .filter(item => item.value > 0) // Only include non-zero items
      .map(item => ({
        name: item.name,
        formattedValue: formatCurrency(item.value),
        percentage: item.percentage.toFixed(1),
        value: item.value // Keep raw value for sorting
      }))
      .sort((a, b) => b.value - a.value); // Sort by value (highest first)

    return {
      isIncome,
      segmentName: segment.name,
      formattedDate,
      segmentTypeLabel,
      formattedValue,
      formattedTotal,
      formattedPercentage,
      subSegments: formattedSubSegments,
      subSegmentType: subSegments?.type
    };
  }, [hoverInfo]); // Only recalculate when hoverInfo changes
  
  if (!memoizedData) return null;

  const { 
    isIncome, 
    segmentName, 
    formattedDate, 
    segmentTypeLabel, 
    formattedValue, 
    formattedTotal, 
    formattedPercentage,
    subSegments,
    subSegmentType
  } = memoizedData;

  return (
    <div className="bg-white/[.05] rounded-lg p-4 border border-green/20 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-green">
          {isIncome ? 'Income' : 'Spending'} Segment Details
          <span className="text-xs text-white/60 ml-2 font-normal">
            ({formattedDate})
          </span>
        </h4>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white/90 transition-colors duration-200 p-1 rounded hover:bg-white/10"
            title="Close segment details"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="feather feather-x"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {/* Segment breakdown */}
        <div className="border-b border-white/10 pb-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/80">{segmentTypeLabel}:</span>
            <span className="font-medium text-white">
              {segmentName}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-white/80">Value:</span>
            <span className="font-medium text-green">
              {formattedValue}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-white/80">Percentage of Total:</span>
            <span className="font-medium text-green">
              {formattedPercentage}%
            </span>
          </div>
        </div>
        
        {/* Sub-segment breakdown */}
        {subSegments && subSegments.length > 0 && (
          <div className="border-b border-white/10 pb-2 pt-1">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-white/80 font-medium">
                {segmentTypeLabel === 'Group' 
                  ? 'Categories in this Group:' 
                  : segmentTypeLabel === 'Category'
                    ? 'Vendors in this Category:' 
                    : 'Breakdown:'}
              </span>
              <span className="text-white/60 text-xs">
                Value / %
              </span>
            </div>
            
            <div className="max-h-40 overflow-y-auto pr-1 space-y-1.5">
              {subSegments.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="text-white/70 truncate max-w-[65%]" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-green whitespace-nowrap">
                    {item.formattedValue} <span className="text-white/50 ml-1">({item.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Total context */}
        <div className="flex justify-between items-center text-sm pt-1">
          <span className="text-white/60">
            Total {isIncome ? 'Income' : 'Spending'} for this Date:
          </span>
          <span className="font-medium text-green">
            {formattedTotal}
          </span>
        </div>
      </div>
    </div>
  );
});

SegmentAnalysis.displayName = 'SegmentAnalysis';

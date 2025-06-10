// Comparison Analysis Component
import React from 'react';
import { format } from 'date-fns';
import { ComparisonData } from './types';
import { formatCurrency } from './utils';

interface ComparisonAnalysisProps {
  comparisonData: ComparisonData | null;
  defaultComparisonData: ComparisonData | null;
  shouldShowDistanceFromGoal: boolean;
  onClearSelection: () => void;
}

export const ComparisonAnalysis: React.FC<ComparisonAnalysisProps> = React.memo(({
  comparisonData,
  defaultComparisonData,
  shouldShowDistanceFromGoal,
  onClearSelection
}) => {
  const currentData = comparisonData || defaultComparisonData;
  
  if (!currentData) return null;

  const isCustomSelection = comparisonData && comparisonData !== defaultComparisonData;

  return (
    <div className="bg-white/[.05] rounded-lg p-4 border border-green/20">
      <h4 className="font-medium text-green mb-2">
        {isCustomSelection ? 'Selected Range Analysis' : 'Full Period Analysis'}
      </h4>
      
      {/* Show category breakdown if multiple categories are selected */}
      {currentData.categoryBreakdown && currentData.categoryBreakdown.length > 0 ? (
        <div className="space-y-3">
          {/* Period header */}
          <div className="text-sm text-white/70 border-b border-white/10 pb-2">
            Comparison: {(() => {
              try {
                const start = new Date(currentData.startDate);
                const end = new Date(currentData.endDate);
                return `${format(start, 'MMM dd')} → ${format(end, 'MMM dd')}`;
              } catch (error) {
                return 'Invalid date range';
              }
            })()}
          </div>
          
          {/* Category breakdown */}
          <div className="space-y-2">
            {currentData.categoryBreakdown.map((categoryData: any) => (
              <div key={categoryData.categoryId} className="flex justify-between items-center text-sm">
                <span className="text-white/80">{categoryData.name}:</span>
                <div className="text-right">
                  <span className={`font-medium ${!isNaN(categoryData.absoluteChange) && categoryData.absoluteChange >= 0 ? 'text-green' : 'text-orange-400'}`}>
                    {!categoryData.absoluteChange || isNaN(categoryData.absoluteChange) || !isFinite(categoryData.absoluteChange)
                      ? '£0.00'
                      : `${categoryData.absoluteChange >= 0 ? '+' : ''}${formatCurrency(categoryData.absoluteChange)}`
                    }
                  </span>
                  <span className={`ml-2 text-xs ${!isNaN(categoryData.percentageChange) && categoryData.percentageChange >= 0 ? 'text-green' : 'text-orange-400'}`}>
                    {!categoryData.percentageChange || isNaN(categoryData.percentageChange) || !isFinite(categoryData.percentageChange)
                      ? '(0.0%)'
                      : `(${categoryData.percentageChange >= 0 ? '+' : ''}${categoryData.percentageChange.toFixed(1)}%)`
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Single category or account balance view */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-white/50">Time Span</span>
            <p className="font-medium">
              {!currentData.timeSpan || isNaN(currentData.timeSpan) || !isFinite(currentData.timeSpan)
                ? 'Unknown'
                : currentData.timeSpan < 1 
                  ? `${Math.round(currentData.timeSpan * 24)} hour${Math.round(currentData.timeSpan * 24) !== 1 ? 's' : ''}`
                  : `${Math.round(currentData.timeSpan)} day${Math.round(currentData.timeSpan) !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div>
            <span className="text-white/50">
              {shouldShowDistanceFromGoal ? 'Goal Progress' : 'Balance Change'}
            </span>
            <p className={`font-medium ${!isNaN(currentData.absoluteChange) && currentData.absoluteChange >= 0 ? 'text-green' : 'text-reddy'}`}>
              {!currentData.absoluteChange || isNaN(currentData.absoluteChange) || !isFinite(currentData.absoluteChange)
                ? '£0.00'
                : `${currentData.absoluteChange >= 0 ? '+' : ''}${formatCurrency(currentData.absoluteChange)}`
              }
            </p>
          </div>
          <div>
            <span className="text-white/50">Percentage Change</span>
            <p className={`font-medium ${!isNaN(currentData.percentageChange) && currentData.percentageChange >= 0 ? 'text-green' : 'text-reddy'}`}>
              {!currentData.percentageChange || isNaN(currentData.percentageChange) || !isFinite(currentData.percentageChange)
                ? '0.0%'
                : `${currentData.percentageChange >= 0 ? '+' : ''}${currentData.percentageChange.toFixed(1)}%`
              }
            </p>
          </div>
          <div>
            <span className="text-white/50">Period</span>
            <p className="font-medium text-xs">
              {(() => {
                try {
                  const start = new Date(currentData.startDate);
                  const end = new Date(currentData.endDate);
                  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return 'Invalid dates';
                  }
                  return `${format(start, 'MMM dd')} → ${format(end, 'MMM dd')}`;
                } catch (error) {
                  return 'Error formatting dates';
                }
              })()}
            </p>
          </div>
        </div>
      )}
      
      {/* Show clear button only for custom selections */}
      {isCustomSelection && (
        <button
          onClick={onClearSelection}
          className="mt-3 text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          Clear selection (show full period)
        </button>
      )}
      
      {/* Drag instruction */}
      <div className="mt-3 text-xs text-white/40">
        💡 Drag horizontally on the chart to select a custom time range
      </div>
    </div>
  );
});

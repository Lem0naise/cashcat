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
  isHovering?: boolean; // Add prop to indicate if currently showing hover data
}

export const ComparisonAnalysis: React.FC<ComparisonAnalysisProps> = React.memo(({
  comparisonData,
  defaultComparisonData,
  shouldShowDistanceFromGoal,
  onClearSelection,
  isHovering = false
}) => {
  const currentData = comparisonData || defaultComparisonData;
  
  if (!currentData) return null;

  const isCustomSelection = comparisonData && comparisonData !== defaultComparisonData;
  const isSinglePoint = currentData.timeSpan === 0; // Single point data has timeSpan of 0

  return (
    <div className="bg-white/[.05] rounded-lg p-4 border border-green/20">
      <h4 className="font-medium text-green mb-2">
        {isHovering && isSinglePoint ? 'Hovered Point Analysis' : 
         isSinglePoint ? 'Selected Point Analysis' : 
         isCustomSelection ? 'Selected Range Analysis' : 'Full Period Analysis'}
        {shouldShowDistanceFromGoal && (
          <span className="text-xs text-white/60 ml-2 font-normal">
            (Distance from Goal)
          </span>
        )}
      </h4>
      
      {/* Show category breakdown if multiple categories are selected */}
      {currentData.categoryBreakdown && currentData.categoryBreakdown.length > 0 ? (
        <div className="space-y-3">
          {/* Period header */}
          <div className="text-sm text-white/70 border-b border-white/10 pb-2">
            {isSinglePoint ? 'Point: ' : 'Comparison: '}{(() => {
              try {
                const start = new Date(currentData.startDate);
                const end = new Date(currentData.endDate);
                if (isSinglePoint) {
                  return format(start, 'MMM dd');
                } else {
                  return `${format(start, 'MMM dd')} → ${format(end, 'MMM dd')}`;
                }
              } catch (error) {
                return isSinglePoint ? 'Invalid date' : 'Invalid date range';
              }
            })()}
            {shouldShowDistanceFromGoal && (
              <div className="text-xs text-white/50 mt-1">
                Change in distance from spending goal (+ = getting closer to goal, - = moving away from goal)
              </div>
            )}
          </div>
          
          {/* Category breakdown */}
          <div className="space-y-2">
            {currentData.categoryBreakdown.map((categoryData: any) => {
              // Check if this category has meaningful data
              const hasData = categoryData.startValue !== 0 || categoryData.endValue !== 0 || categoryData.absoluteChange !== 0;
              
              return (
                <div key={categoryData.categoryId} className="flex justify-between items-center text-sm">
                  <span className="text-white/80">{categoryData.name}:</span>
                  <div className="text-right">
                    {hasData ? (
                      <>
                        <span className={`font-medium ${
                          isSinglePoint 
                            ? (shouldShowDistanceFromGoal 
                                ? (categoryData.startValue >= 0 ? 'text-green' : 'text-orange-400')
                                : 'text-green'
                              )
                            : (!isNaN(categoryData.absoluteChange) && categoryData.absoluteChange >= 0 ? 'text-green' : 'text-orange-400')
                        }`}>
                          {isSinglePoint ? 
                            // For single point, show the current value
                            (shouldShowDistanceFromGoal && categoryData.startValue < 0 
                              ? `${formatCurrency(Math.abs(categoryData.startValue))} over budget`
                              : formatCurrency(categoryData.startValue)
                            )
                            :
                            // For range, show the change
                            (!categoryData.absoluteChange || isNaN(categoryData.absoluteChange) || !isFinite(categoryData.absoluteChange)
                              ? '£0.00'
                              : `${categoryData.absoluteChange >= 0 ? '+' : ''}${formatCurrency(categoryData.absoluteChange)}`
                            )
                          }
                        </span>
                        {!isSinglePoint && (
                          <span className={`ml-2 text-xs ${!isNaN(categoryData.percentageChange) && categoryData.percentageChange >= 0 ? 'text-green' : 'text-orange-400'}`}>
                            {!categoryData.percentageChange || isNaN(categoryData.percentageChange) || !isFinite(categoryData.percentageChange)
                              ? '(0.0%)'
                              : `(${categoryData.percentageChange >= 0 ? '+' : ''}${categoryData.percentageChange.toFixed(1)}%)`
                            }
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-white/50 text-xs">
                        {shouldShowDistanceFromGoal ? 'Distance data available in goal mode' : 'Individual stats not available in balance mode'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Show overall change for context when we have category breakdown */}
          <div className="border-t border-white/10 pt-2 mt-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">
                {isSinglePoint ? 'Overall Value:' : 'Overall Change:'}
              </span>
              <div className="text-right">
                <span className={`font-medium ${
                  isSinglePoint 
                    ? (shouldShowDistanceFromGoal 
                        ? (currentData.startValue >= 0 ? 'text-green' : 'text-reddy')
                        : 'text-green'
                      )
                    : (!isNaN(currentData.absoluteChange) && currentData.absoluteChange >= 0 ? 'text-green' : 'text-reddy')
                }`}>
                  {isSinglePoint ?
                    // For single point, show the current overall value
                    (shouldShowDistanceFromGoal && currentData.startValue < 0 
                      ? `${formatCurrency(Math.abs(currentData.startValue))} over budget`
                      : formatCurrency(currentData.startValue)
                    )
                    :
                    // For range, show the change
                    (!currentData.absoluteChange || isNaN(currentData.absoluteChange) || !isFinite(currentData.absoluteChange)
                      ? '£0.00'
                      : `${currentData.absoluteChange >= 0 ? '+' : ''}${formatCurrency(currentData.absoluteChange)}`
                    )
                  }
                </span>
                {!isSinglePoint && (
                  <span className={`ml-2 text-xs ${!isNaN(currentData.percentageChange) && currentData.percentageChange >= 0 ? 'text-green' : 'text-reddy'}`}>
                    {!currentData.percentageChange || isNaN(currentData.percentageChange) || !isFinite(currentData.percentageChange)
                      ? '(0.0%)'
                      : `(${currentData.percentageChange >= 0 ? '+' : ''}${currentData.percentageChange.toFixed(1)}%)`
                    }
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Single category or account balance view */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-white/50">Time Span</span>
            <p className="font-medium">
              {isSinglePoint ? 'Single Point' :
                (!currentData.timeSpan || isNaN(currentData.timeSpan) || !isFinite(currentData.timeSpan)
                  ? 'Unknown'
                  : currentData.timeSpan < 1 
                    ? `${Math.round(currentData.timeSpan * 24)} hour${Math.round(currentData.timeSpan * 24) !== 1 ? 's' : ''}`
                    : `${Math.round(currentData.timeSpan)} day${Math.round(currentData.timeSpan) !== 1 ? 's' : ''}`
                )
              }
            </p>
          </div>
          <div>
            <span className="text-white/50">
              {isSinglePoint 
                ? (shouldShowDistanceFromGoal ? 'Current Status' : 'Current Balance')
                : (shouldShowDistanceFromGoal ? 'Goal Progress' : 'Balance Change')
              }
            </span>
            <p className={`font-medium ${
              isSinglePoint 
                ? (shouldShowDistanceFromGoal 
                    ? (currentData.startValue >= 0 ? 'text-green' : 'text-reddy')
                    : 'text-green'
                  )
                : (!isNaN(currentData.absoluteChange) && currentData.absoluteChange >= 0 ? 'text-green' : 'text-reddy')
            }`}>
              {isSinglePoint ?
                // For single point, show current value
                (shouldShowDistanceFromGoal && currentData.startValue < 0 
                  ? `${formatCurrency(Math.abs(currentData.startValue))} over budget`
                  : formatCurrency(currentData.startValue)
                )
                :
                // For range, show change
                (!currentData.absoluteChange || isNaN(currentData.absoluteChange) || !isFinite(currentData.absoluteChange)
                  ? '£0.00'
                  : `${currentData.absoluteChange >= 0 ? '+' : ''}${formatCurrency(currentData.absoluteChange)}`
                )
              }
            </p>
          </div>
          {!isSinglePoint && (
            <div>
              <span className="text-white/50">Percentage Change</span>
              <p className={`font-medium ${!isNaN(currentData.percentageChange) && currentData.percentageChange >= 0 ? 'text-green' : 'text-reddy'}`}>
                {!currentData.percentageChange || isNaN(currentData.percentageChange) || !isFinite(currentData.percentageChange)
                  ? '0.0%'
                  : `${currentData.percentageChange >= 0 ? '+' : ''}${currentData.percentageChange.toFixed(1)}%`
                }
              </p>
            </div>
          )}
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
                  if (isSinglePoint) {
                    return format(start, 'MMM dd, yyyy');
                  } else {
                    return `${format(start, 'MMM dd')} → ${format(end, 'MMM dd')}`;
                  }
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

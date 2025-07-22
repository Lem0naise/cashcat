// Chart components index - easy imports
export { default as BudgetAssignmentChart } from '../BudgetAssignmentChartRefactored';
export { ComparisonAnalysis } from './ComparisonAnalysis';
export { comparisonSelectionPlugin } from './plugins';
export { segmentedBarsPlugin } from './plugins/segmentedBars';

// Hooks
export { useFilteredTransactions, useChartData } from './hooks/useChartData';
export { useComparisonAnalysis } from './hooks/useComparisonAnalysis';
export { useDistanceFromGoalData } from './hooks/useDistanceFromGoalData';

// Configurations
export { useLineChartConfig, useVolumeChartConfig } from './configs';

// Types
export * from './types';

// Utils
export * from './utils';
export { 
  generateColorShades,
  createGradient,
  processSegmentedBarData
} from './utils/segmentedBars';

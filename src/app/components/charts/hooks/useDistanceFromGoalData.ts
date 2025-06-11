// Hook for distance from goal data processing
import { useMemo } from 'react';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { 
  Category, 
  Transaction, 
  Assignment, 
  DistanceFromGoalData 
} from '../types';
import { formatCurrency } from '../utils';

export const useDistanceFromGoalData = (
  filteredCategoriesWithGoals: Category[],
  transactions: Transaction[],
  assignments: Assignment[],
  dateRange: { start: Date; end: Date },
  mainChartData: { dataPoints: any[]; volumePoints: any[] }
): DistanceFromGoalData => {
  return useMemo(() => {
    if (filteredCategoriesWithGoals.length === 0) {
      return { dataPoints: [], datasets: [] };
    }

    // Validate inputs
    if (!Array.isArray(transactions) || !Array.isArray(assignments) || !dateRange.start || !dateRange.end || !mainChartData.dataPoints.length) {
      console.warn('Invalid input data for useDistanceFromGoalData');
      return { dataPoints: [], datasets: [] };
    }

    // Use the main chart's time periods - this is the key fix!
    const sortedPeriodKeys = mainChartData.dataPoints.map(dp => dp.x);
    
    if (sortedPeriodKeys.length === 0) {
      return { dataPoints: [], datasets: [] };
    }

    // Create category map for faster lookups
    const categoryMap = new Map(filteredCategoriesWithGoals.map(c => [c.id, c]));

    // Filter transactions to only include the filtered categories
    const filteredTransactions = transactions.filter(t => 
      t && t.category_id && categoryMap.has(t.category_id)
    );

    // Create datasets for each filtered category
    const datasets = filteredCategoriesWithGoals.map((category, index) => {
      let currentMonthSpending = 0;
      let currentMonth = '';
      
      const dataPoints = sortedPeriodKeys.map(periodKey => {
        const periodDate = new Date(periodKey);
        const monthKey = format(periodDate, 'yyyy-MM');
        
        // Reset spending if we've moved to a new month
        if (currentMonth !== monthKey) {
          currentMonthSpending = 0;
          currentMonth = monthKey;
        }
        
        // Find all transactions for this category up to this period within the current month
        const monthStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
        const periodEnd = new Date(periodKey);
        
        const periodSpending = filteredTransactions
          .filter(t => {
            const tDate = new Date(t.date);
            return t.category_id === category.id && 
                   t.type === 'payment' &&
                   tDate >= monthStart && 
                   tDate <= periodEnd;
          })
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        currentMonthSpending = periodSpending; // This is cumulative within the month
        
        // Calculate distance from goal or value accumulation based on goal type
        let yValue: number;
        
        if (category.goal === null || category.goal === undefined) {
          // For categories without goals (likely savings), show accumulation of assignments/income
          const monthAssignments = assignments
            .filter(a => a.category_id === category.id && a.month === monthKey)
            .reduce((sum, a) => sum + (a.assigned || 0), 0);
          
          // For savings categories, show positive accumulation (assignments minus spending)
          yValue = monthAssignments - currentMonthSpending;
        } else {
          // For categories with goals, show traditional distance from spending goal
          const goalAmount = category.goal;
          yValue = goalAmount - currentMonthSpending;
        }
        
        return {
          x: periodKey,
          y: yValue
        };
      });

      // Generate distinct colors for each category
      const colors = [
        '#bac2ff', '#ff7f7f', '#7fff7f', '#ffff7f', '#ff7fff', 
        '#7fffff', '#ffa500', '#ff69b4', '#98fb98', '#dda0dd'
      ];
      const color = colors[index % colors.length];

      // Create different labels based on goal type
      const label = category.goal === null || category.goal === undefined
        ? `${category.name} (Savings/No Goal)`
        : `${category.name} (Goal: ${formatCurrency(category.goal)})`;

      return {
        label: label,
        data: dataPoints,
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: false,
        tension: 0.2,
        pointRadius: dataPoints.length > 50 ? 2 : dataPoints.length > 30 ? 4 : 6,
        pointHoverRadius: dataPoints.length > 50 ? 4 : dataPoints.length > 30 ? 6 : 10,
        pointBackgroundColor: color,
        pointBorderColor: '#0a0a0a',
        pointBorderWidth: 1,
      };
    });

    return { dataPoints: sortedPeriodKeys, datasets };
  }, [filteredCategoriesWithGoals, transactions, assignments, dateRange, mainChartData]);
};

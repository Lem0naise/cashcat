// Chart-related type definitions
import { Database } from '../../../types/supabase';

export type Assignment = Database['public']['Tables']['assignments']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];

export interface BudgetAssignmentChartProps {
  assignments: Assignment[];
  categories: Category[];
  transactions: Transaction[];
  timeRange: '7d' | '30d' | 'mtd' | '3m' | 'ytd' | '12m' | 'all' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  selectedGroups: string[];
  selectedCategories: string[];
  showGoals: boolean;
  showRollover: boolean;
}

export interface ChartDataPoint {
  x: string;
  y: number;
  totalBudgetPool?: number;
  assignmentBreakdown?: { [categoryId: string]: number };
}

export interface VolumeDataPoint {
  x: string;
  assigned: number;
  removed: number;
  net: number;
  categories: string[];
  vendors: string[];
}

export interface ComparisonData {
  startDate: string;
  endDate: string;
  startValue: number;
  endValue: number;
  absoluteChange: number;
  percentageChange: number;
  timeSpan: number;
  categoryBreakdown?: Array<{
    categoryId: string;
    name: string;
    startValue: number;
    endValue: number;
    absoluteChange: number;
    percentageChange: number;
  }>;
}

export interface FilteredCategoriesWithGoals extends Category {
  // Extending Category to make goal field explicit
}

export interface DistanceFromGoalData {
  dataPoints: string[];
  datasets: Array<{
    label: string;
    data: Array<{ x: string; y: number }>;
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension: number;
    cubicInterpolationMode: 'monotone' | 'default';
    pointRadius: number;
    pointHoverRadius: number;
    pointBackgroundColor: string;
    pointBorderColor: string;
    pointBorderWidth: number;
  }>;
}

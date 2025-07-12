// Utility functions for segmented bar charts
import { VolumeDataPoint, Category, SegmentInfo, Transaction } from '../types';

// Color generation utilities
export const generateColorShades = (baseColor: string, count: number) => {
  // Parse the base color (supports both hex and rgba)
  let r, g, b;
  
  if (baseColor.startsWith('#')) {
    r = parseInt(baseColor.slice(1, 3), 16);
    g = parseInt(baseColor.slice(3, 5), 16);
    b = parseInt(baseColor.slice(5, 7), 16);
  } else if (baseColor.startsWith('rgb')) {
    const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (match) {
      r = parseInt(match[1], 10);
      g = parseInt(match[2], 10);
      b = parseInt(match[3], 10);
    } else {
      // Fallback if parsing fails
      r = 100; g = 100; b = 100;
    }
  } else {
    // Fallback if color format is unknown
    r = 100; g = 100; b = 100;
  }
  
  // Generate a range of shades
  const shades: string[] = [];
  
  // For a single item, just return the base color
  if (count <= 1) return [baseColor];
  
  // Generate unique shades for multiple items
  for (let i = 0; i < count; i++) {
    // Adjust brightness and saturation with more variation between shades
    const factor = 0.75 + (0.5 * (i / (count - 1))); // Range from 75% to 125% of original color
    
    // Ensure we don't go out of bounds (0-255)
    const adjustedR = Math.min(255, Math.max(0, Math.round(r * factor)));
    const adjustedG = Math.min(255, Math.max(0, Math.round(g * factor)));
    const adjustedB = Math.min(255, Math.max(0, Math.round(b * factor)));
    
    // Create new color with adjusted values
    // Use higher base opacity for better visibility but still allow bar outline to show through
    const alpha = Math.min(0.85, 0.65 + (0.2 * (i / (count - 1))));
    shades.push(`rgba(${adjustedR}, ${adjustedG}, ${adjustedB}, ${alpha})`);
  }
  
  return shades;
};

// Create linear gradient colors for segments
export const createGradient = (ctx: CanvasRenderingContext2D, baseColor: string) => {
  // Parse color components
  let r, g, b, a = 1;
  
  if (baseColor.startsWith('#')) {
    r = parseInt(baseColor.slice(1, 3), 16);
    g = parseInt(baseColor.slice(3, 5), 16);
    b = parseInt(baseColor.slice(5, 7), 16);
  } else if (baseColor.startsWith('rgb')) {
    const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      r = parseInt(match[1], 10);
      g = parseInt(match[2], 10);
      b = parseInt(match[3], 10);
      a = match[4] ? parseFloat(match[4]) : 1;
    } else {
      return baseColor; // Fallback if parsing fails
    }
  } else {
    return baseColor; // Fallback if color format is unknown
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  
  // Add color stops for smooth gradient effect
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${a * 0.95})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${a * 0.9})`);
  
  return gradient;
};

// Process volume data into segmented datasets
export type SegmentType = 'category' | 'vendor' | 'group';

// This interface is now imported from types.ts

export interface BarSegments {
  segments: SegmentInfo[];
  totalValue: number;
  segmentType: SegmentType;
}

export const processSegmentedBarData = (
  volumePoints: VolumeDataPoint[],
  categories: Category[],
  selectedCategories: string[],
  selectedGroups: string[],
  transactions?: Transaction[] // Add optional transactions parameter
) => {
  // Create a category map for lookup
  const categoryMap = new Map<string, Category>();
  const groupsMap = new Map<string, string[]>(); // Group name -> category ids
  
  // Populate maps
  categories.forEach(cat => {
    categoryMap.set(cat.id, cat);
    
    // Extract group name
    const groupName = (cat as any).groups?.name || cat.group || 'Uncategorized';
    
    // Add category to its group
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, []);
    }
    groupsMap.get(groupName)?.push(cat.id);
  });
  
  // Determine segment type based on filters
  const isSingleCategorySelected = selectedCategories.length === 1;
  const hasActiveFilters = selectedCategories.length > 0 || selectedGroups.length > 0;
  
  // If only one category is selected, we'll segment by vendor
  // If multiple categories or groups are selected, we'll segment by category
  // If no filters are active, we'll segment by group
  const segmentType: SegmentType = 
    isSingleCategorySelected ? 'vendor' :
    hasActiveFilters ? 'category' : 'group';
  
  // Create a map of transactions by date
  const transactionsByDate = new Map<string, Transaction[]>();
  
  if (transactions && Array.isArray(transactions)) {
    transactions.forEach(tx => {
      if (!tx.date) return;
      
      // Format date key to match volumePoint.x format
      const dateObj = new Date(tx.date);
      if (isNaN(dateObj.getTime())) return;
      
      const dateKey = dateObj.toISOString().split('T')[0] + ' 12:00:00';
      
      if (!transactionsByDate.has(dateKey)) {
        transactionsByDate.set(dateKey, []);
      }
      
      transactionsByDate.get(dateKey)?.push(tx);
    });
  }
  
  // Process each volume point to create segmented data
  return volumePoints.map(point => {
    const incomeSegments: BarSegments = {
      segments: [],
      totalValue: point.assigned,
      segmentType
    };
    
    const spendingSegments: BarSegments = {
      segments: [],
      totalValue: point.removed,
      segmentType
    };
    
    // Skip processing if there are no transactions in this time period
    if (point.assigned === 0 && point.removed === 0) {
      return { incomeSegments, spendingSegments };
    }
    
    // Get transactions for this date
    const dateTransactions = transactionsByDate.get(point.x) || [];
    
    // Process based on segment type
    if (segmentType === 'vendor' && isSingleCategorySelected) {
      // Segment by vendor (when a single category is selected)
      const vendors = point.vendors;
      
      // Maps to track actual amounts by vendor
      const vendorIncomeMap = new Map<string, number>();
      const vendorSpendingMap = new Map<string, number>();
      
      // Initialize all vendors with zero values
      vendors.forEach(vendor => {
        vendorIncomeMap.set(vendor, 0);
        vendorSpendingMap.set(vendor, 0);
      });
      
      // Populate with actual transaction values if we have transaction data
      if (dateTransactions.length > 0 && selectedCategories.length === 1) {
        // Get the selected category ID
        const selectedCategoryId = selectedCategories[0];
        
        // Filter transactions for this category
        const categoryTransactions = dateTransactions.filter(tx => 
          tx.category_id === selectedCategoryId
        );
        
        // Aggregate by vendor
        categoryTransactions.forEach(tx => {
          if (!tx.vendor) return;
          
          if (tx.type === 'income') {
            vendorIncomeMap.set(
              tx.vendor, 
              (vendorIncomeMap.get(tx.vendor) || 0) + tx.amount
            );
          } else if (tx.type === 'payment') {
            vendorSpendingMap.set(
              tx.vendor, 
              (vendorSpendingMap.get(tx.vendor) || 0) + Math.abs(tx.amount)
            );
          }
        });
      }
      
      // If we have no transaction data, or transactions don't match vendor data in the volumePoint,
      // we need a fallback to ensure we still show segments
      if (Array.from(vendorIncomeMap.values()).every(val => val === 0) && point.assigned > 0) {
        // Create proportional distribution based on vendor index
        vendors.forEach((vendor, index) => {
          // Just use vendor index as a proportional factor if we don't have real data
          // This ensures we at least show varying segment sizes
          const factor = 1 + index;
          vendorIncomeMap.set(vendor, factor);
        });
      }
      
      if (Array.from(vendorSpendingMap.values()).every(val => val === 0) && point.removed > 0) {
        // Create proportional distribution based on vendor index
        vendors.forEach((vendor, index) => {
          // Just use vendor index as a proportional factor if we don't have real data
          const factor = 1 + index;
          vendorSpendingMap.set(vendor, factor);
        });
      }
      
      // Calculate totals for normalization
      const totalIncomeByVendor = Array.from(vendorIncomeMap.values()).reduce((sum, val) => sum + val, 0);
      const totalSpendingByVendor = Array.from(vendorSpendingMap.values()).reduce((sum, val) => sum + val, 0);
      
      // Income segments with actual or proportional values
      if (point.assigned > 0) {
        vendors.forEach(vendor => {
          const amount = vendorIncomeMap.get(vendor) || 0;
          
          // If we have actual transaction amounts (totalIncomeByVendor matches point.assigned)
          // use them directly, otherwise normalize based on proportions
          let value;
          if (Math.abs(totalIncomeByVendor - point.assigned) < 0.01) {
            value = amount;
          } else if (totalIncomeByVendor > 0) {
            value = (amount / totalIncomeByVendor) * point.assigned;
          } else {
            value = point.assigned / vendors.length; // Fallback to equal distribution
          }
          
          if (value > 0) {
            incomeSegments.segments.push({
              name: vendor || 'Unknown',
              value,
              percentage: (value / point.assigned) * 100
            });
          }
        });
      }
      
      // Spending segments with actual or proportional values
      if (point.removed > 0) {
        vendors.forEach(vendor => {
          const amount = vendorSpendingMap.get(vendor) || 0;
          
          // If we have actual transaction amounts (totalSpendingByVendor matches point.removed)
          // use them directly, otherwise normalize based on proportions
          let value;
          if (Math.abs(totalSpendingByVendor - point.removed) < 0.01) {
            value = amount;
          } else if (totalSpendingByVendor > 0) {
            value = (amount / totalSpendingByVendor) * point.removed;
          } else {
            value = point.removed / vendors.length; // Fallback to equal distribution
          }
          
          if (value > 0) {
            spendingSegments.segments.push({
              name: vendor || 'Unknown',
              value,
              percentage: (value / point.removed) * 100
            });
          }
        });
      }
      
      // If no segments were created, add a default segment
      if (incomeSegments.segments.length === 0 && point.assigned > 0) {
        incomeSegments.segments.push({
          name: 'Income',
          value: point.assigned,
          percentage: 100
        });
      }
      
      if (spendingSegments.segments.length === 0 && point.removed > 0) {
        spendingSegments.segments.push({
          name: 'Spending',
          value: point.removed,
          percentage: 100
        });
      }
    } 
    else if (segmentType === 'category' || segmentType === 'group') {
      // Segment by category or group
      const categoryNames = point.categories;
      
      // Maps to track actual amounts by category and group
      const categoryIncomeMap = new Map<string, number>();
      const categorySpendingMap = new Map<string, number>();
      const groupIncomeMap = new Map<string, number>();
      const groupSpendingMap = new Map<string, number>();
      
      // Initialize with zero values
      categoryNames.forEach(catName => {
        categoryIncomeMap.set(catName, 0);
        categorySpendingMap.set(catName, 0);
      });
      
      groupsMap.forEach((_, groupName) => {
        groupIncomeMap.set(groupName, 0);
        groupSpendingMap.set(groupName, 0);
      });
      
      // If we have transaction data, use actual transaction amounts
      if (dateTransactions.length > 0) {
        // Process each transaction for this date
        dateTransactions.forEach(tx => {
          if (!tx.category_id) return;
          
          // Find the category
          const category = categoryMap.get(tx.category_id);
          if (!category || !category.name) return;
          
          // Skip transactions for categories not included in our filters
          if (selectedCategories.length > 0 && !selectedCategories.includes(tx.category_id)) {
            return;
          }
          
          // Skip transactions for groups not included in our filters
          if (selectedGroups.length > 0) {
            const groupName = (category as any).groups?.name || category.group || 'Uncategorized';
            if (!selectedGroups.includes(groupName)) {
              return;
            }
          }
          
          // Get the group name for this category
          const groupName = (category as any).groups?.name || category.group || 'Uncategorized';
          
          if (tx.type === 'income') {
            // Add to category income map
            categoryIncomeMap.set(
              category.name, 
              (categoryIncomeMap.get(category.name) || 0) + tx.amount
            );
            
            // Add to group income map
            groupIncomeMap.set(
              groupName, 
              (groupIncomeMap.get(groupName) || 0) + tx.amount
            );
          } else if (tx.type === 'payment') {
            // Add to category spending map
            categorySpendingMap.set(
              category.name, 
              (categorySpendingMap.get(category.name) || 0) + Math.abs(tx.amount)
            );
            
            // Add to group spending map
            groupSpendingMap.set(
              groupName, 
              (groupSpendingMap.get(groupName) || 0) + Math.abs(tx.amount)
            );
          }
        });
      }
      
      // Process category segments if needed
      if (segmentType === 'category') {
        // Calculate totals for normalization
        const totalCategoryIncome = Array.from(categoryIncomeMap.values()).reduce((sum, val) => sum + val, 0);
        const totalCategorySpending = Array.from(categorySpendingMap.values()).reduce((sum, val) => sum + val, 0);
        
        // Income segments with actual values
        if (point.assigned > 0) {
          categoryNames.forEach(catName => {
            const amount = categoryIncomeMap.get(catName) || 0;
            
            // If we have actual transaction amounts
            if (amount > 0) {
              // Calculate the value for this segment
              let value;
              // If total matches point.assigned, use direct amounts
              if (Math.abs(totalCategoryIncome - point.assigned) < 0.01) {
                value = amount;
              } else {
                // Otherwise normalize proportionally
                value = (amount / totalCategoryIncome) * point.assigned;
              }
              
              incomeSegments.segments.push({
                name: catName,
                value,
                percentage: (value / point.assigned) * 100
              });
            }
          });
        }
        
        // Spending segments with actual values
        if (point.removed > 0) {
          categoryNames.forEach(catName => {
            const amount = categorySpendingMap.get(catName) || 0;
            
            // If we have actual transaction amounts
            if (amount > 0) {
              // Calculate the value for this segment
              let value;
              // If total matches point.removed, use direct amounts
              if (Math.abs(totalCategorySpending - point.removed) < 0.01) {
                value = amount;
              } else {
                // Otherwise normalize proportionally
                value = (amount / totalCategorySpending) * point.removed;
              }
              
              spendingSegments.segments.push({
                name: catName,
                value,
                percentage: (value / point.removed) * 100
              });
            }
          });
        }
      }
      // Process group segments if needed
      else if (segmentType === 'group') {
        // Calculate totals for normalization
        const totalGroupIncome = Array.from(groupIncomeMap.values()).reduce((sum, val) => sum + val, 0);
        const totalGroupSpending = Array.from(groupSpendingMap.values()).reduce((sum, val) => sum + val, 0);
        
        // Income segments with actual values
        if (point.assigned > 0) {
          Array.from(groupIncomeMap.entries()).forEach(([groupName, amount]) => {
            // If we have actual transaction amounts
            if (amount > 0) {
              // Calculate the value for this segment
              let value;
              // If total matches point.assigned, use direct amounts
              if (Math.abs(totalGroupIncome - point.assigned) < 0.01) {
                value = amount;
              } else {
                // Otherwise normalize proportionally
                value = (amount / totalGroupIncome) * point.assigned;
              }
              
              incomeSegments.segments.push({
                name: groupName,
                value,
                percentage: (value / point.assigned) * 100
              });
            }
          });
        }
        
        // Spending segments with actual values
        if (point.removed > 0) {
          Array.from(groupSpendingMap.entries()).forEach(([groupName, amount]) => {
            // If we have actual transaction amounts
            if (amount > 0) {
              // Calculate the value for this segment
              let value;
              // If total matches point.removed, use direct amounts
              if (Math.abs(totalGroupSpending - point.removed) < 0.01) {
                value = amount;
              } else {
                // Otherwise normalize proportionally
                value = (amount / totalGroupSpending) * point.removed;
              }
              
              spendingSegments.segments.push({
                name: groupName,
                value,
                percentage: (value / point.removed) * 100
              });
            }
          });
        }
      }
      
      // Add default segments if no categories/groups were found or had non-zero weights
      if (incomeSegments.segments.length === 0 && point.assigned > 0) {
        incomeSegments.segments.push({
          name: 'Income',
          value: point.assigned,
          percentage: 100
        });
      }
      
      if (spendingSegments.segments.length === 0 && point.removed > 0) {
        spendingSegments.segments.push({
          name: 'Spending',
          value: point.removed,
          percentage: 100
        });
      }
    }
    
    // Sort segments by value (descending)
    incomeSegments.segments.sort((a, b) => b.value - a.value);
    spendingSegments.segments.sort((a, b) => b.value - a.value);
    
    // Calculate accurate percentages - ensure they add up to 100%
    if (incomeSegments.totalValue > 0 && incomeSegments.segments.length > 0) {
      const actualTotal = incomeSegments.segments.reduce((sum, segment) => sum + segment.value, 0);
      incomeSegments.segments.forEach(segment => {
        segment.percentage = (segment.value / actualTotal) * 100;
      });
    }
    
    if (spendingSegments.totalValue > 0 && spendingSegments.segments.length > 0) {
      const actualTotal = spendingSegments.segments.reduce((sum, segment) => sum + segment.value, 0);
      spendingSegments.segments.forEach(segment => {
        segment.percentage = (segment.value / actualTotal) * 100;
      });
    }
    
    return {
      incomeSegments,
      spendingSegments
    };
  });
};

'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3-sankey';
import { select } from 'd3-selection';
import { interpolateNumber } from 'd3-interpolate';
import { Transaction, Category } from '../../../components/charts/types';

interface SankeyNode {
  id: string;
  name: string;
  type: 'income-vendor' | 'group' | 'category' | 'spending-vendor';
  value: number;
  color?: string;
  groupId?: string;
  categoryId?: string;
  isExpanded?: boolean;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color?: string;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyDiagramProps {
  transactions: Transaction[];
  categories: Category[];
  dateRange: { start: Date; end: Date };
  onNodeClick?: (node: SankeyNode) => void;
  expandedNodes: Set<string>;
}

// Color palette matching CashCat design
const COLORS = {
  income: '#60A5FA', // Blue for income
  green: '#bac2ff',
  groups: [
    '#bac2ff', // Green
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#10B981', // Emerald
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ],
};

export default function SankeyDiagram({
  transactions,
  categories,
  dateRange,
  onNodeClick,
  expandedNodes,
}: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<SankeyNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<any>(null);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Process transactions into Sankey data
  const sankeyData = useMemo(() => {
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    const nodeMap = new Map<string, SankeyNode>();

    // Create category map for lookups
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Process income transactions
    const incomeByVendor = new Map<string, number>();
    filteredTransactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        const vendor = t.vendor || 'Unknown Source';
        incomeByVendor.set(vendor, (incomeByVendor.get(vendor) || 0) + Math.abs(t.amount));
      });

    // Process spending by group
    const spendingByGroup = new Map<string, { amount: number; color: string; categories: Map<string, number> }>();
    filteredTransactions
      .filter(t => t.type === 'payment')
      .forEach(t => {
        if (!t.category_id) return;
        const category = categoryMap.get(t.category_id);
        if (!category) return;

        const groupName = (category as any).groups?.name || category.group || 'Uncategorized';

        if (!spendingByGroup.has(groupName)) {
          spendingByGroup.set(groupName, {
            amount: 0,
            color: COLORS.groups[spendingByGroup.size % COLORS.groups.length],
            categories: new Map(),
          });
        }

        const groupData = spendingByGroup.get(groupName)!;
        groupData.amount += Math.abs(t.amount);

        groupData.categories.set(
          t.category_id,
          (groupData.categories.get(t.category_id) || 0) + Math.abs(t.amount)
        );
      });

    const totalIncome = Array.from(incomeByVendor.values()).reduce((sum, v) => sum + v, 0);
    const totalSpending = Array.from(spendingByGroup.values()).reduce((sum, v) => sum + v.amount, 0);
    const totalUnspent = Math.max(0, totalIncome - totalSpending);
    const totalDeficit = Math.max(0, totalSpending - totalIncome);

    // Create income vendor nodes (column 0)
    incomeByVendor.forEach((amount, vendor) => {
      const node: SankeyNode = {
        id: `income-${vendor}`,
        name: vendor,
        type: 'income-vendor',
        value: amount,
        color: COLORS.income,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // Create Rollover node if needed (column 0)
    if (totalDeficit > 0) {
      const rolloverNode: SankeyNode = {
        id: 'income-rollover',
        name: 'From Budget',
        type: 'income-vendor', // Keeps it in the first column
        value: totalDeficit,
        color: '#10B981', // Green
      };
      nodes.push(rolloverNode);
      nodeMap.set(rolloverNode.id, rolloverNode);
    }

    // Create Spent/Unspent nodes (column 1)
    if (totalSpending > 0) {
      const spentNode: SankeyNode = {
        id: 'spent',
        name: 'Spent',
        type: 'group',
        value: totalSpending,
        color: '#EF4444',
        isExpanded: true,
      };
      nodes.push(spentNode);
      nodeMap.set(spentNode.id, spentNode);
    }

    if (totalUnspent > 0) {
      const unspentNode: SankeyNode = {
        id: 'unspent',
        name: 'Unspent',
        type: 'group',
        value: totalUnspent,
        color: '#10B981',
      };
      nodes.push(unspentNode);
      nodeMap.set(unspentNode.id, unspentNode);
    }

    // Create group nodes (column 2)
    spendingByGroup.forEach((data, groupName) => {
      const groupId = `group-${groupName}`;
      const node: SankeyNode = {
        id: groupId,
        name: groupName,
        type: 'group',
        value: data.amount,
        color: data.color,
        isExpanded: expandedNodes.has(groupId),
      };
      nodes.push(node);
      nodeMap.set(node.id, node);

      // If group is expanded, create category nodes (column 3)
      if (expandedNodes.has(groupId)) {
        data.categories.forEach((amount, categoryId) => {
          const category = categoryMap.get(categoryId);
          if (!category) return;

          const catNodeId = `category-${categoryId}`;
          const categoryNode: SankeyNode = {
            id: catNodeId,
            name: category.name,
            type: 'category',
            value: amount,
            color: data.color,
            groupId: groupId,
            isExpanded: expandedNodes.has(catNodeId),
          };
          nodes.push(categoryNode);
          nodeMap.set(catNodeId, categoryNode);

          links.push({
            source: groupId,
            target: catNodeId,
            value: amount,
            color: data.color,
          });

          // If category is expanded, create vendor nodes (column 4)
          if (expandedNodes.has(catNodeId)) {
            const vendorSpending = new Map<string, number>();
            filteredTransactions
              .filter(t => t.type === 'payment' && t.category_id === categoryId)
              .forEach(t => {
                const vendor = t.vendor || 'Unknown';
                vendorSpending.set(vendor, (vendorSpending.get(vendor) || 0) + Math.abs(t.amount));
              });

            vendorSpending.forEach((vendorAmount, vendor) => {
              const vendorNodeId = `spending-vendor-${categoryId}-${vendor}`;
              const vendorNode: SankeyNode = {
                id: vendorNodeId,
                name: vendor,
                type: 'spending-vendor',
                value: vendorAmount,
                color: data.color,
                categoryId: catNodeId,
              };
              nodes.push(vendorNode);
              nodeMap.set(vendorNodeId, vendorNode);

              links.push({
                source: catNodeId,
                target: vendorNodeId,
                value: vendorAmount,
                color: data.color,
              });
            });
          }
        });
      }
    });

    // Create links from income to spent/unspent
    incomeByVendor.forEach((incomeAmount, vendor) => {
      if (totalDeficit > 0) {
        // If there's a deficit, all income goes to spent (augmented by rollover)
        links.push({
          source: `income-${vendor}`,
          target: 'spent',
          value: incomeAmount,
          color: 'rgba(239, 68, 68, 0.3)',
        });
      } else {
        // Normal case (Surplus or Balanced)
        if (totalSpending > 0) {
          links.push({
            source: `income-${vendor}`,
            target: 'spent',
            value: (incomeAmount * totalSpending) / totalIncome,
            color: 'rgba(239, 68, 68, 0.3)',
          });
        }

        if (totalUnspent > 0) {
          links.push({
            source: `income-${vendor}`,
            target: 'unspent',
            value: (incomeAmount * totalUnspent) / totalIncome,
            color: 'rgba(16, 185, 129, 0.3)',
          });
        }
      }
    });

    // Create link from Rollover to Spent
    if (totalDeficit > 0) {
      links.push({
        source: 'income-rollover',
        target: 'spent',
        value: totalDeficit,
        color: 'rgba(16, 185, 129, 0.3)',
      });
    }

    // Create links from spent to groups
    if (totalSpending > 0) {
      spendingByGroup.forEach((groupData, groupName) => {
        const groupId = `group-${groupName}`;
        links.push({
          source: 'spent',
          target: groupId,
          value: groupData.amount,
          color: `${groupData.color}80`,
        });
      });
    }

    return { nodes, links };
  }, [filteredTransactions, categories, expandedNodes]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width || 800, height: height || 600 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render Sankey diagram
  useEffect(() => {
    if (!svgRef.current || sankeyData.nodes.length === 0) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create Sankey layout with left alignment to keep columns consistent
    const sankey = d3
      .sankey()
      .nodeId((d: any) => d.id)
      .nodeAlign(d3.sankeyLeft) // Align nodes to left to maintain column structure
      .nodeWidth(15)
      .nodePadding(10)
      .extent([
        [0, 0],
        [width, height],
      ]);

    // Prepare data for d3-sankey with explicit node depths for column control
    const graph = {
      nodes: sankeyData.nodes.map(n => {
        // Set explicit horizontal position based on node type
        let nodeDepth = 0;
        if (n.type === 'income-vendor') nodeDepth = 0;
        else if (n.id === 'spent' || n.id === 'unspent') nodeDepth = 1;
        else if (n.type === 'group') nodeDepth = 2;
        else if (n.type === 'category') nodeDepth = 3;
        else if (n.type === 'spending-vendor') nodeDepth = 4;

        return { ...n, depth: nodeDepth };
      }),
      links: sankeyData.links.map(l => ({ ...l })),
    };

    // @ts-ignore
    const { nodes, links } = sankey(graph);

    // Calculate dynamic column width based on maximum depth
    const maxDepth = Math.max(...nodes.map((n: any) => n.depth || 0));
    const columnWidth = width / (maxDepth + 1);
    nodes.forEach((node: any) => {
      const nodeData = node as SankeyNode;
      if (nodeData.type === 'income-vendor') {
        // Income vendors in leftmost column
        node.x0 = 0;
        node.x1 = 15;
      } else if (nodeData.id === 'spent' || nodeData.id === 'unspent') {
        // Spent/Unspent in column 1
        node.x0 = columnWidth;
        node.x1 = columnWidth + 15;
      } else if (nodeData.type === 'group') {
        // Groups in column 2
        node.x0 = columnWidth * 2;
        node.x1 = columnWidth * 2 + 15;
      } else if (nodeData.type === 'category') {
        // Categories in column 3 when expanded
        node.x0 = columnWidth * 3;
        node.x1 = columnWidth * 3 + 15;
      } else if (nodeData.type === 'spending-vendor') {
        // Spending vendors in column 4 when expanded
        node.x0 = columnWidth * 4;
        node.x1 = columnWidth * 4 + 15;
      }
    });

    // Draw links
    const link = g
      .append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', (d: any) => d.color || '#999')
      .attr('stroke-opacity', (d: any) => {
        // Make links from expanded nodes more visible
        const source = d.source;
        if ((source.type === 'group' || source.type === 'category') && source.isExpanded) {
          return 0.4;
        }
        return 0.3;
      })
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('fill', 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: any, d: any) {
        select(this as SVGPathElement).attr('stroke-opacity', 0.6);
        setHoveredLink(d);
      })
      .on('mouseleave', function (event: any, d: any) {
        const source = d.source;
        const baseOpacity = ((source.type === 'group' || source.type === 'category') && source.isExpanded) ? 0.4 : 0.3;
        select(this as SVGPathElement).attr('stroke-opacity', baseOpacity);
        setHoveredLink(null);
      });

    // Draw nodes
    const node = g
      .append('g')
      .selectAll('rect')
      .data(nodes)
      .join('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => d.color || COLORS.green)
      .attr('stroke', (d: any) => {
        if (d.isExpanded) return COLORS.green;
        return 'none';
      })
      .attr('stroke-width', (d: any) => (d.isExpanded ? 2 : 0))
      .attr('rx', 4)
      .style('cursor', (d: any) => (d.type !== 'income-vendor' ? 'pointer' : 'default'))
      .on('mouseenter', function (event: any, d: any) {
        if (d.type !== 'spending-vendor') {
          select(this as SVGRectElement).attr('fill', (d: any) => {
            const color = d.color || COLORS.green;
            return color;
          }).style('filter', 'brightness(1.2)');
        }
        setHoveredNode(d);
      })
      .on('mouseleave', function (event: any, d: any) {
        select(this as SVGRectElement).attr('fill', (d: any) => d.color || COLORS.green).style('filter', 'none');
        setHoveredNode(null);
      })
      .on('click', function (event: any, d: any) {
        if (onNodeClick && d.type !== 'income-vendor') {
          onNodeClick(d);
        }
      });

    // Add node labels with better positioning for fixed columns
    g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('x', (d: any) => {
        // Income vendors: label on right
        // Groups: label on right
        // Categories: label on right  
        // Spending vendors: label on right
        return d.x1 + 6;
      })
      .attr('y', (d: any) => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .text((d: any) => d.name)
      .style('font-size', '12px')
      .style('fill', 'rgba(255, 255, 255, 0.8)')
      .style('pointer-events', 'none');

  }, [sankeyData, dimensions, onNodeClick]);

  const formatCurrency = (amount: number) => {
    const useThousandsSeparator = typeof window !== 'undefined' && localStorage.getItem('thousandsSeparator') === 'true';
    if (useThousandsSeparator) {
      return amount.toLocaleString('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
      });
    }
    const abs = Math.abs(amount);
    return `${amount < 0 ? '-' : ''}£${abs.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: false })}`;
  };

  return (
    <div className="w-full h-full overflow-x-auto touch-pan-x">
      <div
        className="relative w-full h-full min-w-[800px]"
        ref={containerRef}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
        />

        {/* Tooltip */}
        {hoveredNode && (
          <div
            className="absolute bg-black/90 text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-50 whitespace-nowrap"
            style={{
              left: '50%',
              top: '20px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold">{hoveredNode.name}</div>
            <div className="text-white/70">{formatCurrency(hoveredNode.value)}</div>
            {hoveredNode.type !== 'income-vendor' && !hoveredNode.isExpanded && (
              <div className="text-xs text-green mt-1">Click to expand</div>
            )}
            {hoveredNode.isExpanded && (
              <div className="text-xs text-green mt-1">Click to collapse</div>
            )}
          </div>
        )}

        {hoveredLink && (
          <div
            className="absolute bg-black/90 text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-50 whitespace-nowrap"
            style={{
              left: '50%',
              top: '60px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-white/70">{formatCurrency(hoveredLink.value)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

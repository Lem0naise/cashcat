'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3-sankey';
import { select } from 'd3-selection';
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

    // Create income vendor nodes
    let nodeIndex = 0;
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

        // Track category spending within group
        const categoryName = category.name;
        groupData.categories.set(
          t.category_id,
          (groupData.categories.get(t.category_id) || 0) + Math.abs(t.amount)
        );
      });

    // Create group nodes
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

      // If group is expanded, create category nodes
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

          // Link from group to category
          links.push({
            source: groupId,
            target: catNodeId,
            value: amount,
            color: data.color,
          });

          // If category is expanded, create vendor nodes
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

              // Link from category to vendor
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

    // Create links from income to groups (proportional distribution)
    const totalIncome = Array.from(incomeByVendor.values()).reduce((sum, v) => sum + v, 0);
    const totalSpending = Array.from(spendingByGroup.values()).reduce((sum, v) => sum + v.amount, 0);

    if (totalIncome > 0 && totalSpending > 0) {
      incomeByVendor.forEach((incomeAmount, vendor) => {
        spendingByGroup.forEach((groupData, groupName) => {
          const groupId = `group-${groupName}`;
          // Proportional link: income vendor contributes to group based on group's share of total spending
          const proportionalAmount = (incomeAmount * groupData.amount) / totalSpending;
          
          if (proportionalAmount > 0) {
            // If group is expanded, link to categories instead
            if (expandedNodes.has(groupId)) {
              groupData.categories.forEach((catAmount, categoryId) => {
                const catNodeId = `category-${categoryId}`;
                const catProportional = (incomeAmount * catAmount) / totalSpending;
                links.push({
                  source: `income-${vendor}`,
                  target: catNodeId,
                  value: catProportional,
                  color: groupData.color,
                });
              });
            } else {
              links.push({
                source: `income-${vendor}`,
                target: groupId,
                value: proportionalAmount,
                color: groupData.color,
              });
            }
          }
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

    // Create Sankey layout
    const sankey = d3
      .sankey()
      .nodeId((d: any) => d.id)
      .nodeWidth(15)
      .nodePadding(10)
      .extent([
        [0, 0],
        [width, height],
      ]);

    // Prepare data for d3-sankey
    const graph = {
      nodes: sankeyData.nodes.map(n => ({ ...n })),
      links: sankeyData.links.map(l => ({ ...l })),
    };

    // @ts-ignore
    const { nodes, links } = sankey(graph);

    // Draw links
    const link = g
      .append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', (d: any) => d.color || '#999')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('fill', 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: any, d: any) {
        select(this as SVGPathElement).attr('stroke-opacity', 0.6);
        setHoveredLink(d);
      })
      .on('mouseleave', function () {
        select(this as SVGPathElement).attr('stroke-opacity', 0.3);
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

    // Add node labels
    g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('x', (d: any) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr('y', (d: any) => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.x0 < width / 2 ? 'start' : 'end'))
      .text((d: any) => d.name)
      .style('font-size', '12px')
      .style('fill', 'rgba(255, 255, 255, 0.8)')
      .style('pointer-events', 'none');

  }, [sankeyData, dimensions, onNodeClick]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    });
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
      
      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="absolute bg-black/90 text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-50"
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
          className="absolute bg-black/90 text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-50"
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
  );
}

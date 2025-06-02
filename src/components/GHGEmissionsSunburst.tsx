'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { EmissionNode } from '../lib/data/ghgEmissions';

interface GHGEmissionsSunburstProps {
  data: EmissionNode[];
}

const sectorColors: { [key: string]: string } = {
  'energy': '#DC2626', // red-600
  'agriculture-forestry-land-use': '#059669', // green-600
  'industry': '#6B7280', // gray-500
  'waste': '#2563EB', // blue-600
};

export default function GHGEmissionsSunburst({ data }: GHGEmissionsSunburstProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup dimensions
    const width = 800;
    const height = 800;
    const radius = Math.min(width, height) / 2;

    // Constants for ring dimensions
    const CENTER_RADIUS = 0.58;
    const MIDDLE_RING_START = 0.68;
    const MIDDLE_RING_END = 0.78;
    const OUTER_RING_START = 0.88;
    const OUTER_RING_END = 0.98;

    // Font sizes for adaptive text system - much larger for center
    const FONT_SIZES = {
      CENTER_LARGE: '20px',     // Much larger font for horizontal center labels
      CENTER_SMALL: '14px',     // Smaller font for radial center labels
      MIDDLE: '14px',           // Middle ring labels
      OUTER: '12px'             // Outer ring labels
    };

    // Minimum arc lengths for different label types
    const MIN_ARC_LENGTH = {
      CENTER_HORIZONTAL: 80,    // Minimum for horizontal center text (large sectors)
      CENTER_RADIAL: 20,        // Minimum for radial center text (small sectors)
      RING_CURVED: 30,          // Minimum for curved ring text
      RING_RADIAL: 20           // Minimum for radial ring text when curved fails
    };

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Create arc generators for each ring
    const centerArc = d3.arc<d3.DefaultArcObject>()
      .innerRadius(0)
      .outerRadius(radius * CENTER_RADIUS)
      .padAngle(0.01)
      .padRadius(radius);

    const middleArc = d3.arc<d3.DefaultArcObject>()
      .innerRadius(radius * MIDDLE_RING_START)
      .outerRadius(radius * MIDDLE_RING_END)
      .padAngle(0.01)
      .padRadius(radius);

    const outerArc = d3.arc<d3.DefaultArcObject>()
      .innerRadius(radius * OUTER_RING_START)
      .outerRadius(radius * OUTER_RING_END)
      .padAngle(0.01)
      .padRadius(radius);

    // Process data into hierarchical structure
    interface HierarchyDatum extends d3.DefaultArcObject {
      children?: HierarchyDatum[];
      id?: string;
      name?: string;
      share?: number;
      depth?: number;
    }

    // Transform the flat data into a hierarchical structure
    const processData = (data: EmissionNode[]): HierarchyDatum => {
      const root: HierarchyDatum = {
        children: [],
        startAngle: 0,
        endAngle: 2 * Math.PI,
        innerRadius: 0,
        outerRadius: radius
      };

      let currentAngle = 0;
      const angleScale = (2 * Math.PI) / 100; // Convert percentages to radians

      data.forEach(sector => {
        const sectorNode: HierarchyDatum = {
          id: sector.id,
          name: sector.name,
          share: sector.share,
          startAngle: currentAngle,
          endAngle: currentAngle + (sector.share || 0) * angleScale,
          innerRadius: 0,
          outerRadius: radius * CENTER_RADIUS,
          children: [],
          depth: 1
        };

        if (sector.children) {
          let subsectorStartAngle = sectorNode.startAngle;
          sector.children.forEach(subsector => {
            const subsectorNode: HierarchyDatum = {
              id: subsector.id,
              name: subsector.name,
              share: subsector.share,
              startAngle: subsectorStartAngle,
              endAngle: subsectorStartAngle + (subsector.share || 0) * angleScale,
              innerRadius: radius * MIDDLE_RING_START,
              outerRadius: radius * MIDDLE_RING_END,
              children: [],
              depth: 2
            };

            if (subsector.children) {
              let subsubStartAngle = subsectorNode.startAngle;
              subsector.children.forEach(subsubsector => {
                const subsubNode: HierarchyDatum = {
                  id: subsubsector.id,
                  name: subsubsector.name,
                  share: subsubsector.share,
                  startAngle: subsubStartAngle,
                  endAngle: subsubStartAngle + (subsubsector.share || 0) * angleScale,
                  innerRadius: radius * OUTER_RING_START,
                  outerRadius: radius * OUTER_RING_END,
                  depth: 3
                };
                subsubStartAngle = subsubNode.endAngle;
                subsectorNode.children?.push(subsubNode);
              });
            }

            subsectorStartAngle = subsectorNode.endAngle;
            sectorNode.children?.push(subsectorNode);
          });
        }

        currentAngle = sectorNode.endAngle;
        root.children?.push(sectorNode);
      });

      return root;
    };

    const hierarchicalData = processData(data);

    // Function to get the appropriate arc generator
    const getArc = (depth: number) => {
      switch (depth) {
        case 1: return centerArc;
        case 2: return middleArc;
        case 3: return outerArc;
        default: return centerArc;
      }
    };

    // LABEL RENDERING FUNCTIONS
    // =========================

    // CENTER LABEL RENDERING FUNCTION - Horizontal for large sectors, radial for small
    function renderCenterLabel(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      node: HierarchyDatum,
      midAngle: number,
      arcLength: number
    ) {
      if (arcLength < MIN_ARC_LENGTH.CENTER_RADIAL) return;

      const angle = midAngle * 180 / Math.PI - 90;
      const text = node.name || '';
      const percentage = `(${node.share}%)`;

      // For large sectors (Energy, Agriculture), use horizontal alignment
      if (arcLength > MIN_ARC_LENGTH.CENTER_HORIZONTAL) {
        createHorizontalCenterLabel(g, node, text, percentage, angle, FONT_SIZES.CENTER_LARGE);
      } else {
        // For smaller sectors, use radial alignment positioned near the arc
        const labelRadius = radius * CENTER_RADIUS * 0.8; // Position closer to the edge
        createRadialCenterLabel(g, `${text}\n${percentage}`, angle, labelRadius, FONT_SIZES.CENTER_SMALL);
      }
    }

    // RING LABEL RENDERING FUNCTION - Curved when possible, radial fallback
    function renderRingLabel(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      node: HierarchyDatum,
      midAngle: number,
      arcLength: number
    ) {
      const isMiddleRing = node.depth === 2;
      
      // Position curved text at the center of each ring
      const curvedLabelRadius = isMiddleRing ? 
        radius * (MIDDLE_RING_START + MIDDLE_RING_END) / 2 :
        radius * (OUTER_RING_START + OUTER_RING_END) / 2;
      
      // Position radial text starting from the outer edge, extending outward (like reference image)
      const radialLabelRadius = isMiddleRing ? 
        radius * MIDDLE_RING_END : // Start exactly at the outer edge of middle ring
        radius * OUTER_RING_END;   // Start exactly at the outer edge of outer ring
      
      const fontSize = isMiddleRing ? FONT_SIZES.MIDDLE : FONT_SIZES.OUTER;
      const text = `${node.name} (${node.share}%)`;

      // Try curved text first, fallback to radial if too small or would be upside down
      if (arcLength > MIN_ARC_LENGTH.RING_CURVED) {
        const estimatedTextWidth = text.length * parseFloat(fontSize) * 0.5;
        if (estimatedTextWidth < arcLength && !wouldBeUpsideDown(midAngle)) {
          createCurvedRingLabel(g, node, curvedLabelRadius, fontSize, text);
          return;
        }
      }
      
      // Fallback to radial orientation - positioned near outer edge
      if (arcLength > MIN_ARC_LENGTH.RING_RADIAL) {
        createRadialRingLabel(g, node, radialLabelRadius, fontSize, text, midAngle);
      }
    }

    // Helper function to check if text would be upside down
    function wouldBeUpsideDown(midAngle: number): boolean {
      // More precise detection - avoid the bottom 180 degrees for curved text
      return midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
    }

    // HORIZONTAL CENTER LABEL CREATION - For large sectors
    function createHorizontalCenterLabel(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      node: HierarchyDatum,
      text: string,
      percentage: string,
      angle: number,
      fontSize: string
    ) {
      // Calculate available width based on sector arc length at label radius
      const labelRadius = radius * CENTER_RADIUS * 0.5;
      const sectorAngle = Math.abs(node.endAngle - node.startAngle); // Get sector angle in radians
      const availableWidth = sectorAngle * labelRadius * 0.8; // 80% of arc length for safety margin
      const charWidth = parseFloat(fontSize) * 0.6; // Approximate character width
      const maxCharsPerLine = Math.floor(availableWidth / charWidth);

      // Smart line breaking that respects sector width
      const words = text.split(/[\s&,]+/);
      const lines = [];
      
      if (text.length > 15 && maxCharsPerLine > 5) {
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              lines.push(word); // Single word too long, force it
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
      } else {
        lines.push(text);
      }
      
      // Add percentage as last line
      lines.push(percentage);

      const lineHeight = parseFloat(fontSize) * 1.1;
      
      // Normalize angle to handle text orientation correctly
      const normalizedAngle = ((angle % 360) + 360) % 360;
      const isBottomHalf = normalizedAngle > 90 && normalizedAngle < 270;

      // Simple centering: calculate offset from center for each line
      const totalLines = lines.length;
      const centerOffset = (totalLines - 1) * lineHeight / 2;

      lines.forEach((line, i) => {
        // For bottom half, reverse the line order to read top to bottom
        const displayIndex = isBottomHalf ? totalLines - 1 - i : i;
        
        // Position relative to center: start from top and go down
        const yPosition = -centerOffset + (displayIndex * lineHeight);
        
        g.append('text')
          .attr('dy', '0.35em')
          .attr('fill', '#FFFFFF')
          .attr('font-size', fontSize)
          .attr('font-weight', 'bold')
          .attr('transform', `rotate(${angle}) translate(${labelRadius},${yPosition}) rotate(${-angle})`)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .text(line);
      });
    }

    // RADIAL CENTER LABEL CREATION - For smaller sectors, positioned near arc edge
    function createRadialCenterLabel(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      text: string,
      angle: number,
      labelRadius: number,
      fontSize: string
    ) {
      const lines = text.split('\n');
      const lineHeight = parseFloat(fontSize) * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = -totalHeight / 2 + lineHeight / 2;

      // Normalize angle to 0-360 range
      const normalizedAngle = ((angle % 360) + 360) % 360;
      
      // For bottom half (90° to 270°), flip text to keep it readable
      const isBottomHalf = normalizedAngle > 90 && normalizedAngle < 270;
      const textAngle = isBottomHalf ? angle + 180 : angle;
      
      // Adjust label position for flipped text
      const adjustedRadius = isBottomHalf ? -labelRadius : labelRadius;

      lines.forEach((line, i) => {
        g.append('text')
          .attr('dy', '0.35em')
          .attr('fill', '#FFFFFF')
          .attr('font-size', fontSize)
          .attr('font-weight', 'bold')
          .attr('transform', `rotate(${textAngle}) translate(${adjustedRadius},${startY + i * lineHeight})`)
          .attr('text-anchor', 'middle')
          .text(line);
      });
    }

    // CURVED RING LABEL CREATION - For ring labels when space allows
    function createCurvedRingLabel(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      node: HierarchyDatum,
      labelRadius: number,
      fontSize: string,
      text: string
    ) {
      const midAngle = (node.startAngle + node.endAngle) / 2;
      const id = `label-${node.id}-${node.depth}-${Math.random().toString(36).substr(2, 9)}`;

      // Create the path for curved text - properly oriented
      const isBottomHalf = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
      
      g.append('path')
        .attr('id', id)
        .attr('d', d3.arc()({
          startAngle: isBottomHalf ? node.endAngle : node.startAngle,
          endAngle: isBottomHalf ? node.startAngle : node.endAngle,
          innerRadius: labelRadius,
          outerRadius: labelRadius
        }))
        .style('fill', 'none')
        .style('display', 'none');

      // Add the curved text
      g.append('text')
        .attr('dy', '0.35em')
        .attr('font-size', fontSize)
        .attr('fill', '#374151')
        .append('textPath')
        .attr('xlink:href', `#${id}`)
        .attr('startOffset', '50%')
        .attr('text-anchor', 'middle')
        .text(text);
    }

    // RADIAL RING LABEL CREATION - Extending radially outward like spokes
    function createRadialRingLabel(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      node: HierarchyDatum,
      labelRadius: number,
      fontSize: string,
      text: string,
      midAngle: number
    ) {
      // Split long text into multiple lines if needed
      const words = text.split(' ');
      const lines = [];
      if (words.length > 3 && text.length > 20) {
        const mid = Math.ceil(words.length / 2);
        lines.push(words.slice(0, mid).join(' '));
        lines.push(words.slice(mid).join(' '));
      } else {
        lines.push(text);
      }

      const lineHeight = parseFloat(fontSize) * 1.1;
      
      // Calculate the starting position at the outer edge of the ring
      const startX = Math.cos(midAngle - Math.PI / 2) * labelRadius;
      const startY = Math.sin(midAngle - Math.PI / 2) * labelRadius;
      
      // Calculate direction vector for extending outward
      const dirX = Math.cos(midAngle - Math.PI / 2);
      const dirY = Math.sin(midAngle - Math.PI / 2);
      
      // Extension distance
      const extensionDistance = 15;
      
      // Convert angle to degrees for rotation
      const angleDegrees = (midAngle - Math.PI / 2) * 180 / Math.PI;
      
      // Determine if text should be flipped to remain readable
      const normalizedAngle = ((angleDegrees % 360) + 360) % 360;
      const shouldFlip = normalizedAngle > 90 && normalizedAngle < 270;
      
      // Calculate final rotation and text anchor
      const textRotation = shouldFlip ? angleDegrees + 180 : angleDegrees;
      const textAnchor = shouldFlip ? 'end' : 'start';

      lines.forEach((line, i) => {
        // Position each line extending outward from the ring edge
        const finalX = startX + (dirX * extensionDistance);
        const finalY = startY + (dirY * extensionDistance) + (i * lineHeight);
        
        g.append('text')
          .attr('x', finalX)
          .attr('y', finalY)
          .attr('transform', `rotate(${textRotation}, ${finalX}, ${finalY})`)
          .attr('dy', '0.35em')
          .attr('fill', '#374151')
          .attr('font-size', fontSize)
          .attr('text-anchor', textAnchor)
          .attr('dominant-baseline', 'middle')
          .text(line);
      });
    }

    // Recursive function to render arcs
    const renderArcs = (parent: d3.Selection<SVGGElement, unknown, null, undefined>, node: HierarchyDatum) => {
      const g = parent.append('g');

      // Draw this node's arc
      if (node.depth) {
        g.append('path')
          .attr('d', getArc(node.depth)({
            startAngle: node.startAngle,
            endAngle: node.endAngle,
            innerRadius: node.innerRadius,
            outerRadius: node.outerRadius
          }))
          .attr('fill', node.depth === 1 ? (sectorColors[node.id || ''] || '#94A3B8') : '#CBD5E1');

        // LABEL RENDERING SYSTEM
        // ======================
        // CENTER LABELS: Horizontal for large sectors, radial for small
        // RING LABELS: Curved when possible, radial extending outward when too small or upside down
        // Never show upside down text

        const midAngle = (node.startAngle + node.endAngle) / 2;
        const arcLength = Math.abs(node.endAngle - node.startAngle) * 
          (node.depth === 1 ? radius * CENTER_RADIUS :
           node.depth === 2 ? radius * MIDDLE_RING_END :
           radius * OUTER_RING_END);

        if (node.depth === 1) {
          // CENTER PIE CHART LABELS - Horizontal for large sectors, radial for small
          renderCenterLabel(g, node, midAngle, arcLength);
        } else if (node.depth === 2 || node.depth === 3) {
          // RING LABELS - Curved preferred, radial extending outward as fallback
          renderRingLabel(g, node, midAngle, arcLength);
        }
      }

      // Recursively render children
      if (node.children) {
        node.children.forEach(child => renderArcs(g, child));
      }
    };

    // Start rendering from root
    renderArcs(svg, hierarchicalData);

  }, [data]);

  return (
    <div className="flex justify-center items-center bg-white rounded-lg shadow-lg p-8">
      <svg ref={svgRef} />
    </div>
  );
}
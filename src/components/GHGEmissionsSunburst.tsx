'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { EmissionNode } from '../lib/data/ghgEmissions';

interface GHGEmissionsSunburstProps {
  data: EmissionNode[];
}

const sectorColors: { [key: string]: string } = {
  'energy': '#F59E0B', // amber-500 (orange from the reference)
  'agriculture-forestry-land-use': '#10B981', // emerald-500 (green from the reference)
  'industry': '#06B6D4', // cyan-500 (blue/teal from the reference)
  'waste': '#8B5CF6', // violet-500 (purple from the reference)
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

    // Function to get color based on depth and parent sector
    const getNodeColor = (node: HierarchyDatum, parentSectorId?: string): string => {
      if (node.depth === 1) {
        // Main sectors - use the defined colors
        return sectorColors[node.id || ''] || '#94A3B8';
      } else if (node.depth === 2) {
        // Subsectors - lighter version of parent sector color
        switch (parentSectorId) {
          case 'energy': return '#FCD34D'; // amber-300
          case 'agriculture-forestry-land-use': return '#6EE7B7'; // emerald-300
          case 'industry': return '#67E8F9'; // cyan-300
          case 'waste': return '#C4B5FD'; // violet-300
          default: return '#CBD5E1'; // gray-300
        }
      } else if (node.depth === 3) {
        // Sub-subsectors - even lighter version
        switch (parentSectorId) {
          case 'energy': return '#FEF3C7'; // amber-100
          case 'agriculture-forestry-land-use': return '#D1FAE5'; // emerald-100
          case 'industry': return '#CFFAFE'; // cyan-100
          case 'waste': return '#EDE9FE'; // violet-100
          default: return '#F1F5F9'; // gray-100
        }
      }
      return '#CBD5E1'; // fallback
    };

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
        // For smaller sectors, use radial alignment positioned near the arc edge
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
      
      // For curved labels, position them between rings to avoid overlap
      const curvedLabelRadius = isMiddleRing ? 
        radius * MIDDLE_RING_END + 5 : // Reduced space from middle ring
        radius * (OUTER_RING_END + 0.02); // Just slightly outside outer ring to avoid overlap
      
      // Position radial text starting from the outer edge, extending outward
      const radialLabelRadius = isMiddleRing ? 
        radius * MIDDLE_RING_END : 
        radius * OUTER_RING_END;   
      
      const fontSize = isMiddleRing ? FONT_SIZES.MIDDLE : FONT_SIZES.OUTER;
      const text = `${node.name} (${node.share}%)`;

      // BALANCED LOGIC - Allow curved for medium-large segments, radial for smaller ones
      // Based on console data: Energy use in Industry (474.4, 30 chars), Transport (317.6, 17 chars), Energy use in buildings (343.1, 31 chars)
      // Keep smaller segments like Livestock & manure (113.7, 25 chars), Agricultural soils (80.4, 25 chars) as radial
      
      let shouldUseCurved = false;
      
      if (isMiddleRing) {
        // Middle ring: Allow curved for substantial segments
        const isLarge = arcLength >= 250; // Allow Transport (317.6) and larger
        const isReasonableText = text.length <= 35; // Allow most middle ring text
        const isMedium = arcLength >= 150; // For medium segments
        const isShortText = text.length <= 25; // Shorter text for medium segments
        
        shouldUseCurved = (isLarge && isReasonableText) || (isMedium && isShortText);
      } else {
        // Outer ring: Allow curved only for large segments with short text
        const isLarge = arcLength >= 200; // Allow larger outer segments
        const isShortText = text.length <= 20; // Keep text reasonable
        shouldUseCurved = isLarge && isShortText;
      }
      
      if (shouldUseCurved) {
        createCurvedRingLabel(g, node, curvedLabelRadius, fontSize, text);
        return;
      }
      
      // Use radial orientation only for very small arcs or very long text
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
      // Position at the geometric center of the sector
      // Calculate the exact x,y coordinates of the geometric center
      const sectorMidAngle = (node.startAngle + node.endAngle) / 2;
      const sectorCenterRadius = radius * CENTER_RADIUS / 2; // Halfway from center to edge
      
      // Calculate x,y position of the geometric center
      const centerX = Math.cos(sectorMidAngle - Math.PI / 2) * sectorCenterRadius;
      const centerY = Math.sin(sectorMidAngle - Math.PI / 2) * sectorCenterRadius;

      // Calculate available width based on sector arc length at label radius
      const sectorAngle = Math.abs(node.endAngle - node.startAngle); // Get sector angle in radians
      const availableWidth = sectorAngle * sectorCenterRadius * 0.8; // 80% of arc length for safety margin
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
      
      // Calculate the central position for the entire label block
      const totalLines = lines.length;

      lines.forEach((line, i) => {
        // For perfect centering, calculate position relative to center
        const totalSpan = (totalLines - 1) * lineHeight;
        const yOffset = -(totalSpan / 2) + (i * lineHeight);
        
        g.append('text')
          .attr('x', centerX)
          .attr('y', centerY + yOffset)
          .attr('fill', '#FFFFFF')
          .attr('font-size', fontSize)
          .attr('font-weight', 'bold')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .text(line);
      });
    }

    // RADIAL CENTER LABEL CREATION - For smaller sectors, positioned at geometric center
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

    // CURVED RING LABEL CREATION - Full segment arc, proper centering
    function createCurvedRingLabel(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      node: HierarchyDatum,
      labelRadius: number,
      fontSize: string,
      text: string
    ) {
      const midAngle = (node.startAngle + node.endAngle) / 2;
      const id = `label-${node.id}-${node.depth}-${Math.random().toString(36).substr(2, 9)}`;

      // Determine if we're in the bottom half
      const isBottomHalf = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
      
      // Use consistent path direction
      const pathStartAngle = node.startAngle;
      const pathEndAngle = node.endAngle;
      
      // Position text outside the ring
      const textRadius = labelRadius + 10; // Match radial label spacing (extensionDistance = 10)

      // Create the curved path with consistent direction
      g.append('path')
        .attr('id', id)
        .attr('d', d3.arc()({
          startAngle: pathStartAngle,
          endAngle: pathEndAngle,
          innerRadius: textRadius,
          outerRadius: textRadius
        }))
        .style('fill', 'none')
        .style('display', 'none');

      // Split text into words to handle potential line breaks
      const words = text.split(' ');
      
      // For bottom half, start from the other end to read left-to-right
      const startOffset = isBottomHalf ? '100%' : '0%';
      const textAnchor = isBottomHalf ? 'end' : 'start';
      
      // Create text with proper orientation
      g.append('text')
        .attr('font-size', fontSize)
        .attr('fill', '#374151')
        .append('textPath')
        .attr('xlink:href', `#${id}`)
        .attr('startOffset', startOffset)
        .attr('text-anchor', textAnchor)
        .attr('dy', isBottomHalf ? '-0.3em' : '1.0em') // Adjust position based on location
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
      // Calculate available space from ring edge to SVG boundary
      const svgCenterX = width / 2;
      const svgCenterY = height / 2;
      const maxDistanceToEdge = Math.min(svgCenterX, svgCenterY) - 20; // 20px margin
      
      // Calculate how much space we have from the ring edge to the boundary
      const availableSpace = maxDistanceToEdge - labelRadius;
      
      // Estimate character width and calculate max characters per line
      const charWidth = parseFloat(fontSize) * 0.6;
      const maxCharsPerLine = Math.max(15, Math.floor(availableSpace / charWidth * 0.9)); // Better threshold for Rice cultivation
      
      // Smart line breaking - try to keep percentage with some text
      const words = text.split(' ');
      const lines = [];
      
      // First, try to separate the percentage part
      const lastWord = words[words.length - 1];
      const isPercentage = lastWord.includes('(') && lastWord.includes('%') && lastWord.includes(')');
      
      if (isPercentage && words.length > 2) { // At least 3 words to consider smart breaking
        // Try to keep some text with the percentage
        const mainWords = words.slice(0, -1);
        const percentageWord = lastWord;
        
        let currentLine = '';
        
        // Process main words
        for (let i = 0; i < mainWords.length; i++) {
          const word = mainWords[i];
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          
          // Check if we can fit the percentage on this line too (if it's the last main word)
          const isLastMainWord = i === mainWords.length - 1;
          const testWithPercentage = isLastMainWord ? `${testLine} ${percentageWord}` : testLine;
          
          if (isLastMainWord && testWithPercentage.length <= maxCharsPerLine) {
            // Can fit everything on one line
            lines.push(testWithPercentage);
            break;
          } else if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
            
            // If this is the last word, add current line and percentage separately
            if (isLastMainWord) {
              lines.push(currentLine);
              lines.push(percentageWord);
            }
          } else {
            // Line is too long, save current line and start new one
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
              
              // If this is the last word, also add the percentage
              if (isLastMainWord) {
                lines.push(currentLine);
                lines.push(percentageWord);
              }
            } else {
              lines.push(word);
              if (isLastMainWord) {
                lines.push(percentageWord);
              }
            }
          }
        }
      } else {
        // Standard line breaking for non-percentage text or simple cases
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
              lines.push(word);
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
      }

      const lineHeight = parseFloat(fontSize) * 1.2;
      
      // Convert angle to degrees for rotation
      const angleDegrees = (midAngle - Math.PI / 2) * 180 / Math.PI;
      
      // Determine if text should be flipped to remain readable
      const normalizedAngle = ((angleDegrees % 360) + 360) % 360;
      const shouldFlip = normalizedAngle > 90 && normalizedAngle < 270;
      
      // Calculate final rotation and text anchor
      const textRotation = shouldFlip ? angleDegrees + 180 : angleDegrees;
      const textAnchor = shouldFlip ? 'end' : 'start';

      // Extension distance from the ring edge
      const extensionDistance = 10;

      lines.forEach((line, i) => {
        // Calculate individual position for each line BEFORE rotation
        // This ensures consistent spacing regardless of rotation angle
        
        // Start from the outer edge of the ring
        const baseRadius = labelRadius + extensionDistance;
        
        // For left side labels (flipped), reverse the line order so text reads top to bottom
        const lineIndex = shouldFlip ? (lines.length - 1 - i) : i;
        
        // Calculate line offset along the direction perpendicular to the radial direction
        // This creates consistent vertical spacing in the "text's local coordinate system"
        const lineOffset = (lineIndex - (lines.length - 1) / 2) * lineHeight;
        
        // For each line, calculate its position in Cartesian coordinates
        // Base position along the radial direction
        const baseX = Math.cos(midAngle - Math.PI / 2) * baseRadius;
        const baseY = Math.sin(midAngle - Math.PI / 2) * baseRadius;
        
        // Offset position perpendicular to radial direction for line spacing
        // The perpendicular direction is rotated 90 degrees from the radial direction
        const perpX = -Math.sin(midAngle - Math.PI / 2) * lineOffset;
        const perpY = Math.cos(midAngle - Math.PI / 2) * lineOffset;
        
        const finalX = baseX + perpX;
        const finalY = baseY + perpY;
        
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
    const renderArcs = (parent: d3.Selection<SVGGElement, unknown, null, undefined>, node: HierarchyDatum, parentSectorId?: string) => {
      const g = parent.append('g');

      // Draw this node's arc
      if (node.depth) {
        // Determine the sector ID for color selection
        const currentSectorId = node.depth === 1 ? node.id : parentSectorId;
        
        g.append('path')
          .attr('d', getArc(node.depth)({
            startAngle: node.startAngle,
            endAngle: node.endAngle,
            innerRadius: node.innerRadius,
            outerRadius: node.outerRadius
          }))
          .attr('fill', getNodeColor(node, currentSectorId));

        // Add center labels for main sectors
        if (node.depth === 1) {
          const midAngle = (node.startAngle + node.endAngle) / 2;
          const arcLength = Math.abs(node.endAngle - node.startAngle) * radius * CENTER_RADIUS;
          renderCenterLabel(g, node, midAngle, arcLength);
        } else if (node.depth === 2 || node.depth === 3) {
          // RING LABELS - Curved preferred, radial extending outward as fallback
          const midAngle = (node.startAngle + node.endAngle) / 2;
          const arcLength = Math.abs(node.endAngle - node.startAngle) * 
            (node.depth === 2 ? radius * MIDDLE_RING_END : radius * OUTER_RING_END);
          renderRingLabel(g, node, midAngle, arcLength);
        }
      }

      // Recursively render children
      if (node.children) {
        node.children.forEach(child => renderArcs(g, child, node.depth === 1 ? node.id : parentSectorId));
      }
    };

    // Start rendering from root
    renderArcs(svg, hierarchicalData, undefined);

  }, [data]);

  return (
    <div className="flex justify-center items-center bg-white rounded-lg shadow-lg">
      <svg ref={svgRef} />
    </div>
  );
} 
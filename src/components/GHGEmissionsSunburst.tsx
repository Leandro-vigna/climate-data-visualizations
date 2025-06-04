'use client';

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { EmissionNode } from '../lib/data/ghgEmissions';

interface GHGEmissionsSunburstProps {
  data: EmissionNode[];
  labelOverrides?: { [key: string]: 'radial' | 'curved' };
  editMode?: boolean;
  onLabelOverridesChange?: (overrides: { [key: string]: 'radial' | 'curved' }) => void;
  onSaveOverrides?: (overrides: { [key: string]: 'radial' | 'curved' }) => void;
  onRestoreDefaults?: () => void;
}

const sectorColors: { [key: string]: string } = {
  'energy': '#F59E0B', // amber-500 (orange from the reference)
  'agriculture-forestry-land-use': '#10B981', // emerald-500 (green from the reference)
  'industry': '#06B6D4', // cyan-500 (blue/teal from the reference)
  'waste': '#8B5CF6', // violet-500 (purple from the reference)
};

const GHGEmissionsSunburst = forwardRef(function GHGEmissionsSunburst({
  data,
  labelOverrides: propLabelOverrides,
  editMode = false,
  onLabelOverridesChange,
  onSaveOverrides,
  onRestoreDefaults
}: GHGEmissionsSunburstProps, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [localLabelOverrides, setLocalLabelOverrides] = useState<{ [key: string]: 'radial' | 'curved' }>({});
  const labelOverrides = editMode ? localLabelOverrides : (propLabelOverrides || {});

  // Expose a method to get the current localLabelOverrides
  useImperativeHandle(ref, () => ({
    getLabelOverrides: () => localLabelOverrides,
    resetLocalLabelOverrides: () => setLocalLabelOverrides({}),
    setLocalLabelOverrides: (overrides: { [key: string]: 'radial' | 'curved' }) => setLocalLabelOverrides(overrides),
  }), [localLabelOverrides]);

  // Only set localLabelOverrides when entering edit mode
  useEffect(() => {
    if (editMode && propLabelOverrides) {
      setLocalLabelOverrides(propLabelOverrides);
    }
    // Do NOT reset localLabelOverrides on exit, let it be ignored
  }, [editMode]);

  // Helper to toggle a label's alignment override
  function handleLabelDoubleClick(labelId: string) {
    if (!editMode) return;
    const current = labelOverrides[labelId];
    const next: 'radial' | 'curved' = current === 'curved' ? 'radial' : 'curved';
    const updated: { [key: string]: 'radial' | 'curved' } = { ...labelOverrides, [labelId]: next };
    if (onLabelOverridesChange) onLabelOverridesChange(updated);
  }

  // Helper to export/save the current overrides (could be passed as a prop callback)
  function handleSaveOverrides() {
    if (onSaveOverrides) {
      onSaveOverrides(labelOverrides);
    }
  }

  // Restore to default handler
  function handleRestoreDefaults() {
    if (onRestoreDefaults) {
      onRestoreDefaults();
    }
  }

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup dimensions
    const width = 900;
    const height = 900;
    const radius = 800 / 2;
    const svgCenterX = width / 2;
    const svgCenterY = height / 2;

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
      .attr('transform', `translate(${svgCenterX},${svgCenterY})`);

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

    // Helper function to check if radial label would be cropped by SVG boundary
    function wouldRadialLabelBeCropped(
      midAngle: number,
      labelRadius: number,
      text: string,
      fontSize: string
    ): boolean {
      // SVG dimensions
      const svgHalfWidth = width / 2;
      const svgHalfHeight = height / 2;
      const extensionDistance = 10;
      const charWidth = parseFloat(fontSize) * 0.6;
      const lineHeight = parseFloat(fontSize) * 1.2;
      const maxDistanceToEdge = Math.min(svgHalfWidth, svgHalfHeight) - 20; // 20px margin
      const availableSpace = maxDistanceToEdge - labelRadius;
      let maxCharsPerLine = Math.max(15, Math.floor(availableSpace / charWidth * 0.9));

      // Simulate line breaking for the given text and maxCharsPerLine
      const words = text.split(' ');
      let linesArr: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= maxCharsPerLine) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            linesArr.push(currentLine);
            currentLine = word;
          } else {
            linesArr.push(word);
          }
        }
      }
      if (currentLine) {
        linesArr.push(currentLine);
      }

      // Geometry-aware cropping check
      const baseRadius = labelRadius + extensionDistance;
      const angle = midAngle - Math.PI / 2;
      const centerX = Math.cos(angle) * baseRadius;
      const centerY = Math.sin(angle) * baseRadius;
      const totalLines = linesArr.length;
      const startY = -((totalLines - 1) * lineHeight) / 2;

      for (let i = 0; i < linesArr.length; i++) {
        const line = linesArr[i];
        const lineWidth = line.length * charWidth;
        // For each line, calculate its offset perpendicular to the radial direction
        const lineOffset = (i - (linesArr.length - 1) / 2) * lineHeight;
        // Position of the line's center
        const lineCenterX = centerX - Math.sin(angle) * lineOffset;
        const lineCenterY = centerY + Math.cos(angle) * lineOffset;
        // Project leftmost and rightmost character positions
        const leftX = lineCenterX - (lineWidth / 2) * Math.cos(angle);
        const leftY = lineCenterY - (lineWidth / 2) * Math.sin(angle);
        const rightX = lineCenterX + (lineWidth / 2) * Math.cos(angle);
        const rightY = lineCenterY + (lineWidth / 2) * Math.sin(angle);
        // Check if left or right is outside SVG boundary
        if (
          leftX < -svgHalfWidth || leftX > svgHalfWidth ||
          rightX < -svgHalfWidth || rightX > svgHalfWidth ||
          leftY < -svgHalfHeight || leftY > svgHalfHeight ||
          rightY < -svgHalfHeight || rightY > svgHalfHeight
        ) {
          return true;
        }
      }
      return false;
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
      
      // --- Check for per-label override ---
      const override = labelOverrides[node.id || ''];
      if (override) {
        shouldUseCurved = override === 'curved';
      } else {
        if (isMiddleRing) {
          // Middle ring: Allow curved for substantial segments
          const isLarge = arcLength >= 250; // Allow Transport (317.6) and larger
          const isReasonableText = text.length <= 35; // Allow most middle ring text
          const isMedium = arcLength >= 150; // For medium segments
          const isShortText = text.length <= 25; // Shorter text for medium segments
          shouldUseCurved = (isLarge && isReasonableText) || (isMedium && isShortText);
        } else {
          // Outer ring: Check for boundary cropping first, then apply original logic
          const wouldBeCropped = wouldRadialLabelBeCropped(midAngle, radialLabelRadius, text, fontSize);
          if (wouldBeCropped) {
            // Force curved if radial would be cropped
            shouldUseCurved = true;
          } else {
            // Apply original logic for non-cropped labels
            const isLarge = arcLength >= 200; // Allow larger outer segments
            const isShortText = text.length <= 20; // Keep text reasonable
            shouldUseCurved = isLarge && isShortText;
          }
        }
      }
      
      // --- Add double-click event in edit mode ---
      if (shouldUseCurved) {
        const curvedGroup = g.append('g');
        createCurvedRingLabel(curvedGroup, node, curvedLabelRadius, fontSize, text);
        if (editMode) {
          curvedGroup.selectAll('textPath')
            .style('cursor', 'pointer')
            .on('dblclick', () => handleLabelDoubleClick(node.id || ''));
        }
        return;
      }
      
      // Use radial orientation only for very small arcs or very long text
      if (arcLength > MIN_ARC_LENGTH.RING_RADIAL) {
        const radialGroup = g.append('g');
        createRadialRingLabel(radialGroup, node, radialLabelRadius, fontSize, text, midAngle);
        if (editMode) {
          radialGroup.selectAll('text')
            .style('cursor', 'pointer')
            .on('dblclick', () => handleLabelDoubleClick(node.id || ''));
        }
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
      const availableSpace = maxDistanceToEdge - labelRadius;
      const charWidth = parseFloat(fontSize) * 0.6;
      let maxCharsPerLine = Math.max(15, Math.floor(availableSpace / charWidth * 0.9));

      // If cropping is detected, keep reducing maxCharsPerLine and re-check until the label fits or a minimum is reached
      let wouldBeCropped = wouldRadialLabelBeCropped(midAngle, labelRadius, text, fontSize);
      while (wouldBeCropped && maxCharsPerLine > 3) {
        maxCharsPerLine = Math.max(3, Math.floor(maxCharsPerLine * 0.5));
        // Try breaking the text with the new maxCharsPerLine
        // Simulate line breaking
        const wordsTest = text.split(' ');
        let linesTest = [];
        let currentLineTest = '';
        for (const word of wordsTest) {
          const testLine = currentLineTest ? `${currentLineTest} ${word}` : word;
          if (testLine.length <= maxCharsPerLine) {
            currentLineTest = testLine;
          } else {
            if (currentLineTest) {
              linesTest.push(currentLineTest);
              currentLineTest = word;
            } else {
              linesTest.push(word);
            }
          }
        }
        if (currentLineTest) {
          linesTest.push(currentLineTest);
        }
        // Reconstruct the text as it would be rendered
        const testText = linesTest.join('\n');
        // Check if this new breaking would still be cropped
        wouldBeCropped = wouldRadialLabelBeCropped(midAngle, labelRadius, testText, fontSize);
      }

      // Now use the final maxCharsPerLine for actual line breaking
      const words = text.split(' ');
      const lines = [];
      const lastWord = words[words.length - 1];
      const isPercentage = lastWord.includes('(') && lastWord.includes('%') && lastWord.includes(')');
      if (isPercentage && words.length > 2) {
        const mainWords = words.slice(0, -1);
        const percentageWord = lastWord;
        let currentLine = '';
        for (let i = 0; i < mainWords.length; i++) {
          const word = mainWords[i];
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const isLastMainWord = i === mainWords.length - 1;
          const testWithPercentage = isLastMainWord ? `${testLine} ${percentageWord}` : testLine;
          if (isLastMainWord && testWithPercentage.length <= maxCharsPerLine) {
            lines.push(testWithPercentage);
            break;
          } else if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
            if (isLastMainWord) {
              lines.push(currentLine);
              lines.push(percentageWord);
            }
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
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
      const angleDegrees = (midAngle - Math.PI / 2) * 180 / Math.PI;
      const normalizedAngle = ((angleDegrees % 360) + 360) % 360;
      const shouldFlip = normalizedAngle > 90 && normalizedAngle < 270;
      const textRotation = shouldFlip ? angleDegrees + 180 : angleDegrees;
      const textAnchor = shouldFlip ? 'end' : 'start';
      const extensionDistance = 10;

      lines.forEach((line, i) => {
        const baseRadius = labelRadius + extensionDistance;
        const lineIndex = shouldFlip ? (lines.length - 1 - i) : i;
        const lineOffset = (lineIndex - (lines.length - 1) / 2) * lineHeight;
        const baseX = Math.cos(midAngle - Math.PI / 2) * baseRadius;
        const baseY = Math.sin(midAngle - Math.PI / 2) * baseRadius;
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

  }, [data, editMode, labelOverrides]);

  return (
    <div className={`relative ${editMode ? 'border-4 border-blue-400' : ''} flex flex-col items-center bg-white rounded-lg shadow-lg`}>
      {editMode && (
        <div className="absolute top-0 left-0 w-full bg-blue-100 text-blue-800 text-center py-1 z-10">
          Edit Mode: Double-click a label to change alignment. Click Save to create a new version.
        </div>
      )}
      <div className={editMode ? 'pt-8 w-full flex justify-center' : ''}>
        <svg ref={svgRef} />
      </div>
    </div>
  );
});

export default GHGEmissionsSunburst; 
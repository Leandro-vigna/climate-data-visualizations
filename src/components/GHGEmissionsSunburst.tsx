'use client';

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as d3 from 'd3';
import { EmissionNode } from '../lib/data/ghgEmissions';
import { useTheme } from '../lib/contexts/ThemeContext';
import ThemedTooltip from './ThemedTooltip';

interface GHGEmissionsSunburstProps {
  data: EmissionNode[];
  labelOverrides?: { [key: string]: 'radial' | 'curved' };
  editMode?: boolean;
  onLabelOverridesChange?: (overrides: { [key: string]: 'radial' | 'curved' }) => void;
  onSaveOverrides?: (overrides: { [key: string]: 'radial' | 'curved' }) => void;
  onRestoreDefaults?: () => void;
  metadata?: Record<string, string>;
}

const GHGEmissionsSunburst = forwardRef(function GHGEmissionsSunburst({
  data,
  labelOverrides: propLabelOverrides,
  editMode = false,
  onLabelOverridesChange,
  onSaveOverrides,
  onRestoreDefaults,
  metadata = {},
}: GHGEmissionsSunburstProps, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [localLabelOverrides, setLocalLabelOverrides] = useState<{ [key: string]: 'radial' | 'curved' }>({});
  const labelOverrides = editMode ? localLabelOverrides : (propLabelOverrides || {});
  const { currentTheme } = useTheme();
  const categorical = currentTheme.colors.categorical as string[];
  const [hovered, setHovered] = useState<{
    name: string;
    value: string;
    info: string;
    x: number;
    y: number;
  } | null>(null);

  // Helper to lighten a hex color by a given percent (0-1)
  const lighten = useCallback((hex: string, percent: number): string => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    let r = (num >> 16) + Math.round((255 - (num >> 16)) * percent);
    let g = ((num >> 8) & 0x00FF) + Math.round((255 - ((num >> 8) & 0x00FF)) * percent);
    let b = (num & 0x0000FF) + Math.round((255 - (num & 0x0000FF)) * percent);
    r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }, []);

  // Map sector index to categorical color
  const getSectorColor = useCallback((index: number): string => {
    return categorical[index % categorical.length];
  }, [categorical]);

  // Assign color to node based on depth and parent color
  const getNodeColor = useCallback((node: any, parentColor?: string, sectorIndex?: number): string => {
    if (node.depth === 1) {
      return getSectorColor(sectorIndex ?? 0);
    } else if (node.depth === 2) {
      return lighten(parentColor || '#cccccc', 0.35);
    } else if (node.depth === 3) {
      return lighten(parentColor || '#cccccc', 0.65);
    }
    return '#CBD5E1';
  }, [getSectorColor, lighten]);

  // Helper to get full node name (e.g., Energy | Transport | Aviation)
  const getFullNodeName = useCallback((node: any): string => {
    let names = [];
    let n = node;
    while (n) {
      if (n.name) names.unshift(n.name);
      n = n.parent || n.__parent;
    }
    return names.join(' | ');
  }, []);

  // Move chart rendering logic into a separate function
  const renderChart = useCallback(() => {
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

    // Responsive SVG centering
    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${svgCenterX},${svgCenterY})`);

    // Create arc generators for each ring
    const centerArc = d3.arc<d3.DefaultArcObject>()
      .innerRadius(0)
      .outerRadius(radius * CENTER_RADIUS)
      .padAngle(0)
      .padRadius(radius);

    const middleArc = d3.arc<d3.DefaultArcObject>()
      .innerRadius(radius * MIDDLE_RING_START)
      .outerRadius(radius * MIDDLE_RING_END)
      .padAngle(0)
      .padRadius(radius);

    const outerArc = d3.arc<d3.DefaultArcObject>()
      .innerRadius(radius * OUTER_RING_START)
      .outerRadius(radius * OUTER_RING_END)
      .padAngle(0)
      .padRadius(radius);

    // Process data into hierarchical structure
    interface HierarchyDatum extends d3.DefaultArcObject {
      children?: HierarchyDatum[];
      id?: string;
      name?: string;
      share?: number;
      depth?: number;
      color?: string;
      sectorIdx?: number;
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

      function setParent(child: any, parent: any) {
        child.parent = parent;
        if (child.children) {
          child.children.forEach((c: any) => setParent(c, child));
        }
      }

      let currentAngle = 0;
      const angleScale = (2 * Math.PI) / 100; // Convert percentages to radians

      data.forEach((sector, sectorIdx) => {
        const sectorColor = getSectorColor(sectorIdx);
        const sectorNode: HierarchyDatum = {
          id: sector.id,
          name: sector.name,
          share: sector.share,
          startAngle: currentAngle,
          endAngle: currentAngle + (sector.share || 0) * angleScale,
          innerRadius: 0,
          outerRadius: radius * CENTER_RADIUS,
          children: [],
          depth: 1,
          color: sectorColor,
          sectorIdx
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
              depth: 2,
              color: lighten(sectorColor, 0.35),
              sectorIdx
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
                  depth: 3,
                  color: lighten(sectorColor, 0.65),
                  sectorIdx
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

      // Set parent references recursively
      root.children?.forEach((c: any) => setParent(c, root));

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

    // Helper function to check if text would be upside down
    function wouldBeUpsideDown(midAngle: number): boolean {
      return midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
    }

    // Helper function to check if radial label would be cropped
    function wouldRadialLabelBeCropped(
      midAngle: number,
      labelRadius: number,
      text: string,
      fontSize: string
    ): boolean {
      const svgHalfWidth = width / 2;
      const svgHalfHeight = height / 2;
      const extensionDistance = 10;
      const charWidth = parseFloat(fontSize) * 0.6;
      const lineHeight = parseFloat(fontSize) * 1.2;
      const maxDistanceToEdge = Math.min(svgHalfWidth, svgHalfHeight) - 20;
      const availableSpace = maxDistanceToEdge - labelRadius;
      let maxCharsPerLine = Math.max(15, Math.floor(availableSpace / charWidth * 0.9));

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

      const baseRadius = labelRadius + extensionDistance;
      const angle = midAngle - Math.PI / 2;
      const centerX = Math.cos(angle) * baseRadius;
      const centerY = Math.sin(angle) * baseRadius;

      for (let i = 0; i < linesArr.length; i++) {
        const line = linesArr[i];
        const lineWidth = line.length * charWidth;
        const lineOffset = (i - (linesArr.length - 1) / 2) * lineHeight;
        const lineCenterX = centerX - Math.sin(angle) * lineOffset;
        const lineCenterY = centerY + Math.cos(angle) * lineOffset;
        const leftX = lineCenterX - (lineWidth / 2) * Math.cos(angle);
        const leftY = lineCenterY - (lineWidth / 2) * Math.sin(angle);
        const rightX = lineCenterX + (lineWidth / 2) * Math.cos(angle);
        const rightY = lineCenterY + (lineWidth / 2) * Math.sin(angle);
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

    // HORIZONTAL CENTER LABEL CREATION - For large sectors
    function createHorizontalCenterLabel(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      node: HierarchyDatum,
      text: string,
      percentage: string,
      angle: number,
      fontSize: string
    ) {
      const sectorMidAngle = (node.startAngle + node.endAngle) / 2;
      const sectorCenterRadius = radius * CENTER_RADIUS / 2;
      const centerX = Math.cos(sectorMidAngle - Math.PI / 2) * sectorCenterRadius;
      const centerY = Math.sin(sectorMidAngle - Math.PI / 2) * sectorCenterRadius;
      const sectorAngle = Math.abs(node.endAngle - node.startAngle);
      const availableWidth = sectorAngle * sectorCenterRadius * 0.8;
      const charWidth = parseFloat(fontSize) * 0.6;
      const maxCharsPerLine = Math.floor(availableWidth / charWidth);
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
              lines.push(word);
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
      } else {
        lines.push(text);
      }
      lines.push(percentage);
      const lineHeight = parseFloat(fontSize) * 1.1;
      const totalLines = lines.length;
      lines.forEach((line, i) => {
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
          .text(line)
          .on('mouseover', function(event) {
            setHovered({
              name: getFullNodeName(node),
              value: (typeof node.share === 'number' ? node.share.toFixed(2) + '%' : ''),
              info: metadata[getFullNodeName(node)] || '',
              x: event.clientX,
              y: event.clientY
            });
          })
          .on('mousemove', function(event) {
            setHovered(h => h ? { ...h, x: event.clientX, y: event.clientY } : h);
          })
          .on('mouseout', function() {
            setHovered(null);
          });
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
      const normalizedAngle = ((angle % 360) + 360) % 360;
      const isBottomHalf = normalizedAngle > 90 && normalizedAngle < 270;
      const textAngle = isBottomHalf ? angle + 180 : angle;
      const adjustedRadius = isBottomHalf ? -labelRadius : labelRadius;
      lines.forEach((line, i) => {
        g.append('text')
          .attr('dy', '0.35em')
          .attr('fill', '#FFFFFF')
          .attr('font-size', fontSize)
          .attr('font-weight', 'bold')
          .attr('transform', `rotate(${textAngle}) translate(${adjustedRadius},${startY + i * lineHeight})`)
          .attr('text-anchor', 'middle')
          .text(line)
          .on('mouseover', function(event) {
            setHovered({
              name: line, // For radial, show the line text (usually name + %)
              value: '',
              info: '',
              x: event.clientX,
              y: event.clientY
            });
          })
          .on('mousemove', function(event) {
            setHovered(h => h ? { ...h, x: event.clientX, y: event.clientY } : h);
          })
          .on('mouseout', function() {
            setHovered(null);
          });
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

      const isBottomHalf = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
      const pathStartAngle = node.startAngle;
      const pathEndAngle = node.endAngle;
      const textRadius = labelRadius + 10;

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

      const words = text.split(' ');
      const startOffset = isBottomHalf ? '100%' : '0%';
      const textAnchor = isBottomHalf ? 'end' : 'start';
      
      g.append('text')
        .attr('font-size', fontSize)
        .attr('fill', '#374151')
        .append('textPath')
        .attr('xlink:href', `#${id}`)
        .attr('startOffset', startOffset)
        .attr('text-anchor', textAnchor)
        .attr('dy', isBottomHalf ? '-0.3em' : '1.0em')
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
      const svgCenterX = width / 2;
      const svgCenterY = height / 2;
      const maxDistanceToEdge = Math.min(svgCenterX, svgCenterY) - 20;
      const availableSpace = maxDistanceToEdge - labelRadius;
      const charWidth = parseFloat(fontSize) * 0.6;
      let maxCharsPerLine = Math.max(15, Math.floor(availableSpace / charWidth * 0.9));

      let wouldBeCropped = wouldRadialLabelBeCropped(midAngle, labelRadius, text, fontSize);
      while (wouldBeCropped && maxCharsPerLine > 3) {
        maxCharsPerLine = Math.max(3, Math.floor(maxCharsPerLine * 0.5));
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
        const testText = linesTest.join('\n');
        wouldBeCropped = wouldRadialLabelBeCropped(midAngle, labelRadius, testText, fontSize);
      }

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

    // Render the chart
    const renderArcs = (parent: d3.Selection<SVGGElement, unknown, null, undefined>, node: HierarchyDatum, parentColor?: string, sectorIdx?: number) => {
      const g = parent.append('g');

      // Draw the arc
      const arc = getArc(node.depth || 1);
      let baseFill = node.color || getNodeColor(node, parentColor, sectorIdx);
      const path = g.append('path')
        .datum(node)
        .attr('d', arc)
        .attr('fill', baseFill)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function (event) {
          d3.select(this).attr('fill', lighten(baseFill, 0.25));
          setHovered({
            name: getFullNodeName(node),
            value: (typeof node.share === 'number' ? node.share.toFixed(2) + '%' : ''),
            info: metadata[getFullNodeName(node)] || '',
            x: event.clientX,
            y: event.clientY
          });
        })
        .on('mousemove', function (event) {
          setHovered(h => h ? { ...h, x: event.clientX, y: event.clientY } : h);
        })
        .on('mouseout', function () {
          d3.select(this).attr('fill', baseFill);
          setHovered(null);
        });

      // Add labels
      if (node.depth === 1) {
        const midAngle = (node.startAngle + node.endAngle) / 2;
        const arcLength = (node.endAngle - node.startAngle) * radius;
        // Restore: Only use horizontal for very large arcs, otherwise use radial
        if (arcLength > 180) {
          createHorizontalCenterLabel(g, node, node.name || '', `(${node.share}%)`, midAngle * 180 / Math.PI - 90, FONT_SIZES.CENTER_LARGE);
        } else {
          const labelRadius = radius * CENTER_RADIUS * 0.8;
          createRadialCenterLabel(g, `${node.name}\n(${node.share}%)`, midAngle * 180 / Math.PI - 90, labelRadius, FONT_SIZES.CENTER_SMALL);
        }
      } else if (node.depth === 2 || node.depth === 3) {
        const midAngle = (node.startAngle + node.endAngle) / 2;
        const arcLength = (node.endAngle - node.startAngle) * radius;
        renderRingLabel(g, node, midAngle, arcLength);
      }

      // Recursively render children
      if (node.children) {
        node.children.forEach(child => renderArcs(g, child, node.color, node.sectorIdx));
      }
    };

    // Start rendering from the root
    renderArcs(svg, hierarchicalData);
  }, [data, labelOverrides, editMode, metadata, getNodeColor, getSectorColor, lighten, getFullNodeName]);

  // Add effect to re-render chart when labelOverrides change
  useEffect(() => {
    renderChart();
  }, [renderChart]);

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
  }, [editMode, propLabelOverrides]);

  // Helper to toggle a label's alignment override
  function handleLabelDoubleClick(labelId: string) {
    if (!editMode) return;
    const current = labelOverrides[labelId];
    const next: 'radial' | 'curved' = current === 'curved' ? 'radial' : 'curved';
    if (onLabelOverridesChange) {
      const updated = { ...labelOverrides, [labelId]: next };
      onLabelOverridesChange(updated);
    }
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

  return (
    <div className="relative">
      <svg ref={svgRef} className="w-full h-full" />
      {hovered && (
        <ThemedTooltip
          x={hovered.x}
          y={hovered.y}
          name={hovered.name}
          value={hovered.value}
          info={hovered.info}
        />
      )}
    </div>
  );
});

export default GHGEmissionsSunburst;
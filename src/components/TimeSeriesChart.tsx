// TimeSeriesChart.tsx
// React component for rendering a time series line chart using Recharts.
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AggregatedPoint } from '../lib/DataParser';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface TimeSeriesChartProps {
  data: AggregatedPoint[];
  platforms: string[];
}

function formatLabel(month: number, year: number) {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

const COLORS = [
  '#2563eb', '#16a34a', '#f59e42', '#e11d48', '#a21caf', '#0e7490', '#facc15', '#7c3aed', '#f472b6', '#14b8a6'
];

function TimeSeriesChart({ data, platforms }: TimeSeriesChartProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5" />
          <span>Time Series Chart</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data.map(d => ({ ...d, label: formatLabel(d.month, d.year) }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {platforms.map((platform, idx) => (
              <Line
                key={platform}
                type="monotone"
                dataKey={platform}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default TimeSeriesChart; 
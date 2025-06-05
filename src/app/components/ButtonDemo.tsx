'use client';

import React from 'react';
import { ThemedButton } from './ThemedButton';

export function ButtonDemo() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto my-8">
      <h2 className="text-xl font-bold mb-2">Button Demo (Climate Watch Style)</h2>
      <div>
        <h3 className="font-semibold mb-2">Primary Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <ThemedButton variant="primary">Primary button</ThemedButton>
          <ThemedButton variant="primary" icon="share">Share</ThemedButton>
          <ThemedButton variant="primary" disabled>Disabled</ThemedButton>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Secondary Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <ThemedButton variant="secondary">Secondary button</ThemedButton>
          <ThemedButton variant="secondary" icon="download">Download</ThemedButton>
          <ThemedButton variant="secondary" disabled>Disabled</ThemedButton>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Icon Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <ThemedButton variant="icon" icon="share" aria-label="Share" />
          <ThemedButton variant="icon" icon="download" aria-label="Download" />
          <ThemedButton variant="icon" icon="info" aria-label="Info" />
          <ThemedButton variant="icon" icon="share" disabled aria-label="Share disabled" />
        </div>
      </div>
    </div>
  );
} 
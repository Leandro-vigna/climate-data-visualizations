'use client';

import SideNav from '../../components/SideNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SideNav />
      {children}
    </div>
  );
} 
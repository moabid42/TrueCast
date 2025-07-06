"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RouteProtectionProps {
  children: React.ReactNode;
  requireVerification?: boolean;
  excludePaths?: string[];
}

export default function RouteProtection({ 
  children, 
  requireVerification = true,
  excludePaths = ['/verify', '/', '/api', '/verified']
}: RouteProtectionProps) {
  const { account, isVerified, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Don't run on server side
    if (!isClient) return;
    
    // Don't redirect if still loading
    if (isLoading) return;

    // Don't redirect if verification is not required
    if (!requireVerification) return;

    // Don't redirect if user is verified
    if (isVerified) return;

    // Check if current path is in exclude paths
    const isExcluded = excludePaths.some(path => {
      // Exact match
      if (pathname === path) return true;
      // Handle subpaths (e.g., /api/verify should be excluded if /api is excluded)
      if (path !== '/' && pathname.startsWith(path)) return true;
      return false;
    });
    
    // If user is not connected, only allow access to excluded paths
    if (!account) {
      if (!isExcluded) {
        console.log('Redirecting unconnected user to /');
        setTimeout(() => router.push('/'), 100);
      }
      return;
    }

    // If user is connected but not verified, redirect to verify page
    if (!isExcluded) {
      console.log('Redirecting unverified user to /verify');
      setTimeout(() => router.push('/verify'), 100);
    }
  }, [account, isVerified, isLoading, requireVerification, excludePaths, router, pathname, isClient]);

  // Show loading state while checking verification
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Checking verification status...</p>
        </div>
      </div>
    );
  }

  // Don't render protection logic on server side
  if (!isClient) {
    return <>{children}</>;
  }

  // If user is not connected and not on an excluded path, don't render children
  if (!account) {
    const isExcluded = excludePaths.some(path => {
      if (pathname === path) return true;
      if (path !== '/' && pathname.startsWith(path)) return true;
      return false;
    });
    
    if (!isExcluded) {
      return null; // Don't render anything while redirecting
    }
  }

  // If user is connected but not verified and not on an excluded path, don't render children
  if (requireVerification && account && !isVerified) {
    const isExcluded = excludePaths.some(path => {
      if (pathname === path) return true;
      if (path !== '/' && pathname.startsWith(path)) return true;
      return false;
    });
    
    if (!isExcluded) {
      return null; // Don't render anything while redirecting
    }
  }

  return <>{children}</>;
} 
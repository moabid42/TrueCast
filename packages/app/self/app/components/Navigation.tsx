"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Navigation() {
  const { account, isVerified, connectWallet, disconnect } = useAuth();

  return (
    <nav className="bg-white shadow-lg border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">TC</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TrueCase
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
            >
              Home
            </Link>
            <Link 
              href="/feed" 
              className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
            >
              Feed
            </Link>
            <Link 
              href="/verify" 
              className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
            >
              Verify Identity
            </Link>
            {isVerified && (
              <Link 
                href="/articles" 
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
              >
                Articles
              </Link>
            )}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {account ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </div>
                {isVerified && (
                  <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verified</span>
                  </div>
                )}
                <button
                  onClick={disconnect}
                  className="text-gray-500 hover:text-red-600 transition-colors duration-200"
                  title="Disconnect Wallet"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 
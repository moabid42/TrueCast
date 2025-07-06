"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ethers } from 'ethers';

export default function Navigation() {
  const { account, isVerified, connectWallet, disconnect } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isJournalist, setIsJournalist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);



  // Check admin and journalist status
  useEffect(() => {
    const checkStatus = async () => {
      if (!account) {
        setIsLoading(false);
        return;
      }

      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(
            process.env.NEXT_PUBLIC_JOURNALIST_APPLICATION_CONTRACT!,
            [
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                  }
                ],
                "name": "isAdmin",
                "outputs": [
                  {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                  }
                ],
                "name": "isJournalist",
                "outputs": [
                  {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            provider
          );

          const [adminStatus, journalistStatus] = await Promise.all([
            contract.isAdmin(account),
            contract.isJournalist(account)
          ]);

          setIsAdmin(adminStatus);
          setIsJournalist(journalistStatus);
        }
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [account]);



  return (
    <nav className="bg-white shadow-lg border-b border-gray-100" style={{ background: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo1-removebg-preview.png" alt="TrueCast Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] bg-clip-text text-transparent">
              TrueCast
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
            {!isVerified && (
              <Link 
                href="/verify" 
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
              >
                Verify Identity
              </Link>
            )}
            {isJournalist && !isLoading && (
              <Link 
                href="/articles" 
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
              >
                Articles
              </Link>
            )}
            {!isJournalist && !isAdmin && !isLoading && (
              <Link 
                href="/journalist-application" 
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
              >
                Become Journalist
              </Link>
            )}
            {isAdmin && !isLoading && (
              <Link 
                href="/admin" 
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
              >
                Admin
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
                className="bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] hover:from-[var(--primary)] hover:to-[var(--primary-dark)] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
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
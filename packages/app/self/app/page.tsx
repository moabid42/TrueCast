"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { account, isVerified } = useAuth();
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="mb-8">
          <img src="/logo1-removebg-preview.png" alt="TrueCast Logo" className="mx-auto mb-6" style={{ maxWidth: '120px', height: 'auto' }} />
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] bg-clip-text text-transparent">
          TrueCast
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          A decentralized news platform that combines identity verification with blockchain technology 
          to ensure trustworthy, fact-checked journalism and combat misinformation. Welcome to TrueCast.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/feed"
            className="bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] hover:from-[var(--primary)] hover:to-[var(--primary-dark)] text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 inline-flex items-center justify-center shadow-md"
          >
            Browse Feed
            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          {!isVerified ? (
            <Link
              href="/verify"
              className="border-2 border-gray-300 hover:border-blue-600 text-gray-700 hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 inline-flex items-center justify-center"
            >
              Get Started
            </Link>
          ) : (
            <Link
              href="/feed"
              className="border-2 border-green-300 hover:border-green-600 text-green-700 hover:text-green-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 inline-flex items-center justify-center"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Verified - Browse Feed
            </Link>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">Identity Verification</h3>
          <p className="text-gray-600">
            Secure identity verification through Self Protocol ensures only real users can contribute 
            to the platform, preventing bot manipulation.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">Decentralized Storage</h3>
          <p className="text-gray-600">
            Articles are stored on Walrus Protocol, ensuring content integrity and permanent 
            availability without centralized control.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">Fact Checking</h3>
          <p className="text-gray-600">
            Community-driven fact-checking with reputation systems ensures high-quality, 
            verified content reaches readers.
          </p>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Connect Wallet</h3>
            <p className="text-gray-600 text-sm">
              Connect your Web3 wallet to get started with the platform
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-600">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Verify Identity</h3>
            <p className="text-gray-600 text-sm">
              Complete identity verification through Self Protocol
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-600">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Access Content</h3>
            <p className="text-gray-600 text-sm">
              Browse and interact with verified articles and news
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-orange-600">4</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Contribute</h3>
            <p className="text-gray-600 text-sm">
              Submit articles and participate in fact-checking
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-16">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Why Choose TrueCast?</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <svg className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-800">Privacy First</h3>
                <p className="text-gray-600 text-sm">
                  Your identity is verified without compromising your personal data
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <svg className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-800">Decentralized</h3>
                <p className="text-gray-600 text-sm">
                  No single entity controls the platform or your content
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <svg className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-800">Community Driven</h3>
                <p className="text-gray-600 text-sm">
                  Fact-checking and content moderation by verified users
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <svg className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-800">Transparent</h3>
                <p className="text-gray-600 text-sm">
                  All actions and content are publicly verifiable on the blockchain
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-4">
          {!isVerified ? 'Ready to Join the Future of News?' : 'Welcome to TrueCast!'}
        </h2>
        <p className="text-xl mb-6 opacity-90">
          {!isVerified 
            ? 'Connect your wallet and start your journey towards trustworthy, decentralized journalism'
            : 'You\'re verified and ready to explore trustworthy, decentralized journalism'
          }
        </p>
        {!isVerified ? (
          <Link
            href="/verify"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 inline-flex items-center"
          >
            Get Started Now
            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        ) : (
          <Link
            href="/feed"
            className="bg-white text-green-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 inline-flex items-center"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Browse Verified Content
          </Link>
        )}
      </div>
    </div>
  );
}

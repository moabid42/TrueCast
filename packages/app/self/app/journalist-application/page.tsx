'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import JournalistApplicationForm from '../components/JournalistApplicationForm';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';

export default function JournalistApplicationPage() {
  const { account, isVerified } = useAuth();
  const router = useRouter();
  const [isJournalist, setIsJournalist] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already a journalist
  useEffect(() => {
    const checkJournalistStatus = async () => {
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

          const status = await contract.isJournalist(account);
          setIsJournalist(status);
          
          // If user is already a journalist, redirect to main page
          if (status) {
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Error checking journalist status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkJournalistStatus();
  }, [account, router]);

  const handleApplicationSuccess = () => {
    router.push('/');
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-yellow-800 mb-4">Connect Your Wallet</h1>
            <p className="text-yellow-700">
              Please connect your wallet to apply for a journalist role.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking journalist status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isJournalist) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-green-800 mb-4">Already a Journalist</h1>
            <p className="text-green-700 mb-4">
              You are already approved as a journalist. Redirecting to the main page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Become a Journalist</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Apply to become a verified journalist on TrueCase. Submit your credentials and proof of journalism experience for admin review.
          </p>
        </div>

        <JournalistApplicationForm
          contractAddress={process.env.NEXT_PUBLIC_JOURNALIST_APPLICATION_CONTRACT!}
          onSuccess={handleApplicationSuccess}
        />

        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">What happens next?</h3>
            <ul className="text-blue-700 space-y-2 text-sm">
              <li>• Your application will be reviewed by our admin team</li>
              <li>• We'll verify your journalism credentials and experience</li>
              <li>• You'll receive a notification once your application is reviewed</li>
              <li>• Once approved, you'll be able to publish articles on TrueCase</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 
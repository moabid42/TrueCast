'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ethers } from 'ethers';

interface Application {
  id: number;
  applicant: string;
  title: string;
  description: string;
  proofHash: string;
  proofContentType: string;
  timestamp: number;
  status: number; // 0: PENDING, 1: APPROVED, 2: REJECTED
  reviewer: string;
  reviewNotes: string;
  reviewTimestamp: number;
}

interface AdminPanelProps {
  contractAddress: string;
}

export default function AdminPanel({ contractAddress }: AdminPanelProps) {
  const { account, isVerified } = useAuth();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingApplications, setPendingApplications] = useState<number[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isReviewSuccess, setIsReviewSuccess] = useState(false);

  // Check if user is admin and load pending applications
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!account) return;

      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(contractAddress, [
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
              "inputs": [],
              "name": "getPendingApplications",
              "outputs": [
                {
                  "internalType": "uint256[]",
                  "name": "",
                  "type": "uint256[]"
                }
              ],
              "stateMutability": "view",
              "type": "function"
            }
          ], provider);

          const adminStatus = await contract.isAdmin(account);
          setIsAdmin(adminStatus);

          if (adminStatus) {
            const pending = await contract.getPendingApplications();
            setPendingApplications(pending);
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [account, contractAddress]);

  // Load application details when selected
  useEffect(() => {
    const loadApplicationDetails = async () => {
      if (!selectedApplication?.id) return;

      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(contractAddress, [
            {
              "inputs": [
                {
                  "internalType": "uint256",
                  "name": "applicationId",
                  "type": "uint256"
                }
              ],
              "name": "getApplication",
              "outputs": [
                {
                  "components": [
                    {
                      "internalType": "uint256",
                      "name": "id",
                      "type": "uint256"
                    },
                    {
                      "internalType": "address",
                      "name": "applicant",
                      "type": "address"
                    },
                    {
                      "internalType": "string",
                      "name": "title",
                      "type": "string"
                    },
                    {
                      "internalType": "string",
                      "name": "description",
                      "type": "string"
                    },
                    {
                      "internalType": "string",
                      "name": "proofHash",
                      "type": "string"
                    },
                    {
                      "internalType": "string",
                      "name": "proofContentType",
                      "type": "string"
                    },
                    {
                      "internalType": "uint256",
                      "name": "timestamp",
                      "type": "uint256"
                    },
                    {
                      "internalType": "enum JournalistApplication.ApplicationStatus",
                      "name": "status",
                      "type": "uint8"
                    },
                    {
                      "internalType": "address",
                      "name": "reviewer",
                      "type": "address"
                    },
                    {
                      "internalType": "string",
                      "name": "reviewNotes",
                      "type": "string"
                    },
                    {
                      "internalType": "uint256",
                      "name": "reviewTimestamp",
                      "type": "uint256"
                    }
                  ],
                  "internalType": "struct JournalistApplication.Application",
                  "name": "",
                  "type": "tuple"
                }
              ],
              "stateMutability": "view",
              "type": "function"
            }
          ], provider);

          const details = await contract.getApplication(selectedApplication.id);
          setSelectedApplication({
            id: Number(details[0]),
            applicant: details[1],
            title: details[2],
            description: details[3],
            proofHash: details[4],
            proofContentType: details[5],
            timestamp: Number(details[6]),
            status: Number(details[7]),
            reviewer: details[8],
            reviewNotes: details[9],
            reviewTimestamp: Number(details[10]),
          });
        }
      } catch (error) {
        console.error('Error loading application details:', error);
      }
    };

    loadApplicationDetails();
  }, [selectedApplication?.id, contractAddress]);

  // Reset review success state
  useEffect(() => {
    if (isReviewSuccess) {
      // Reload pending applications
      const reloadPending = async () => {
        if (typeof window !== 'undefined' && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(contractAddress, [
            {
              "inputs": [],
              "name": "getPendingApplications",
              "outputs": [
                {
                  "internalType": "uint256[]",
                  "name": "",
                  "type": "uint256[]"
                }
              ],
              "stateMutability": "view",
              "type": "function"
            }
          ], provider);

          const pending = await contract.getPendingApplications();
          setPendingApplications(pending);
        }
      };

      reloadPending();
      setSelectedApplication(null);
      setReviewNotes('');
      setIsReviewSuccess(false);
    }
  }, [isReviewSuccess, contractAddress]);

  const handleReview = async (approved: boolean) => {
    if (!selectedApplication) return;

    setIsReviewing(true);
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, [
          {
            "inputs": [
              {
                "internalType": "uint256",
                "name": "applicationId",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "approved",
                "type": "bool"
              },
              {
                "internalType": "string",
                "name": "notes",
                "type": "string"
              }
            ],
            "name": "reviewApplication",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ], signer);

        const tx = await contract.reviewApplication(selectedApplication.id, approved, reviewNotes);
        await tx.wait();
        setIsReviewSuccess(true);
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      alert('Failed to review application. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const getProofFileUrl = (hash: string) => {
    return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${hash}`;
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Approved';
      case 2: return 'Rejected';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-yellow-100 text-yellow-800';
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDistanceToNow = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please connect your wallet to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Only the contract owner can access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Panel - Journalist Applications</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Applications</h2>
          <div className="space-y-3">
            {pendingApplications && pendingApplications.length > 0 ? (
              pendingApplications.map((appId: number) => (
                <div
                  key={appId}
                  onClick={() => {
                    setSelectedApplication({ id: appId } as Application);
                  }}
                  className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Application #{appId}</p>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(Date.now() / 1000)}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Pending
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No pending applications</p>
            )}
          </div>
        </div>

        {/* Application Details */}
        <div className="lg:col-span-2">
          {selectedApplication ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Application #{selectedApplication.id}
                </h3>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedApplication.status)}`}>
                  {getStatusText(selectedApplication.status)}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applicant</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedApplication.applicant}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-sm text-gray-900">{selectedApplication.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApplication.description}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proof Document</label>
                  <div className="flex items-center space-x-2">
                    <a
                      href={getProofFileUrl(selectedApplication.proofHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Document
                    </a>
                    <span className="text-xs text-gray-500">({selectedApplication.proofContentType})</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submitted</label>
                  <p className="text-sm text-gray-900">
                    {formatDistanceToNow(selectedApplication.timestamp)}
                  </p>
                </div>

                {selectedApplication.status === 0 && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Notes</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add review notes (optional)..."
                    />
                    
                    <div className="flex space-x-3 mt-4">
                      <button
                        onClick={() => handleReview(true)}
                        disabled={isReviewing}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isReviewing ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReview(false)}
                        disabled={isReviewing}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isReviewing ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {selectedApplication.status !== 0 && (
                  <div className="border-t pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer</label>
                      <p className="text-sm text-gray-900 font-mono">{selectedApplication.reviewer}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes</label>
                      <p className="text-sm text-gray-900">{selectedApplication.reviewNotes || 'No notes provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reviewed</label>
                      <p className="text-sm text-gray-900">
                        {formatDistanceToNow(selectedApplication.reviewTimestamp)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">Select an application to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
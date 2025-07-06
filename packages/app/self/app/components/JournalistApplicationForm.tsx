'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ethers } from 'ethers';

interface JournalistApplicationFormProps {
  contractAddress: string;
  onSuccess?: () => void;
}

export default function JournalistApplicationForm({ contractAddress, onSuccess }: JournalistApplicationFormProps) {
  const { account, isVerified } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
    }
  };

  const uploadToWalrus = async (file: File): Promise<string> => {
    const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
    
    const url = `${PUBLISHER}/v1/blobs?epochs=5`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream"
      },
      body: file
    });
    
    if (!response.ok) throw new Error("Upload failed");
    const data = await response.json();
    
    let blobId = '';
    if (data.alreadyCertified) {
      blobId = data.alreadyCertified.blobId;
    } else if (data.newlyCreated) {
      blobId = data.newlyCreated.blobObject.blobId;
    } else {
      throw new Error("No blobId in response");
    }
    
    return blobId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account || !proofFile) {
      return;
    }

    setIsUploading(true);
    setIsSubmitting(true);
    try {
      // Upload proof file to Walrus
      const hash = await uploadToWalrus(proofFile);

      // Submit application to contract using ethers
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, [
          {
            "inputs": [
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
              }
            ],
            "name": "submitApplication",
            "outputs": [
              {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
              }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ], signer);

        const tx = await contract.submitApplication(title, description, hash, proofFile.type);
        await tx.wait();
        setIsSubmitSuccess(true);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

  if (isSubmitSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Application Submitted Successfully!</h3>
        <p className="text-green-700 mb-4">
          Your journalist application has been submitted and is pending review by an admin.
        </p>
        <button
          onClick={onSuccess}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Apply for Journalist Role</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Application Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Professional Journalist Application"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your journalism experience, credentials, and why you want to join TrueCase..."
          />
        </div>

        <div>
          <label htmlFor="proof" className="block text-sm font-medium text-gray-700 mb-2">
            Proof Document *
          </label>
          <input
            type="file"
            id="proof"
            onChange={handleFileChange}
            required
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">
            Upload a document proving your journalism credentials (press card, certificate, portfolio, etc.)
          </p>
        </div>

        <button
          type="submit"
          disabled={!account || isUploading || isSubmitting || !title || !description || !proofFile}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isUploading ? 'Uploading...' : isSubmitting ? 'Submitting Application...' : 'Submit Application'}
        </button>
      </form>

      {!account && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm">
            Please connect your wallet to submit an application.
          </p>
        </div>
      )}
    </div>
  );
} 
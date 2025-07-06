"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { countries, getUniversalLink } from "@selfxyz/core";
import {
  SelfQRcodeWrapper,
  SelfAppBuilder,
  type SelfApp,
} from "@selfxyz/qrcode";
import { v4 } from "uuid";
import { ethers } from "ethers";
import { useAuth } from "@/contexts/AuthContext";

// TypeScript declarations for Ethereum window object
declare global {
  interface Window {
    ethereum?: any;
  }
}

// UserRegistry ABI - only the functions we need
const USER_REGISTRY_ABI = [
  "function completeUserData(address userAddress, string _name, string _nationality, string _dateOfBirth) external",
  "function isRegistered(address user) external view returns (bool)",
  "function getUserInfo(address user) external view returns (bool, bool, uint256, uint256, string, string, string)"
];

// ProofOfHuman ABI - for listening to UserInfo events
const PROOF_OF_HUMAN_ABI = [
  "event UserInfo(string nationality, string name, string dateOfBirth)",
  "event VerificationCompleted(tuple(bytes32 attestationId, uint256 userIdentifier, uint256 nullifier, uint256[4] forbiddenCountriesListPacked, string issuingState, string[] name, string idNumber, string nationality, string dateOfBirth, string gender, string expiryDate, uint256 olderThan, bool[3] ofac) output, bytes userData)",
  "function verificationSuccessful() external view returns (bool)",
  "function lastOutput() external view returns (tuple(bytes32 attestationId, uint256 userIdentifier, uint256 nullifier, uint256[4] forbiddenCountriesListPacked, string issuingState, string[] name, string idNumber, string nationality, string dateOfBirth, string gender, string expiryDate, uint256 olderThan, bool[3] ofac))",
  "function lastUserAddress() external view returns (address)"
];

const USER_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS || "";
const PROOF_OF_HUMAN_ADDRESS = process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS || "";

interface UserData {
  name: string;
  nationality: string;
  dateOfBirth: string;
}

export default function VerifyPage() {
  const router = useRouter();
  const { account, isVerified: authVerified, connectWallet, checkVerificationStatus } = useAuth();
  const [linkCopied, setLinkCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    name: "",
    nationality: "",
    dateOfBirth: ""
  });
  const [isRegistered, setIsRegistered] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);


  // Use useMemo to cache the array to avoid creating a new array on each render
  const excludedCountries = useMemo(() => [countries.NORTH_KOREA], []);





  // Check if user is already registered
  const checkUserRegistration = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider);
        
        const registered = await contract.isRegistered(account);
        setIsRegistered(registered);
        
        if (registered) {
          const info = await contract.getUserInfo(account);
          setUserInfo({
            isRegistered: info[0],
            isJournalist: info[1],
            reputation: info[2].toString(),
            registeredAt: new Date(Number(info[3]) * 1000).toLocaleDateString(),
            name: info[4],
            nationality: info[5],
            dateOfBirth: info[6]
          });
        }
      }
    } catch (error) {
      console.error("Error checking user registration:", error);
    }
  };

  // Check if user is already verified and redirect to articles
  useEffect(() => {
    if (account && authVerified) {
      router.push('/articles');
    }
  }, [account, authVerified, router]);

  // Use useEffect to ensure code only executes on the client side
  useEffect(() => {
    if (account && account.length > 0 && account.startsWith('0x')) {
      console.log("Initializing SelfApp with account:", account);
      console.log("Environment variables:", {
        appName: process.env.NEXT_PUBLIC_SELF_APP_NAME,
        scope: process.env.NEXT_PUBLIC_SELF_SCOPE,
        endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT
      });
      
      try {
        const app = new SelfAppBuilder({
          version: 2,
          appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || "TrueCase Identity Verification",
          scope: process.env.NEXT_PUBLIC_SELF_SCOPE || "truecase-verification",
          endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT || "https://api.self.xyz",
          logoBase64:
            "https://i.postimg.cc/mrmVf9hm/self.png",
          userId: account,
          endpointType: "staging_celo",
          userIdType: "hex",
          userDefinedData: "Welcome to TrueCase - Your Trusted News Platform 👋",
          disclosures: {
            minimumAge: 18,
            name: true,
            nationality: true,
            date_of_birth: true,
            gender: true,
          }
        }).build();

        console.log("SelfApp built successfully:", app);
        setSelfApp(app);
        setUniversalLink(getUniversalLink(app));
        
        // Check user registration status
        checkUserRegistration();
      } catch (error) {
        console.error("Failed to initialize Self app:", error);
        displayToast("Failed to initialize verification app. Please try again.", "error");
      }
    } else {
      console.log("Account not available yet:", account);
    }
  }, [account]);

  const displayToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const copyToClipboard = () => {
    if (!universalLink) return;

    navigator.clipboard
      .writeText(universalLink)
      .then(() => {
        setLinkCopied(true);
        displayToast("Universal link copied to clipboard!", "success");
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        displayToast("Failed to copy link", "error");
      });
  };

  const openSelfApp = () => {
    if (!universalLink) return;

    window.open(universalLink, "_blank");
    displayToast("Opening Self App...", "info");
  };

  const handleSuccessfulVerification = () => {
    displayToast("Verification successful! Redirecting to articles...", "success");
    
    console.log("Redirecting to articles...");
    // Redirect to articles after successful verification
    setTimeout(() => {
      router.push('/articles');
    }, 2000);
  };

  const handleInputChange = (field: keyof UserData, value: string) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitUserData = async () => {
    if (!userData.name || !userData.nationality || !userData.dateOfBirth) {
      displayToast("Please fill in all fields", "error");
      return;
    }

    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer);
        
        const tx = await contract.completeUserData(
          account,
          userData.name,
          userData.nationality,
          userData.dateOfBirth
        );
        
        await tx.wait();
        displayToast("Profile data submitted successfully!", "success");
        setIsRegistered(true);
        
        // Update AuthContext verification status
        await checkVerificationStatus(account);
        
        // Refresh user info
        setTimeout(() => {
          checkUserRegistration();
        }, 2000);
      } else {
        displayToast("Please connect your wallet", "error");
      }
    } catch (error) {
      console.error("Error submitting user data:", error);
      displayToast("Failed to submit data. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };



  // If no wallet connected, show connect wallet screen
  if (!account) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">🔗</span>
          </div>
          <h1 className="text-3xl font-bold mb-4 text-gray-800">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-8">
            To proceed with identity verification, you need to connect your Web3 wallet first.
          </p>
          <button
            onClick={connectWallet}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Identity Verification
        </h1>
        <p className="text-lg text-gray-600">
          Verify your identity to access our trusted news platform and contribute to fact-checking
        </p>
      </div>

      {/* Wallet Connection Status */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Wallet Connection</h2>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <span className="text-gray-500 text-sm font-medium">Connected Address</span>
          <div className="text-sm font-mono text-gray-800 break-all mt-1">
            {account}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        {!isVerified ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Self Protocol Verification</h2>
              <p className="text-gray-600">Scan the QR code with your Self Protocol App</p>
            </div>

            <div className="flex justify-center mb-6">
              {selfApp ? (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <SelfQRcodeWrapper
                    selfApp={selfApp}
                    onSuccess={handleSuccessfulVerification}
                    onError={() => {
                      displayToast("Error: Failed to verify identity", "error");
                    }}
                  />
                </div>
              ) : (
                <div className="w-[256px] h-[256px] bg-gray-200 animate-pulse rounded-xl flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Loading QR Code...</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={!universalLink}
                className="flex-1 bg-gray-800 hover:bg-gray-700 transition-all duration-200 text-white py-3 px-4 rounded-lg text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {linkCopied ? "✓ Copied!" : "Copy Link"}
              </button>

              <button
                type="button"
                onClick={openSelfApp}
                disabled={!universalLink}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-white py-3 px-4 rounded-lg text-sm font-medium mt-2 sm:mt-0 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                Open Self App
              </button>
            </div>


          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Verification Complete!</h2>
              <p className="text-gray-600">Your information has been auto-filled from the verification</p>
            </div>

            {isRegistered && userInfo ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-800 mb-2">Profile Information</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {userInfo.name}</div>
                  <div><span className="font-medium">Nationality:</span> {userInfo.nationality}</div>
                  <div><span className="font-medium">Date of Birth:</span> {userInfo.dateOfBirth}</div>
                  <div><span className="font-medium">Reputation Score:</span> {userInfo.reputation}</div>
                  <div><span className="font-medium">Registered:</span> {userInfo.registeredAt}</div>
                  {userInfo.isJournalist && (
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium inline-block">
                      ✓ Verified Journalist
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/articles')}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    View Articles
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={userData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                  <input
                    type="text"
                    value={userData.nationality}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your nationality"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={userData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitUserData}
                  disabled={isLoading || !userData.name || !userData.nationality || !userData.dateOfBirth}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  {isLoading ? "Submitting..." : "Submit Profile Data"}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white py-3 px-6 rounded-lg shadow-lg animate-fade-in text-sm z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
} 
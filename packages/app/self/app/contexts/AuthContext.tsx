"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

// Contract addresses and ABIs
const USER_REGISTRY_ADDRESS = "0xB6E3e75CE2C22527416278278266b14630581a4B";
const USER_REGISTRY_ABI = [
  "function isRegistered(address user) external view returns (bool)",
  "function getUserInfo(address user) external view returns (bool, bool, uint256, uint256, string, string, string)"
];

const PROOF_OF_HUMAN_ADDRESS = "0xA9E2401B5d6F27Ae2357d9982cF51C133D80a844";
const PROOF_OF_HUMAN_ABI = [
  "function verificationSuccessful() external view returns (bool)",
  "function lastOutput() external view returns (tuple(bytes32 attestationId, uint256 userIdentifier, uint256 nullifier, uint256[4] forbiddenCountriesListPacked, string issuingState, string[] name, string idNumber, string nationality, string dateOfBirth, string gender, string expiryDate, uint256 olderThan, bool[3] ofac))",
  "function lastUserAddress() external view returns (address)"
];

interface AuthContextType {
  account: string;
  isVerified: boolean;
  isLoading: boolean;
  connectWallet: () => Promise<void>;
  checkVerificationStatus: (userAddress: string) => Promise<void>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is verified
  const checkVerificationStatus = async (userAddress: string) => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Check UserRegistry first
        const userRegistryContract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider);
        const registered = await userRegistryContract.isRegistered(userAddress);
        
        if (registered) {
          setIsVerified(true);
          return;
        }
        
        // If not registered in UserRegistry, check ProofOfHuman contract
        const proofOfHumanContract = new ethers.Contract(PROOF_OF_HUMAN_ADDRESS, PROOF_OF_HUMAN_ABI, provider);
        const verificationSuccessful = await proofOfHumanContract.verificationSuccessful();
        
        if (verificationSuccessful) {
          const lastUserAddress = await proofOfHumanContract.lastUserAddress();
          if (lastUserAddress.toLowerCase() === userAddress.toLowerCase()) {
            setIsVerified(true);
            return;
          }
        }
        
        setIsVerified(false);
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
      setIsVerified(false);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log("Requesting accounts from wallet...");
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Received accounts:", accounts);
        
        if (accounts.length > 0) {
          console.log("Setting account:", accounts[0]);
          setAccount(accounts[0]);
          await checkVerificationStatus(accounts[0]);
        } else {
          console.log("No accounts found");
        }
      } else {
        console.log("No ethereum provider found");
        alert('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    setAccount('');
    setIsVerified(false);
  };

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("Accounts changed:", accounts);
        if (accounts.length === 0) {
          console.log("No accounts, clearing state");
          setAccount('');
          setIsVerified(false);
        } else {
          console.log("Setting new account:", accounts[0]);
          setAccount(accounts[0]);
          checkVerificationStatus(accounts[0]);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Check if already connected
      console.log("Checking for existing accounts...");
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        console.log("Existing accounts:", accounts);
        if (accounts.length > 0) {
          console.log("Setting existing account:", accounts[0]);
          setAccount(accounts[0]);
          checkVerificationStatus(accounts[0]);
        }
      });

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const value = {
    account,
    isVerified,
    isLoading,
    connectWallet,
    checkVerificationStatus,
    disconnect,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
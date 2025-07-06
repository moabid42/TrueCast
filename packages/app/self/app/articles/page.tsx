"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ethers, Contract, formatEther } from 'ethers';
import { useAuth } from '@/contexts/AuthContext';
import ArticleManagerArtifact from '../../../walnus/ArticleManager.json';

// ArticleManager contract details
const ARTICLE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_ARTICLE_MANAGER_ADDRESS || '';
const ARTICLE_MANAGER_ABI = ArticleManagerArtifact.abi;

// Walrus Protocol endpoints
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";
const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";

// Extend window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Article type definition
interface Article {
  id: number;
  author: string;
  title: string; // Article title
  walrusHash: string;
  timestamp: Date;
  status: number;
  stake: any;
  version: number;
  mediaHashes: string[];
  mediaContentTypes?: { [hash: string]: string }; // Content types for media hashes
  metadata: string;
}

export default function ArticlesPage() {
  const router = useRouter();
  const { account, isVerified, connectWallet } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [formData, setFormData] = useState<{
    title: string;
    walrusHash: string;
    metadata: string;
    articleId: string;
    mediaHash: string;
    mediaContentType: string;
  }>({
    title: '',
    walrusHash: '',
    metadata: '',
    articleId: '',
    mediaHash: '',
    mediaContentType: ''
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const statusLabels = {
    0: 'Draft',
    1: 'Under Review',
    2: 'Published',
    3: 'Flagged'
  };

  const statusColors = {
    0: 'bg-gray-100 text-gray-800',
    1: 'bg-yellow-100 text-yellow-800',
    2: 'bg-green-100 text-green-800',
    3: 'bg-red-100 text-red-800'
  };

  // No verification required - articles are public
  // Users can browse articles without verification

  // Initialize Web3 connection
  const initializeContract = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          // Initialize contract
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const contractInstance = new ethers.Contract(ARTICLE_MANAGER_ADDRESS, ARTICLE_MANAGER_ABI, signer);
          setContract(contractInstance);
          return true;
        }
      } else {
        alert('Please install MetaMask!');
        return false;
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    }
  };

  // Load articles
  const loadArticles = async () => {
    if (!contract) return;

    setLoading(true);
    try {
      const totalArticles = await contract.getTotalArticles();
      const articlesData: Article[] = [];
      const total = typeof totalArticles === 'bigint' ? Number(totalArticles) : parseInt(totalArticles.toString());
      for (let i = 1; i <= total; i++) {
        try {
          const article = await contract.getArticle(i);
          const articleData: Article = {
            id: Number(article.id),
            author: article.author,
            title: article.title || `Article #${article.id}`,
            walrusHash: article.walrusHash,
            timestamp: new Date(Number(article.timestamp) * 1000),
            status: article.status,
            stake: article.stake,
            version: Number(article.version),
            mediaHashes: article.mediaHashes,
            metadata: article.metadata
          };

          // Fetch content types for media hashes
          if (articleData.mediaHashes.length > 0) {
            articleData.mediaContentTypes = {};
            for (const mediaHash of articleData.mediaHashes) {
              try {
                const contentType = await contract.getMediaContentType(mediaHash);
                articleData.mediaContentTypes[mediaHash] = contentType;
              } catch (error) {
                console.error(`Failed to get content type for ${mediaHash}:`, error);
                articleData.mediaContentTypes[mediaHash] = 'application/octet-stream';
              }
            }
          }

          articlesData.push(articleData);
        } catch (error) {
          console.error(`Error loading article ${i}:`, error);
        }
      }

      setArticles(articlesData);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new article
  const createArticle = async () => {
    if (!contract || !formData.title || !formData.walrusHash || !formData.metadata) return;

    setLoading(true);
    try {
      const minimumStake = await contract.minimumStake();
      const tx = await contract.createArticle(
        formData.title,
        formData.walrusHash,
        formData.metadata,
        { value: minimumStake }
      );

      await tx.wait();
      alert('Article created successfully!');
      setFormData({ title: '', walrusHash: '', metadata: '', articleId: '', mediaHash: '', mediaContentType: '' });
      loadArticles();
    } catch (error: any) {
      console.error('Error creating article:', error);
      alert('Error creating article: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  // Update article
  const updateArticle = async () => {
    if (!contract || !formData.articleId || !formData.title || !formData.walrusHash || !formData.metadata) return;

    setLoading(true);
    try {
      const tx = await contract.updateArticle(
        formData.articleId,
        formData.title,
        formData.walrusHash,
        formData.metadata
      );

      await tx.wait();
      alert('Article updated successfully!');
      loadArticles();
    } catch (error: any) {
      console.error('Error updating article:', error);
      alert('Error updating article: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  // Attach media
  const attachMedia = async () => {
    if (!contract || !formData.articleId || !formData.mediaHash) return;

    setLoading(true);
    try {
      // Get the content type from the uploaded file
      const contentType = formData.mediaContentType || 'application/octet-stream';
      const tx = await contract.attachMedia(formData.articleId, formData.mediaHash, contentType);
      await tx.wait();
      alert('Media attached successfully!');
      setFormData(prev => ({ ...prev, mediaHash: '', mediaContentType: '' }));
      loadArticles();
    } catch (error: any) {
      console.error('Error attaching media:', error);
      alert('Error attaching media: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  // Get articles by author
  const getMyArticles = async () => {
    if (!contract || !account) return;

    setLoading(true);
    try {
      const articleIds = await contract.getArticlesByAuthor(account);
      const myArticles: Article[] = [];

      for (let id of articleIds) {
        const article = await contract.getArticle(id);
        const articleData: Article = {
          id: Number(article.id),
          author: article.author,
          title: article.title || `Article #${article.id}`,
          walrusHash: article.walrusHash,
          timestamp: new Date(Number(article.timestamp) * 1000),
          status: article.status,
          stake: article.stake,
          version: Number(article.version),
          mediaHashes: article.mediaHashes,
          metadata: article.metadata
        };

        // Fetch content types for media hashes
        if (articleData.mediaHashes.length > 0) {
          articleData.mediaContentTypes = {};
          for (const mediaHash of articleData.mediaHashes) {
            try {
              const contentType = await contract.getMediaContentType(mediaHash);
              articleData.mediaContentTypes[mediaHash] = contentType;
            } catch (error) {
              console.error(`Failed to get content type for ${mediaHash}:`, error);
              articleData.mediaContentTypes[mediaHash] = 'application/octet-stream';
            }
          }
        }

        myArticles.push(articleData);
      }

      setArticles(myArticles);
    } catch (error) {
      console.error('Error getting my articles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Unified file upload handler (direct to Walrus)
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
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
      
      // Determine which field to update based on active tab
      if (activeTab === 'media') {
        // For media upload, populate mediaHash field and content type
        setFormData(prev => ({
          ...prev,
          mediaHash: blobId,
          mediaContentType: file.type,
        }));
        alert('Media file uploaded to Walrus! Media hash and content type auto-filled.');
      } else {
        // For article creation, populate walrusHash and metadata
        setFormData(prev => ({
          ...prev,
          walrusHash: blobId,
          metadata: JSON.stringify({ filename: file.name, type: file.type, size: file.size }),
        }));
        alert('File uploaded to Walrus! Hash auto-filled.');
      }
    } catch (err: any) {
      alert('Error uploading file: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // File input change handler
  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  // View/download blob by walrusHash
  const handleViewBlob = async (article: Article) => {
    if (!article.walrusHash) return;
    try {
      const url = `${AGGREGATOR}/v1/blobs/${article.walrusHash}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch blob');
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.startsWith('text/')) {
        const text = await response.text();
        setModalTitle(`Article #${article.id} - Text Content`);
        setModalContent(text);
        setModalOpen(true);
      } else {
        // Download file
        const blob = await response.blob();
        const urlObj = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObj;
        a.download = article.metadata ? JSON.parse(article.metadata).filename || `article_${article.id}` : `article_${article.id}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(urlObj);
      }
    } catch (err) {
      alert('Error fetching blob: ' + (err as any)?.message || err);
    }
  };

  // Check network and listen for changes
  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
                  try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            setWrongNetwork(chainId !== '0xaef3'); // 0xaef3 is 44787 in hex (Alfajores)
          } catch (e) {
            setWrongNetwork(true);
          }
      }
    };
    checkNetwork();
    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetwork);
      return () => {
        window.ethereum.removeListener('chainChanged', checkNetwork);
      };
    }
  }, []);

  // Initialize contract when account is available
  useEffect(() => {
    if (account) {
      initializeContract();
    }
  }, [account]);

  useEffect(() => {
    if (contract) {
      loadArticles();
    }
  }, [contract]);

  const renderArticleCard = (article: Article) => (
    <div key={article.id} className="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-100">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-gray-800">Article #{article.id}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[article.status as keyof typeof statusColors]}`}>
          {statusLabels[article.status as keyof typeof statusLabels]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Author:</p>
          <p className="text-sm font-mono bg-gray-50 p-2 rounded break-all">{article.author}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Created:</p>
          <p className="text-sm text-gray-700">{article.timestamp.toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-1">Walrus Hash:</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono bg-gray-50 p-2 rounded break-all flex-1">{article.walrusHash}</p>
          <button className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => handleViewBlob(article)} title="View or Download">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>

      {article.metadata && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">Metadata:</p>
          <p className="text-sm bg-gray-50 p-2 rounded">{article.metadata}</p>
        </div>
      )}

      {/* Media Hashes Section */}
      {article.mediaHashes.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">Media Attachments ({article.mediaHashes.length}):</p>
          <div className="space-y-2">
            {article.mediaHashes.map((hash, index) => (
              <div key={hash} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
                <div className="flex-1">
                  <p className="text-xs font-mono break-all">{hash}</p>
                  {article.mediaContentTypes && article.mediaContentTypes[hash] && (
                    <p className="text-xs text-gray-400">{article.mediaContentTypes[hash]}</p>
                  )}
                </div>
                <a 
                  href={`${AGGREGATOR}/v1/blobs/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="View media file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Version: {article.version}</span>
        <span>Stake: {formatEther(article.stake) || '0'} ETH</span>
        {article.mediaHashes.length > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {article.mediaHashes.length} media files
          </span>
        )}
      </div>
    </div>
  );

  // Show verification status banner for non-verified users
  const VerificationBanner = () => {
    if (!account) return null;
    
    if (!isVerified) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Identity Verification Recommended</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Verify your identity to create and manage articles. You can still browse articles without verification.
              </p>
            </div>
            <button
              onClick={() => router.push('/verify')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Verify Now
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-green-800">Identity Verified</h3>
            <p className="text-sm text-green-700">You can create and manage articles.</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {wrongNetwork && (
        <div className="w-full bg-red-700 text-white text-center py-3 font-bold z-50 mb-6 rounded-lg">
          ⚠️ Please switch your wallet to the Alfajores testnet to use this app.
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Article Manager</h1>

        {!account ? (
          <div className="text-center">
            <button
              onClick={connectWallet}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Connected Account:</p>
            <p className="font-mono bg-gray-50 p-2 rounded break-all">{account}</p>
          </div>
        )}
      </div>

      {/* Show verification status banner */}
      <VerificationBanner />

      {account && (
        <>
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-2 rounded font-medium ${activeTab === 'browse'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                <svg className="inline mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Browse Articles
              </button>
              <button
                onClick={() => setActiveTab('create')}
                disabled={!isVerified}
                className={`px-4 py-2 rounded font-medium ${activeTab === 'create'
                    ? 'bg-blue-500 text-white'
                    : isVerified 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                title={!isVerified ? 'Identity verification required to create articles' : ''}
              >
                <svg className="inline mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Article
              </button>
              <button
                onClick={() => setActiveTab('update')}
                disabled={!isVerified}
                className={`px-4 py-2 rounded font-medium ${activeTab === 'update'
                    ? 'bg-blue-500 text-white'
                    : isVerified 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                title={!isVerified ? 'Identity verification required to update articles' : ''}
              >
                <svg className="inline mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Update Article
              </button>
              <button
                onClick={() => setActiveTab('media')}
                disabled={!isVerified}
                className={`px-4 py-2 rounded font-medium ${activeTab === 'media'
                    ? 'bg-blue-500 text-white'
                    : isVerified 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                title={!isVerified ? 'Identity verification required to attach media' : ''}
              >
                <svg className="inline mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Attach Media
              </button>
            </div>

            {activeTab === 'browse' && (
              <div>
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={loadArticles}
                    disabled={loading || wrongNetwork}
                    title={wrongNetwork ? 'Please switch to the Alfajores testnet to enable this action.' : ''}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load All Articles'}
                  </button>
                  <button
                    onClick={getMyArticles}
                    disabled={loading || wrongNetwork}
                    title={wrongNetwork ? 'Please switch to the Alfajores testnet to enable this action.' : ''}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'My Articles'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'create' && (
              <div className="space-y-4">
                {!isVerified && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800">Identity Verification Required</h3>
                        <p className="text-sm text-yellow-700">You need to verify your identity to create articles.</p>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Title</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter article title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File (drag & drop or click)
                  </label>
                  <div
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors duration-200 cursor-pointer ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-500'}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={handleButtonClick}
                    style={{ minHeight: '120px' }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    {loading ? (
                      <span className="text-blue-600">Uploading...</span>
                    ) : (
                      <>
                        <span className="text-gray-600 mb-2">Drag & drop a file here, or <span className="underline text-blue-600">click to select</span></span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Walrus Hash
                  </label>
                  <input
                    type="text"
                    value={formData.walrusHash}
                    onChange={(e) => setFormData({ ...formData, walrusHash: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter Walrus storage hash"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metadata (JSON)
                  </label>
                  <textarea
                    value={formData.metadata}
                    onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder='{"title": "Article Title", "description": "Article description"}'
                  />
                </div>
                <button
                  onClick={createArticle}
                  disabled={loading || wrongNetwork || !isVerified}
                  title={!isVerified ? 'Identity verification required' : wrongNetwork ? 'Please switch to the Alfajores testnet to enable this action.' : ''}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isVerified 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Creating...' : 'Create Article'}
                </button>
              </div>
            )}

            {activeTab === 'update' && (
              <div className="space-y-4">
                {!isVerified && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800">Identity Verification Required</h3>
                        <p className="text-sm text-yellow-700">You need to verify your identity to update articles.</p>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Article ID
                  </label>
                  <input
                    type="number"
                    value={formData.articleId}
                    onChange={(e) => setFormData({ ...formData, articleId: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter article ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new article title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Walrus Hash
                  </label>
                  <input
                    type="text"
                    value={formData.walrusHash}
                    onChange={(e) => setFormData({ ...formData, walrusHash: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new Walrus storage hash"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Metadata (JSON)
                  </label>
                  <textarea
                    value={formData.metadata}
                    onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder='{"title": "Updated Title", "description": "Updated description"}'
                  />
                </div>
                <button
                  onClick={updateArticle}
                  disabled={loading || wrongNetwork || !isVerified}
                  title={!isVerified ? 'Identity verification required' : wrongNetwork ? 'Please switch to the Alfajores testnet to enable this action.' : ''}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isVerified 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Updating...' : 'Update Article'}
                </button>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-4">
                {!isVerified && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800">Identity Verification Required</h3>
                        <p className="text-sm text-yellow-700">You need to verify your identity to attach media.</p>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Article ID
                  </label>
                  <input
                    type="number"
                    value={formData.articleId}
                    onChange={(e) => setFormData({ ...formData, articleId: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter article ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Media File (drag & drop or click)
                  </label>
                  <div
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors duration-200 cursor-pointer ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-500'}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={handleButtonClick}
                    style={{ minHeight: '120px' }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    {loading ? (
                      <span className="text-blue-600">Uploading...</span>
                    ) : (
                      <>
                        <span className="text-gray-600 mb-2">Drag & drop a media file here, or <span className="underline text-blue-600">click to select</span></span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Media Hash (auto-filled after upload)
                  </label>
                  <input
                    type="text"
                    value={formData.mediaHash}
                    onChange={(e) => setFormData({ ...formData, mediaHash: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Media hash will be auto-filled after upload"
                    readOnly
                  />
                </div>
                <button
                  onClick={attachMedia}
                  disabled={loading || wrongNetwork || !isVerified || !formData.articleId || !formData.mediaHash}
                  title={!isVerified ? 'Identity verification required' : wrongNetwork ? 'Please switch to the Alfajores testnet to enable this action.' : !formData.articleId || !formData.mediaHash ? 'Please provide article ID and upload a media file' : ''}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isVerified && formData.articleId && formData.mediaHash
                      ? 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Attaching...' : 'Attach Media'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Articles</h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-500">Loading articles...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">No articles found. Create your first article!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map(renderArticleCard)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal for text content */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setModalOpen(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-gray-800">{modalTitle}</h2>
            <pre className="whitespace-pre-wrap text-gray-700 overflow-x-auto max-h-[60vh]">{modalContent}</pre>
          </div>
        </div>
      )}
    </div>
  );
} 
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers, Contract, formatEther } from 'ethers';
import { useAuth } from '@/contexts/AuthContext';
import ArticleManagerArtifact from '../../../walnus/ArticleManager.json';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ArticleManager contract details
const ARTICLE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_ARTICLE_MANAGER_ADDRESS || '';
const ARTICLE_MANAGER_ABI = ArticleManagerArtifact.abi;

// Walrus Protocol endpoints
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

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
  content?: string; // Markdown content from Walrus
  mediaContent?: { [hash: string]: { type: string; url: string; content?: string } }; // Media content from Walrus
  votes?: number; // Vote count
  userVote?: 'up' | 'down' | null; // User's vote
  isExpanded?: boolean; // Track if article content is expanded
}

export default function FeedPage() {
  const router = useRouter();
  const { account, isVerified, connectWallet } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [isJournalist, setIsJournalist] = useState(false);
  const [isLoadingJournalist, setIsLoadingJournalist] = useState(true);

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

  // Check journalist status
  const checkJournalistStatus = async () => {
    if (!account) {
      setIsLoadingJournalist(false);
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
      }
    } catch (error) {
      console.error('Error checking journalist status:', error);
    } finally {
      setIsLoadingJournalist(false);
    }
  };

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

  // Load articles and their content
  const loadArticles = async () => {
    // If no contract, try to initialize it first
    if (!contract) {
      if (account) {
        await initializeContract();
      } else {
        // For public access, create a read-only provider
        try {
          if (typeof window !== 'undefined' && window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contractInstance = new ethers.Contract(ARTICLE_MANAGER_ADDRESS, ARTICLE_MANAGER_ABI, provider);
            setContract(contractInstance);
          } else {
            console.error('No ethereum provider available');
            return;
          }
        } catch (error) {
          console.error('Error creating read-only contract:', error);
          return;
        }
      }
    }

    const currentContract = contract;
    if (!currentContract) return;

    setLoading(true);
    try {
      console.log("Loading articles from contract:", ARTICLE_MANAGER_ADDRESS);
      const totalArticles = await currentContract.getTotalArticles();
      console.log("Total articles:", totalArticles);
      const articlesData: Article[] = [];
      const total = typeof totalArticles === 'bigint' ? Number(totalArticles) : parseInt(totalArticles.toString());
      console.log("Parsed total:", total);
      
      for (let i = 1; i <= total; i++) {
        try {
          console.log(`Loading article ${i}...`);
          const article = await currentContract.getArticle(i);
          console.log(`Article ${i} data:`, article);
          const articleData: Article = {
            id: Number(article.id),
            author: article.author,
            title: article.title || `Article #${article.id}`, // Use title from contract or fallback
            walrusHash: article.walrusHash,
            timestamp: new Date(Number(article.timestamp) * 1000),
            status: article.status,
            stake: article.stake,
            version: Number(article.version),
            mediaHashes: article.mediaHashes,
            metadata: article.metadata,
            votes: 0, // Initialize vote count
            userVote: null // Initialize user vote
          };

          // Fetch markdown content from Walrus
          if (articleData.walrusHash) {
            try {
              console.log(`Fetching content for article ${i} with hash: ${articleData.walrusHash}`);
              const url = `${AGGREGATOR}/v1/blobs/${articleData.walrusHash}`;
              console.log(`Fetching from URL: ${url}`);
              
              const response = await fetch(url);
              console.log(`Response status for article ${i}:`, response.status);
              console.log(`Response headers for article ${i}:`, Object.fromEntries(response.headers.entries()));
              
              if (response.ok) {
                const contentType = response.headers.get('Content-Type') || '';
                console.log(`Content type for article ${i}:`, contentType);
                
                // Try to get content regardless of content type
                const content = await response.text();
                console.log(`Content length for article ${i}:`, content.length);
                console.log(`Content preview for article ${i}:`, content.substring(0, 200) + '...');
                
                if (content.trim()) {
                  articleData.content = content;
                  console.log(`Successfully set content for article ${i}`);
                } else {
                  console.log(`Empty content for article ${i}`);
                }
              } else {
                console.error(`Failed to fetch content for article ${i}:`, response.status, response.statusText);
                const errorText = await response.text();
                console.error(`Error response body:`, errorText);
              }
            } catch (error) {
              console.error(`Error fetching content for article ${i}:`, error);
            }
          } else {
            console.log(`No walrus hash for article ${i}`);
          }

          // Fetch media content types and content
          if (articleData.mediaHashes.length > 0) {
            console.log(`Fetching ${articleData.mediaHashes.length} media files for article ${i}`);
            articleData.mediaContent = {};
            articleData.mediaContentTypes = {};
            
            for (const mediaHash of articleData.mediaHashes) {
              console.log(`Fetching media hash: ${mediaHash}`);
              
              // Get content type from contract
              try {
                const contentType = await currentContract.getMediaContentType(mediaHash);
                articleData.mediaContentTypes![mediaHash] = contentType;
                console.log(`Content type for ${mediaHash}:`, contentType);
              } catch (error) {
                console.error(`Failed to get content type for ${mediaHash}:`, error);
                articleData.mediaContentTypes![mediaHash] = 'application/octet-stream';
              }
              
              // Fetch media content
              const mediaContent = await fetchMediaContent(mediaHash, articleData.mediaContentTypes![mediaHash]);
              if (mediaContent) {
                articleData.mediaContent[mediaHash] = mediaContent;
                console.log(`Successfully fetched media:`, mediaContent);
              } else {
                console.log(`Failed to fetch media for hash: ${mediaHash}`);
              }
            }
            console.log(`Final media content for article ${i}:`, articleData.mediaContent);
          }

          articlesData.push(articleData);
        } catch (error) {
          console.error(`Error loading article ${i}:`, error);
        }
      }

      // Sort articles by timestamp (newest first)
      articlesData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setArticles(articlesData);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle voting
  const handleVote = async (articleId: number, vote: 'up' | 'down') => {
    if (!account || !isVerified) {
      alert('Please connect your wallet and verify your identity to vote.');
      return;
    }

    setArticles(prevArticles => 
      prevArticles.map(article => {
        if (article.id === articleId) {
          const newVotes = article.votes || 0;
          const currentUserVote = article.userVote;
          
          let voteChange = 0;
          if (currentUserVote === vote) {
            // Remove vote
            voteChange = vote === 'up' ? -1 : 1;
            return { ...article, votes: newVotes + voteChange, userVote: null };
          } else if (currentUserVote === null) {
            // Add new vote
            voteChange = vote === 'up' ? 1 : -1;
            return { ...article, votes: newVotes + voteChange, userVote: vote };
          } else {
            // Change vote
            voteChange = vote === 'up' ? 2 : -2;
            return { ...article, votes: newVotes + voteChange, userVote: vote };
          }
        }
        return article;
      })
    );

    // TODO: Implement actual voting on blockchain
    console.log(`Voted ${vote} on article ${articleId}`);
  };

  // Check journalist status when account changes
  useEffect(() => {
    checkJournalistStatus();
  }, [account]);

  // Check network
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

  // Initialize contract when account changes
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

  // Toggle article expansion
  const toggleArticleExpansion = (articleId: number) => {
    setArticles(prevArticles => 
      prevArticles.map(article => 
        article.id === articleId 
          ? { ...article, isExpanded: !article.isExpanded }
          : article
      )
    );
  };

  // Check if content should be truncated
  const shouldTruncate = (content: string) => {
    return content.length > 500; // Show "show more" if content is longer than 500 characters
  };

  // Get truncated content
  const getTruncatedContent = (content: string) => {
    return content.substring(0, 500) + '...';
  };

  // Media Carousel Component
  const MediaCarousel = ({ mediaContent }: { mediaContent: { [hash: string]: { type: string; url: string; content?: string } } }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const mediaEntries = Object.entries(mediaContent);
    
    const nextSlide = () => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % mediaEntries.length);
    };
    
    const prevSlide = () => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + mediaEntries.length) % mediaEntries.length);
    };
    
    const goToSlide = (index: number) => {
      setCurrentIndex(index);
    };

    if (mediaEntries.length === 0) return null;

    const [currentHash, currentMedia] = mediaEntries[currentIndex];

    return (
      <div className="relative">
        {/* Main Media Display */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          {currentMedia.type === 'video' && (
            <video 
              controls 
              className="w-full max-w-2xl rounded-lg mx-auto"
              src={currentMedia.url}
            >
              Your browser does not support the video tag.
            </video>
          )}
          {currentMedia.type === 'audio' && (
            <audio 
              controls 
              className="w-full max-w-2xl mx-auto"
              src={currentMedia.url}
            >
              Your browser does not support the audio tag.
            </audio>
          )}
          {currentMedia.type === 'image' && (
            <img 
              src={currentMedia.url} 
              alt="Article media" 
              className="w-full max-w-2xl rounded-lg mx-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          {currentMedia.type === 'text' && (
            <div className="bg-gray-50 p-3 rounded-lg max-w-2xl mx-auto">
              <p className="text-sm text-gray-600 font-mono break-all">{currentMedia.content}</p>
            </div>
          )}
          {(currentMedia.type === 'unknown' || !['video', 'audio', 'image', 'text'].includes(currentMedia.type)) && (
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg max-w-2xl mx-auto">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-600 mb-3">File attachment</p>
                <a 
                  href={currentMedia.url} 
                  download
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download File
                </a>
              </div>
            </div>
          )}
          
          {/* Media Info */}
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 font-mono break-all">{currentHash}</p>
            <p className="text-xs text-gray-400 mt-1">
              {currentIndex + 1} of {mediaEntries.length}
            </p>
          </div>
        </div>

        {/* Navigation Controls */}
        {mediaEntries.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
              aria-label="Previous media"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Next Button */}
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
              aria-label="Next media"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dots Indicator */}
            <div className="flex justify-center mt-4 space-x-2">
              {mediaEntries.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-blue-600' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to media ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // Fetch media content from Walrus
  const fetchMediaContent = async (mediaHash: string, contentType: string) => {
    try {
      console.log(`Fetching media content for hash: ${mediaHash} with content type: ${contentType}`);
      const url = `${AGGREGATOR}/v1/blobs/${mediaHash}`;
      const response = await fetch(url);
      
      if (response.ok) {
        console.log(`Media content type from contract:`, contentType);
        
        if (contentType.startsWith('video/')) {
          return { type: 'video', url: url, content: url };
        } else if (contentType.startsWith('audio/')) {
          return { type: 'audio', url: url, content: url };
        } else if (contentType.startsWith('image/')) {
          return { type: 'image', url: url, content: url };
        } else if (contentType.startsWith('text/')) {
          // For text files, try to get as text
          const content = await response.text();
          return { type: 'text', url: url, content };
        } else {
          // For unknown types, return as downloadable file
          return { type: 'unknown', url: url, content: undefined };
        }
      } else {
        console.error(`Failed to fetch media content:`, response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching media content:`, error);
      return null;
    }
  };

  const renderArticleCard = (article: Article) => (
    <div key={article.id} className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-800">{article.title}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[article.status as keyof typeof statusColors]}`}>
              {statusLabels[article.status as keyof typeof statusLabels]}
            </span>
          </div>
          
          <div className="text-sm text-gray-600 mb-3">
            <span>By: {article.author}</span>
            <span className="mx-2">•</span>
            <span>{article.timestamp.toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>Stake: {formatEther(article.stake) || '0'} ETH</span>
          </div>
        </div>
      </div>

      {/* Article Content */}
      {article.content ? (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b border-gray-200 pb-2">
            Article Content:
          </h3>
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-gray-800">{children}</h1>,
                h2: ({children}) => <h2 className="text-xl font-bold mb-3 mt-6 text-gray-800">{children}</h2>,
                h3: ({children}) => <h3 className="text-lg font-semibold mb-2 mt-4 text-gray-800">{children}</h3>,
                p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                em: ({children}) => <em className="italic">{children}</em>,
                code: ({children, className}) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{children}</code>
                  ) : (
                    <code className="block bg-gray-100 p-4 rounded-lg overflow-x-auto my-4 font-mono">{children}</code>
                  );
                },
                a: ({href, children}) => (
                  <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                ul: ({children}) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal ml-6 mb-4">{children}</ol>,
                li: ({children}) => <li className="mb-1">{children}</li>,
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {article.isExpanded ? article.content : (shouldTruncate(article.content) ? getTruncatedContent(article.content) : article.content)}
            </ReactMarkdown>
            
            {shouldTruncate(article.content) && (
              <button
                onClick={() => toggleArticleExpansion(article.id)}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {article.isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-yellow-800 font-medium">Content not available</p>
              <p className="text-yellow-700 text-sm mt-1">
                Unable to fetch article content from Walrus Protocol.
                {article.walrusHash && (
                  <span className="block mt-1 font-mono text-xs bg-yellow-100 px-2 py-1 rounded">
                    Hash: {article.walrusHash}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Media Content Carousel */}
      {article.mediaContent && Object.keys(article.mediaContent).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b border-gray-200 pb-2">
            Media Attachments ({Object.keys(article.mediaContent).length}):
          </h3>
          <MediaCarousel mediaContent={article.mediaContent} />
        </div>
      )}

      {/* Metadata */}
      {article.metadata && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">{article.metadata}</p>
        </div>
      )}

      {/* Voting Section */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote(article.id, 'up')}
              disabled={!account || !isVerified}
              className={`p-2 rounded-lg transition-colors ${
                article.userVote === 'up'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
              } ${(!account || !isVerified) ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!account || !isVerified ? 'Connect wallet and verify identity to vote' : 'Upvote'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            
            <span className="text-sm font-medium text-gray-700 min-w-[2rem] text-center">
              {article.votes || 0}
            </span>
            
            <button
              onClick={() => handleVote(article.id, 'down')}
              disabled={!account || !isVerified}
              className={`p-2 rounded-lg transition-colors ${
                article.userVote === 'down'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
              } ${(!account || !isVerified) ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!account || !isVerified ? 'Connect wallet and verify identity to vote' : 'Downvote'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Version: {article.version}</span>
          {article.mediaHashes.length > 0 && (
            <>
              <span>•</span>
              <span>{article.mediaHashes.length} media files</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {wrongNetwork && (
        <div className="w-full bg-red-700 text-white text-center py-3 font-bold z-50 mb-6 rounded-lg">
          ⚠️ Please switch your wallet to the Alfajores testnet to use this app.
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Article Feed</h1>
            <p className="text-gray-600">Browse and vote on verified articles from the community</p>
          </div>
          
          <div className="flex gap-4">
            {!account ? (
              <div className="flex gap-2">
                <button
                  onClick={loadArticles}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load Articles'}
                </button>
                <button
                  onClick={connectWallet}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-sm text-gray-500">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
                {!isVerified && (
                  <button
                    onClick={() => router.push('/verify')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Verify Identity to Vote
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">Be the first to create an article!</p>
            {isJournalist ? (
              <button
                onClick={() => router.push('/articles')}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Create Article
              </button>
            ) : (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-2">Only verified journalists can create articles</p>
                <button
                  onClick={() => router.push('/journalist-application')}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Apply to Become a Journalist
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {articles.length} Article{articles.length !== 1 ? 's' : ''}
              </h2>
              <button
                onClick={loadArticles}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            {articles.map(renderArticleCard)}
          </>
        )}
      </div>
    </div>
  );
} 
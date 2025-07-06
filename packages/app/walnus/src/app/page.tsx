"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ethers, Contract, formatEther } from 'ethers';
import ArticleManagerArtifact from '../../ArticleManager.json';
import { Search, FileText, Plus, Edit, Eye, Upload, Calendar, User, ExternalLink } from 'lucide-react';

const ARTICLE_MANAGER_ADDRESS = '0xD2E9ad1A29cF863E0Ec43362CAAd6a04565dB1d3';
const ARTICLE_MANAGER_ABI = ArticleManagerArtifact.abi;
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
  walrusHash: string;
  timestamp: Date;
  status: number;
  stake: any;
  version: number;
  mediaHashes: string[];
  metadata: string;
}

const ArticleManagerFrontend = () => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [account, setAccount] = useState<string>('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [formData, setFormData] = useState<{
    walrusHash: string;
    metadata: string;
    articleId: string;
    mediaHash: string;
  }>({
    walrusHash: '',
    metadata: '',
    articleId: '',
    mediaHash: ''
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

  // Initialize Web3 connection
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        // Initialize contract
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractInstance = new ethers.Contract(ARTICLE_MANAGER_ADDRESS, ARTICLE_MANAGER_ABI, signer);
        setContract(contractInstance);

        return true;
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
          articlesData.push({
            id: Number(article.id),
            author: article.author,
            walrusHash: article.walrusHash,
            timestamp: new Date(Number(article.timestamp) * 1000),
            status: article.status,
            stake: article.stake,
            version: Number(article.version),
            mediaHashes: article.mediaHashes,
            metadata: article.metadata
          });
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
    if (!contract || !formData.walrusHash || !formData.metadata) return;

    setLoading(true);
    try {
      const minimumStake = await contract.minimumStake();
      const tx = await contract.createArticle(
        formData.walrusHash,
        formData.metadata,
        { value: minimumStake }
      );

      await tx.wait();
      alert('Article created successfully!');
      setFormData({ walrusHash: '', metadata: '', articleId: '', mediaHash: '' });
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
    if (!contract || !formData.articleId || !formData.walrusHash || !formData.metadata) return;

    setLoading(true);
    try {
      const tx = await contract.updateArticle(
        formData.articleId,
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
      const tx = await contract.attachMedia(formData.articleId, formData.mediaHash);
      await tx.wait();
      alert('Media attached successfully!');
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
        myArticles.push({
          id: Number(article.id),
          author: article.author,
          walrusHash: article.walrusHash,
          timestamp: new Date(Number(article.timestamp) * 1000),
          status: article.status,
          stake: article.stake,
          version: Number(article.version),
          mediaHashes: article.mediaHashes,
          metadata: article.metadata
        });
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
      setFormData(prev => ({
        ...prev,
        walrusHash: blobId,
        metadata: JSON.stringify({ filename: file.name, type: file.type, size: file.size }),
      }));
      alert('File uploaded to Walrus! Hash auto-filled.');
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
          setWrongNetwork(chainId !== '44787');
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

  useEffect(() => {
    if (contract) {
      loadArticles();
    }
  }, [contract]);

  const renderArticleCard = (article: Article) => (
    <div key={article.id} className="bg-neutral-900 rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-neutral-100">Article #{article.id}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[article.status as keyof typeof statusColors]}`}>
          {statusLabels[article.status as keyof typeof statusLabels]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-neutral-300 mb-1">Author:</p>
          <p className="text-sm font-mono bg-neutral-800 p-2 rounded break-all">{article.author}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-300 mb-1">Created:</p>
          <p className="text-sm text-neutral-200">{article.timestamp.toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-neutral-300 mb-1">Walrus Hash:</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono bg-neutral-800 p-2 rounded break-all flex-1">{article.walrusHash}</p>
          <button className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => handleViewBlob(article)} title="View or Download">
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {article.metadata && (
        <div className="mb-4">
          <p className="text-sm text-neutral-300 mb-1">Metadata:</p>
          <p className="text-sm bg-neutral-800 p-2 rounded">{article.metadata}</p>
        </div>
      )}

      <div className="flex justify-between items-center text-sm text-neutral-400">
        <span>Version: {article.version}</span>
        <span>Stake: {formatEther(article.stake) || '0'} ETH</span>
        {article.mediaHashes.length > 0 && (
          <span className="flex items-center gap-1">
            <Upload size={14} />
            {article.mediaHashes.length} media files
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      {wrongNetwork && (
        <div className="w-full bg-red-700 text-white text-center py-3 font-bold z-50">
          ⚠️ Please switch your wallet to the Sepolia testnet to use this app.
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-neutral-900 rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-neutral-100 mb-6">ArticleManager Frontend</h1>

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
              <p className="text-sm text-neutral-300 mb-2">Connected Account:</p>
              <p className="font-mono bg-neutral-800 p-2 rounded break-all">{account}</p>
            </div>
          )}
        </div>

        {account && (
          <>
            <div className="bg-neutral-900 rounded-lg shadow-lg p-6 mb-8">
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`px-4 py-2 rounded font-medium ${activeTab === 'browse'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  <Eye className="inline mr-2" size={16} />
                  Browse Articles
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`px-4 py-2 rounded font-medium ${activeTab === 'create'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  <Plus className="inline mr-2" size={16} />
                  Create Article
                </button>
                <button
                  onClick={() => setActiveTab('update')}
                  className={`px-4 py-2 rounded font-medium ${activeTab === 'update'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  <Edit className="inline mr-2" size={16} />
                  Update Article
                </button>
                <button
                  onClick={() => setActiveTab('media')}
                  className={`px-4 py-2 rounded font-medium ${activeTab === 'media'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  <Upload className="inline mr-2" size={16} />
                  Attach Media
                </button>
              </div>

              {activeTab === 'browse' && (
                <div>
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={loadArticles}
                      disabled={loading || wrongNetwork}
                      title={wrongNetwork ? 'Please switch to the Sepolia testnet to enable this action.' : ''}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Load All Articles'}
                    </button>
                    <button
                      onClick={getMyArticles}
                      disabled={loading || wrongNetwork}
                      title={wrongNetwork ? 'Please switch to the Sepolia testnet to enable this action.' : ''}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'My Articles'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'create' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Upload File (drag & drop or click)
                    </label>
                    <div
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors duration-200 cursor-pointer ${dragActive ? 'border-blue-400 bg-neutral-800' : 'border-neutral-700 bg-neutral-900 hover:border-blue-500'}`}
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
                        <span className="text-blue-400">Uploading...</span>
                      ) : (
                        <>
                          <span className="text-neutral-300 mb-2">Drag & drop a file here, or <span className="underline text-blue-400">click to select</span></span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Walrus Hash
                    </label>
                    <input
                      type="text"
                      value={formData.walrusHash}
                      onChange={(e) => setFormData({ ...formData, walrusHash: e.target.value })}
                      className="w-full p-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-neutral-800 text-neutral-100 placeholder-neutral-500"
                      placeholder="Enter Walrus storage hash"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Metadata (JSON)
                    </label>
                    <textarea
                      value={formData.metadata}
                      onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                      className="w-full p-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-neutral-800 text-neutral-100 placeholder-neutral-500"
                      rows={4}
                      placeholder='{"title": "Article Title", "description": "Article description"}'
                    />
                  </div>
                  <button
                    onClick={createArticle}
                    disabled={loading || wrongNetwork}
                    title={wrongNetwork ? 'Please switch to the Sepolia testnet to enable this action.' : ''}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Article'}
                  </button>
                </div>
              )}

              {activeTab === 'update' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Article ID
                    </label>
                    <input
                      type="number"
                      value={formData.articleId}
                      onChange={(e) => setFormData({ ...formData, articleId: e.target.value })}
                      className="w-full p-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-neutral-800 text-neutral-100 placeholder-neutral-500"
                      placeholder="Enter article ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      New Walrus Hash
                    </label>
                    <input
                      type="text"
                      value={formData.walrusHash}
                      onChange={(e) => setFormData({ ...formData, walrusHash: e.target.value })}
                      className="w-full p-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-neutral-800 text-neutral-100 placeholder-neutral-500"
                      placeholder="Enter new Walrus storage hash"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      New Metadata (JSON)
                    </label>
                    <textarea
                      value={formData.metadata}
                      onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                      className="w-full p-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-neutral-800 text-neutral-100 placeholder-neutral-500"
                      rows={4}
                      placeholder='{"title": "Updated Title", "description": "Updated description"}'
                    />
                  </div>
                  <button
                    onClick={updateArticle}
                    disabled={loading || wrongNetwork}
                    title={wrongNetwork ? 'Please switch to the Sepolia testnet to enable this action.' : ''}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Article'}
                  </button>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Article ID
                    </label>
                    <input
                      type="number"
                      value={formData.articleId}
                      onChange={(e) => setFormData({ ...formData, articleId: e.target.value })}
                      className="w-full p-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-neutral-800 text-neutral-100 placeholder-neutral-500"
                      placeholder="Enter article ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Media Hash
                    </label>
                    <input
                      type="text"
                      value={formData.mediaHash}
                      onChange={(e) => setFormData({ ...formData, mediaHash: e.target.value })}
                      className="w-full p-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-neutral-800 text-neutral-100 placeholder-neutral-500"
                      placeholder="Enter Walrus media hash"
                    />
                  </div>
                  <button
                    onClick={attachMedia}
                    disabled={loading || wrongNetwork}
                    title={wrongNetwork ? 'Please switch to the Sepolia testnet to enable this action.' : ''}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Attaching...' : 'Attach Media'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-neutral-900 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-neutral-100 mb-6">Articles</h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-neutral-400">Loading articles...</p>
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-neutral-600 mb-4" />
                  <p className="text-neutral-400">No articles found. Create your first article!</p>
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
            <div className="bg-neutral-900 rounded-lg shadow-lg p-8 max-w-2xl w-full relative">
              <button className="absolute top-2 right-2 text-neutral-400 hover:text-white" onClick={() => setModalOpen(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-neutral-100">{modalTitle}</h2>
              <pre className="whitespace-pre-wrap text-neutral-200 overflow-x-auto max-h-[60vh]">{modalContent}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleManagerFrontend;

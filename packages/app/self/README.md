# TrueCase - Decentralized News Platform

A decentralized news platform that combines identity verification with blockchain technology to ensure trustworthy, fact-checked journalism and combat misinformation.

## 🚀 Features

- **Identity Verification**: Secure identity verification through Self Protocol
- **Decentralized Storage**: Articles stored on Walrus Protocol for content integrity
- **Fact Checking**: Community-driven fact-checking with reputation systems
- **Blockchain Integration**: Ethereum-based smart contracts for transparency
- **Multi-Page Application**: Well-structured Next.js application with proper routing

## 📁 Project Structure

```
app/self/
├── app/
│   ├── components/
│   │   └── Navigation.tsx          # Global navigation component
│   ├── contexts/
│   │   └── AuthContext.tsx         # Authentication context provider
│   ├── articles/
│   │   └── page.tsx                # Articles feed and management
│   ├── verify/
│   │   └── page.tsx                # Identity verification page
│   ├── api/
│   │   └── verify/
│   │       └── route.ts            # API routes
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout with providers
│   └── page.tsx                    # Landing page
├── middleware.ts                   # Next.js middleware for routing
├── package.json                    # Dependencies and scripts
├── tailwind.config.ts             # Tailwind CSS configuration
└── README.md                       # This file
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: Ethereum (Sepolia testnet)
- **Identity**: Self Protocol
- **Storage**: Walrus Protocol
- **Smart Contracts**: Solidity with Hardhat
- **State Management**: React Context API

## 🏗️ Architecture

### Pages

1. **Landing Page (`/`)**: 
   - Explains the platform's purpose and features
   - Call-to-action to get started
   - No authentication required

2. **Verification Page (`/verify`)**:
   - Requires wallet connection
   - Self Protocol QR code for identity verification
   - Profile data submission
   - Redirects to articles after verification

3. **Articles Page (`/articles`)**:
   - Requires wallet connection AND verification
   - Browse, create, update, and manage articles
   - Walrus Protocol integration for file storage
   - Article management with smart contracts

### Authentication Flow

1. **Wallet Connection**: Users must connect their Web3 wallet
2. **Identity Verification**: Users complete Self Protocol verification
3. **Profile Registration**: Users submit profile data to smart contract
4. **Access Control**: Only verified users can access articles

### Smart Contracts

- **UserRegistry**: Manages user verification and profile data
- **ArticleManager**: Handles article creation, updates, and metadata
- **ProofOfHuman**: Integrates with Self Protocol for identity verification

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd app/self
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_SELF_APP_NAME="TrueCase Identity Verification"
   NEXT_PUBLIC_SELF_SCOPE="truecase-verification"
   NEXT_PUBLIC_SELF_ENDPOINT="your-self-endpoint"
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

### Usage

1. **Connect Wallet**: Click "Connect Wallet" on the landing page
2. **Verify Identity**: Navigate to `/verify` and complete Self Protocol verification
3. **Access Articles**: Once verified, access the articles feed at `/articles`
4. **Create Content**: Upload files to Walrus Protocol and create articles
5. **Manage Articles**: Update, attach media, and manage your articles

## 🔧 Configuration

### Smart Contract Addresses

Update contract addresses in the respective files:
- `UserRegistry`: `0xB6E3e75CE2C22527416278278266b14630581a4B`
- `ArticleManager`: `0xD2E9ad1A29cF863E0Ec43362CAAd6a04565dB1d3`
- `ProofOfHuman`: `0x177f725DC00514d37682D6Bde5898b00f1E001c2`

### Walrus Protocol

- **Aggregator**: `https://aggregator.walrus-testnet.walrus.space`
- **Publisher**: `https://publisher.walrus-testnet.walrus.space`

## 🧪 Testing

### Manual Testing

1. **Wallet Connection**: Test with MetaMask on Sepolia testnet
2. **Identity Verification**: Use Self Protocol app for verification
3. **Article Management**: Create, update, and view articles
4. **File Upload**: Test Walrus Protocol integration

### Network Requirements

- **Ethereum Network**: Sepolia testnet (Chain ID: 11155111)
- **RPC URL**: Use Infura or Alchemy Sepolia endpoint
- **Test ETH**: Get from Sepolia faucet

## 🔒 Security

- **Identity Verification**: Self Protocol ensures real user verification
- **Smart Contract Security**: Audited contracts with access controls
- **Decentralized Storage**: Walrus Protocol provides content integrity
- **Privacy**: Minimal data collection, user-controlled identity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the smart contract code

## 🔮 Roadmap

- [ ] Mobile app development
- [ ] Advanced fact-checking algorithms
- [ ] Reputation system improvements
- [ ] Multi-chain support
- [ ] DAO governance integration
- [ ] Advanced content moderation tools

---

**TrueCase** - Building the future of trustworthy, decentralized journalism.

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.brokerService = exports.OFFICIAL_PROVIDERS = void 0;
const ethers_1 = require("ethers");
const _0g_serving_broker_1 = require("@0glabs/0g-serving-broker");
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
// Official 0G providers
exports.OFFICIAL_PROVIDERS = {
    "llama-3.3-70b-instruct": "0xf07240Efa67755B5311bc75784a061eDB47165Dd",
    "deepseek-r1-70b": "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3"
};
dotenv_1.default.config();
class BrokerService {
    constructor() {
        this.wallet = null;
        this.broker = null;
        this.initialized = false;
        this.initPromise = null;
        // Initialize immediately
        this.initPromise = this.initialize();
    }
    async initialize() {
        try {
            const privateKey = process.env.PRIVATE_KEY;
            if (!privateKey) {
                throw new Error('PRIVATE_KEY is required in .env file');
            }
            const provider = new ethers_1.ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
            this.wallet = new ethers_1.ethers.Wallet(privateKey, provider);
            this.broker = await (0, _0g_serving_broker_1.createZGComputeNetworkBroker)(this.wallet);
            this.initialized = true;
            console.log("Broker service initialized successfully with wallet:", this.wallet.address);
        }
        catch (error) {
            console.error("Failed to initialize broker service:", error.message);
            throw error;
        }
    }
    /**
     * Ensures broker is initialized before any operation
     */
    async ensureInitialized() {
        if (!this.initialized && this.initPromise) {
            await this.initPromise;
        }
        if (!this.broker || !this.wallet) {
            throw new Error("Broker service not properly initialized");
        }
    }
    /**
     * Deposit funds to account
     * @param amount Amount to deposit in ETH
     */
    async depositFunds(amount) {
        await this.ensureInitialized();
        try {
            await this.broker.ledger.depositFund(amount);
            return "Deposit successful";
        }
        catch (error) {
            throw new Error(`Failed to deposit funds: ${error.message}`);
        }
    }
    /**
     * Add funds to ledger
     * @param amount Amount to add
     */
    async addFundsToLedger(amount) {
        await this.ensureInitialized();
        try {
            await this.broker.ledger.addLedger(amount);
            return "Funds added to ledger successfully";
        }
        catch (error) {
            throw new Error(`Failed to add funds to ledger: ${error.message}`);
        }
    }
    /**
     * Get current balance
     */
    async getBalance() {
        await this.ensureInitialized();
        try {
            const balanceInfo = await this.broker.ledger.getLedger();
            return balanceInfo;
        }
        catch (error) {
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }
    /**
     * Acknowledge a provider before using their services
     * @param providerAddress Provider address to acknowledge
     */
    async acknowledgeProvider(providerAddress) {
        await this.ensureInitialized();
        try {
            await this.broker.inference.acknowledgeProviderSigner(providerAddress);
            return `Provider ${providerAddress} acknowledged successfully`;
        }
        catch (error) {
            throw new Error(`Failed to acknowledge provider: ${error.message}`);
        }
    }
    /**
     * List available services with enhanced information
     */
    async listServices() {
        await this.ensureInitialized();
        try {
            const services = await this.broker.inference.listService();
            // Enhance services with additional metadata
            return services.map((service) => ({
                ...service,
                inputPriceFormatted: ethers_1.ethers.formatEther(service.inputPrice || 0),
                outputPriceFormatted: ethers_1.ethers.formatEther(service.outputPrice || 0),
                isOfficial: Object.values(exports.OFFICIAL_PROVIDERS).includes(service.provider),
                isVerifiable: service.verifiability === 'TeeML',
                modelName: Object.entries(exports.OFFICIAL_PROVIDERS).find(([_, addr]) => addr === service.provider)?.[0] || 'Unknown'
            }));
        }
        catch (error) {
            throw new Error(`Failed to list services: ${error.message}`);
        }
    }
    /**
     * Manually settle a fee
     * @param providerAddress Provider address
     * @param fee Fee amount
     */
    async settleFee(providerAddress, fee) {
        await this.ensureInitialized();
        try {
            // Note: settleFee API might have changed in current SDK version
            // Using the broker's ledger to settle fee instead
            throw new Error("settleFee method may not be available in current SDK version. Please check the latest SDK documentation.");
        }
        catch (error) {
            throw new Error(`Failed to settle fee: ${error.message}`);
        }
    }
    /**
     * Request refund for unused funds
     * @param amount Amount to refund in ETH
     */
    async requestRefund(amount) {
        await this.ensureInitialized();
        try {
            await this.broker.ledger.retrieveFund("inference", Number(ethers_1.ethers.parseEther(amount.toString())));
            return `Refund of ${amount} ETH requested successfully`;
        }
        catch (error) {
            throw new Error(`Failed to request refund: ${error.message}`);
        }
    }
    /**
     * Send a query to an AI service
     * @param providerAddress Provider address
     * @param query Query text
     * @param fallbackFee Optional fallback fee
     */
    async sendQuery(providerAddress, query, fallbackFee) {
        await this.ensureInitialized();
        try {
            // Get the service metadata
            const { endpoint, model } = await this.broker.inference.getServiceMetadata(providerAddress);
            // Get headers for authentication (single use - generate fresh for each request)
            const headers = await this.broker.inference.getRequestHeaders(providerAddress, query);
            // Create OpenAI client with the service URL
            const openai = new openai_1.default({
                baseURL: endpoint,
                apiKey: "", // Empty string as per docs
            });
            // Prepare headers in the format OpenAI client expects
            const requestHeaders = {};
            Object.entries(headers).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    requestHeaders[key] = value;
                }
            });
            // Make the API request
            const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: query }],
                model, // Use the model from metadata
            }, {
                headers: requestHeaders,
            });
            // Process response
            const content = completion.choices[0].message.content;
            const chatId = completion.id;
            // Process payment - chatId is optional for verifiable services
            try {
                const isValid = await this.broker.inference.processResponse(providerAddress, content || "", chatId);
                return {
                    content,
                    metadata: {
                        model,
                        isValid,
                        provider: providerAddress,
                        chatId,
                    }
                };
            }
            catch (error) {
                // Use fallback fee if provided
                if (fallbackFee && fallbackFee > 0) {
                    await this.settleFee(providerAddress, fallbackFee);
                    return {
                        content,
                        metadata: {
                            model,
                            usedFallbackFee: true,
                            fallbackFeeAmount: fallbackFee,
                            provider: providerAddress,
                        }
                    };
                }
                else {
                    // Enhanced error message for common issues
                    if (error.message.includes('Headers already used')) {
                        throw new Error('Request headers are single-use. This error indicates a system issue - please try again.');
                    }
                    throw new Error(`Payment processing failed: ${error.message}`);
                }
            }
        }
        catch (error) {
            // Enhanced error handling with specific guidance
            if (error.message.includes('Provider not responding')) {
                throw new Error(`Provider ${providerAddress} is not responding. Try using another provider from the service list.`);
            }
            if (error.message.includes('Insufficient balance')) {
                throw new Error('Insufficient balance. Please add funds to your account before making requests.');
            }
            throw new Error(`Query failed: ${error.message}`);
        }
    }
}
// Singleton instance
exports.brokerService = new BrokerService();

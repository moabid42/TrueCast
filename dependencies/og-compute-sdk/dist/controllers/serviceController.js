"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeProvider = exports.settleFee = exports.sendQuery = exports.listServices = void 0;
const brokerService_1 = require("../services/brokerService");
/**
 * Helper function to convert BigInt values to strings in an object
 */
const convertBigIntToString = (data) => {
    if (data === null || data === undefined) {
        return data;
    }
    if (typeof data === 'bigint') {
        return data.toString();
    }
    if (Array.isArray(data)) {
        return data.map(item => convertBigIntToString(item));
    }
    if (typeof data === 'object') {
        const result = {};
        for (const key in data) {
            result[key] = convertBigIntToString(data[key]);
        }
        return result;
    }
    return data;
};
/**
 * @swagger
 * /services/list:
 *   get:
 *     summary: List available AI services
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of available services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       model:
 *                         type: string
 *                       provider:
 *                         type: string
 *                       serviceType:
 *                         type: string
 *                       url:
 *                         type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
const listServices = async (req, res) => {
    try {
        const services = await brokerService_1.brokerService.listServices();
        // Convert BigInt values to strings
        const serializedServices = convertBigIntToString(services);
        return res.status(200).json({
            success: true,
            services: serializedServices
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.listServices = listServices;
/**
 * @swagger
 * /services/query:
 *   post:
 *     summary: Send a query to an AI service
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerAddress
 *               - query
 *             properties:
 *               providerAddress:
 *                 type: string
 *                 description: Provider address
 *               query:
 *                 type: string
 *                 description: Query text
 *               fallbackFee:
 *                 type: number
 *                 description: Optional fallback fee
 *     responses:
 *       200:
 *         description: Query response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 response:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                     metadata:
 *                       type: object
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
const sendQuery = async (req, res) => {
    try {
        const { providerAddress, query, fallbackFee } = req.body;
        if (!providerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Provider address is required'
            });
        }
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query text is required'
            });
        }
        let parsedFallbackFee = undefined;
        if (fallbackFee) {
            parsedFallbackFee = Number(fallbackFee);
            if (isNaN(parsedFallbackFee) || parsedFallbackFee <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid fallback fee amount'
                });
            }
        }
        const result = await brokerService_1.brokerService.sendQuery(providerAddress, query, parsedFallbackFee);
        // Convert BigInt values to strings
        const serializedResult = convertBigIntToString(result);
        return res.status(200).json({
            success: true,
            response: serializedResult
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.sendQuery = sendQuery;
/**
 * @swagger
 * /services/settle-fee:
 *   post:
 *     summary: Manually settle a fee, only if the fee is not settled when the query is sent
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerAddress
 *               - fee
 *             properties:
 *               providerAddress:
 *                 type: string
 *                 description: Provider address
 *               fee:
 *                 type: number
 *                 description: Fee amount
 *     responses:
 *       200:
 *         description: Fee settled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
const settleFee = async (req, res) => {
    try {
        const { providerAddress, fee } = req.body;
        if (!providerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Provider address is required'
            });
        }
        if (!fee || isNaN(fee) || fee <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid fee amount is required'
            });
        }
        const result = await brokerService_1.brokerService.settleFee(providerAddress, Number(fee));
        return res.status(200).json({
            success: true,
            message: result
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.settleFee = settleFee;
/**
 * @swagger
 * /services/acknowledge-provider:
 *   post:
 *     summary: Acknowledge a provider before using their services
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerAddress
 *             properties:
 *               providerAddress:
 *                 type: string
 *                 description: Provider address to acknowledge
 *     responses:
 *       200:
 *         description: Provider acknowledged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
const acknowledgeProvider = async (req, res) => {
    try {
        const { providerAddress } = req.body;
        if (!providerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Provider address is required'
            });
        }
        const result = await brokerService_1.brokerService.acknowledgeProvider(providerAddress);
        return res.status(200).json({
            success: true,
            message: result
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.acknowledgeProvider = acknowledgeProvider;

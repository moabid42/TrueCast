"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestRefund = exports.getAccountInfo = exports.deposit = void 0;
const brokerService_1 = require("../services/brokerService");
/**
 * @swagger
 * /account/deposit:
 *   post:
 *     summary: Deposit funds to account
 *     tags: [Account]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to deposit in ETH
 *     responses:
 *       200:
 *         description: Deposit successful
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
const deposit = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount required'
            });
        }
        const result = await brokerService_1.brokerService.depositFunds(Number(amount));
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
exports.deposit = deposit;
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
 * /account/info:
 *   get:
 *     summary: Get account information
 *     tags: [Account]
 *     description: Retrieve account information including ledger, infers, and fines
 *     responses:
 *       200:
 *         description: Account information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accountInfo:
 *                   type: object
 *                   description: Account information details
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
const getAccountInfo = async (req, res) => {
    try {
        const balanceInfo = await brokerService_1.brokerService.getBalance();
        console.log(balanceInfo);
        // Convert BigInt values to strings
        const serializedBalanceInfo = convertBigIntToString(balanceInfo);
        return res.status(200).json({
            success: true,
            accountInfo: serializedBalanceInfo
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.getAccountInfo = getAccountInfo;
/**
 * @swagger
 * /account/refund:
 *   post:
 *     summary: Request refund for unused funds
 *     tags: [Account]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to refund in ETH
 *     responses:
 *       200:
 *         description: Refund requested successfully
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
const requestRefund = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount required'
            });
        }
        const result = await brokerService_1.brokerService.requestRefund(Number(amount));
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
exports.requestRefund = requestRefund;

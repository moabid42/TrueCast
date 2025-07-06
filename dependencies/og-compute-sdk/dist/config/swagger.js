"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '0G Compute Network API',
            version: '1.0.0',
            description: 'REST API for interacting with the 0G Compute Network',
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
            contact: {
                name: '0G Labs',
                url: 'https://0g.ai',
            },
        },
        servers: [
            {
                url: '/api',
                description: '0G Compute Network API',
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};
exports.default = (0, swagger_jsdoc_1.default)(options);

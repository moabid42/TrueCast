"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
const dotenv_1 = __importDefault(require("dotenv"));
const startup_1 = require("./startup");
// Import routes
const accountRoutes_1 = __importDefault(require("./routes/accountRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
// Load environment variables
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Apply basic middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API documentation route
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default, {
    explorer: true,
    customSiteTitle: '0G Compute Network API Documentation',
}));
// API routes
const apiPrefix = '/api';
// Register routes
app.use(`${apiPrefix}/account`, accountRoutes_1.default);
app.use(`${apiPrefix}/services`, serviceRoutes_1.default);
// Root route with basic info
app.get('/', (req, res) => {
    res.json({
        name: '0G Compute Network API',
        version: '1.0.0',
        documentation: '/docs',
        endpoints: {
            account: `${apiPrefix}/account`,
            services: `${apiPrefix}/services`,
        }
    });
});
// Simple error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        error: 'Server error',
        message: err.message
    });
});
// Initialize application and start server
const startServer = async () => {
    try {
        // Run initialization tasks
        await (0, startup_1.initializeApplication)();
        // Start the server
        app.listen(PORT, () => {
            console.log(`
  🚀 0G Compute Network API Server running on http://localhost:${PORT}
  📚 API Documentation: http://localhost:${PORT}/docs
      `);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Start the application
startServer();
exports.default = app;

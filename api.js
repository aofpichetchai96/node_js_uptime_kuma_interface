require('dotenv').config();
const express = require('express');
const cors = require('cors');
const UptimeKumaClient = require('./uptime-kuma-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Uptime Kuma configuration
const UPTIME_KUMA_URL = process.env.UPTIME_KUMA_URL || 'http://localhost:3001';
const USERNAME = process.env.UPTIME_KUMA_USER || 'admin';
const PASSWORD = process.env.UPTIME_KUMA_PASS || 'admin123';

// Connection Manager
class ConnectionManager {
    constructor() {
        this.client = null;
        this.isConnecting = false;
        this.isConnected = false;
        this.monitorListCache = null; // Store monitor list in memory
        this.heartbeatCache = {}; // Cache for storing heartbeat data
    }

    async ensureConnection() {
        if (this.isConnected && this.client && this.client.authenticated) {
            return this.client;
        }

        if (this.isConnecting) {
            // Wait until connection is established
            return new Promise((resolve) => {
                const checkConnection = setInterval(() => {
                    if (this.isConnected && this.client && this.client.authenticated) {
                        clearInterval(checkConnection);
                        resolve(this.client);
                    }
                }, 100);
            });
        }

        this.isConnecting = true;

        try {
            this.client = new UptimeKumaClient(UPTIME_KUMA_URL);
            
            await this.client.connect();
            await this.client.login(USERNAME, PASSWORD);
            
            // Listen to heartbeat event (single heartbeat)
            this.client.onHeartbeat((data) => {
                if (data && data.monitorID) {
                    this.heartbeatCache[data.monitorID] = {
                        status: data.status, // 0 = down, 1 = up, 2 = pending
                        time: data.time,
                        ping: data.ping || null
                    };
                }
            });
            
            // Listen to heartbeatList event to cache status in real-time
            this.client.onHeartbeatList((monitorId, data) => {
                if (data && Array.isArray(data) && data.length > 0) {
                    // Store the latest heartbeat (index 0 = latest)
                    const latestHeartbeat = data[0];
                    this.heartbeatCache[monitorId] = {
                        status: latestHeartbeat.status, // 0 = down, 1 = up
                        time: latestHeartbeat.time,
                        ping: latestHeartbeat.ping || null
                    };
                }
            });
            
            // Setup event listeners for disconnection
            this.client.socket.on('disconnect', () => {
                console.log('⚠️  Uptime Kuma connection lost, will reconnect on next request');
                this.isConnected = false;
                this.monitorListCache = null; // Clear cache when disconnected
                this.heartbeatCache = {}; // Clear heartbeat cache when disconnected
            });

            // Listen to 'monitorList' event to update cache
            this.client.socket.on('monitorList', (monitorList) => {
                if (monitorList && typeof monitorList === 'object' && !Array.isArray(monitorList)) {
                    this.monitorListCache = monitorList;
                    console.log(`📋 Monitor list cache updated: ${Object.keys(monitorList).length} monitors`);
                }
            });

            // Start by fetching monitor list initially
            try {
                const initialList = await this.client.getMonitorList();
                if (initialList && typeof initialList === 'object') {
                    this.monitorListCache = initialList;
                    console.log(`📋 Initial monitor list cached: ${Object.keys(initialList).length} monitors`);
                }
            } catch (error) {
                console.warn('⚠️  Could not fetch initial monitor list:', error.message);
            }

            this.isConnected = true;
            console.log('✅ Connected to Uptime Kuma API');
            
            return this.client;
        } catch (error) {
            console.error('❌ Failed to connect to Uptime Kuma:', error.message);
            this.isConnected = false;
            throw error;
        } finally {
            this.isConnecting = false;
        }
    }

    getCachedMonitorList() {
        return this.monitorListCache;
    }

    getCachedHeartbeat(monitorId) {
        return this.heartbeatCache[monitorId] || null;
    }

    getAllCachedHeartbeats() {
        return this.heartbeatCache;
    }

    async reconnect() {
        this.isConnected = false;
        if (this.client) {
            try {
                this.client.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
        }
        return await this.ensureConnection();
    }
}

const connectionManager = new ConnectionManager();

// Helper function to get client
async function getClient() {
    try {
        return await connectionManager.ensureConnection();
    } catch (error) {
        throw new Error(`Connection failed: ${error.message}`);
    }
}

// Error handler middleware
function handleError(error, req, res, next) {
    console.error('❌ API Error:', error.message);
    
    if (error.message.includes('Connection failed') || error.message.includes('Not authenticated')) {
        // Try to reconnect
        connectionManager.reconnect().catch(console.error);
    }

    res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error'
    });
}

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        uptime_kuma_connected: connectionManager.isConnected
    });
});

// GET /api/monitors - Get all monitors
app.get('/api/monitors', async (req, res, next) => {
    try {
        const client = await getClient();
        
        // Try to use cache first
        let monitors = connectionManager.getCachedMonitorList();
        
        if (!monitors || Object.keys(monitors).length === 0) {
            console.log('📡 Cache empty, requesting monitor list...');
            monitors = await client.getMonitorList();
            
            // Update cache
            if (monitors && typeof monitors === 'object' && !Array.isArray(monitors)) {
                connectionManager.monitorListCache = monitors;
            }
        } else {
            console.log('📋 Using cached monitor list');
        }
        
        // Check if monitors is object or array
        let monitorsArray = [];
        
        if (Array.isArray(monitors)) {
            monitorsArray = monitors.map((monitor, index) => ({
                id: monitor.id || index + 1,
                ...monitor
            }));
        } else if (monitors && typeof monitors === 'object') {
            // Convert object to array
            monitorsArray = Object.entries(monitors).map(([id, monitor]) => {
                if (!monitor || typeof monitor !== 'object') {
                    return null;
                }
                return {
                    id: parseInt(id) || id,
                    ...monitor
                };
            }).filter(m => m !== null);
        } else {
            console.warn('⚠️  Unexpected monitors format:', typeof monitors);
            monitorsArray = [];
        }

        console.log(`✅ Returning ${monitorsArray.length} monitors`);

        res.json({
            success: true,
            count: monitorsArray.length,
            data: monitorsArray
        });
    } catch (error) {
        console.error('❌ Error getting monitors:', error.message);
        next(error);
    }
});

// GET /api/monitors/status - Get all monitors status (up = true, down = false)
app.get('/api/monitors/status', async (req, res, next) => {
    try {
        const client = await getClient();
        
        // Try to use cache first
        let monitors = connectionManager.getCachedMonitorList();
        
        if (!monitors || Object.keys(monitors).length === 0) {
            console.log('📡 Cache empty, requesting monitor list...');
            monitors = await client.getMonitorList();
            
            // Update cache
            if (monitors && typeof monitors === 'object' && !Array.isArray(monitors)) {
                connectionManager.monitorListCache = monitors;
            }
        } else {
            console.log('📋 Using cached monitor list for status');
        }
        
        // Convert monitors to status array
        let statusArray = [];
        
        if (monitors && typeof monitors === 'object') {
            statusArray = Object.entries(monitors).map(([id, monitor]) => {
                if (!monitor || typeof monitor !== 'object') {
                    return null;
                }
                
                // Determine status: up = true, down = false (following device.js logic)
                let status = false; // default = false (down/unknown)
                
                // Check status by priority
                if (monitor.active === false || monitor.forceInactive === true) {
                    status = false; // inactive = false
                } else if (monitor.maintenance) {
                    status = false; // maintenance = false
                } else {
                    // Get status from heartbeat cache
                    const heartbeat = connectionManager.heartbeatCache[id];
                    if (heartbeat && typeof heartbeat.status !== 'undefined') {
                        status = heartbeat.status === 1; // 1 = true (up), others = false
                    } else {
                        // If no heartbeat from cache, use weight instead
                        // weight 2000+ = true (up), others = false
                        if (typeof monitor.weight === 'number') {
                            status = monitor.weight >= 2000;
                        } else {
                            status = false;
                        }
                    }
                }
                
                // Get additional heartbeat info if available
                const heartbeat = connectionManager.heartbeatCache[id];
                
                return {
                    id: parseInt(id) || id,
                    name: monitor.name || 'Unknown',
                    status: status, // true = up, false = down
                    lastCheck: heartbeat?.time || null
                };
            }).filter(m => m !== null);
        }

        console.log(`✅ Returning status for ${statusArray.length} monitors`);

        res.json({
            success: true,
            count: statusArray.length,
            data: statusArray
        });
    } catch (error) {
        console.error('❌ Error getting monitors status:', error.message);
        next(error);
    }
});

// GET /api/monitors/:id - Get monitor by ID
app.get('/api/monitors/:id', async (req, res, next) => {
    try {
        const monitorId = parseInt(req.params.id);
        
        if (isNaN(monitorId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid monitor ID'
            });
        }

        const client = await getClient();
        const monitor = await client.getMonitor(monitorId);

        res.json({
            success: true,
            data: {
                id: monitorId,
                ...monitor
            }
        });
    } catch (error) {
        if (error.message.includes('Failed to get monitor')) {
            return res.status(404).json({
                success: false,
                error: 'Monitor not found'
            });
        }
        next(error);
    }
});

// POST /api/monitors - Create new monitor
app.post('/api/monitors', async (req, res, next) => {
    try {
        const monitorData = req.body;

        // Validate required fields
        if (!monitorData.type || !monitorData.name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: type and name are required'
            });
        }

        // Validate type-specific required fields
        if (monitorData.type === 'port') {
            if (!monitorData.hostname) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required field for port monitor: hostname is required'
                });
            }
            if (!monitorData.port) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required field for port monitor: port is required'
                });
            }
        } else if (monitorData.type === 'http' || monitorData.type === 'https') {
            if (!monitorData.url) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required field for http/https monitor: url is required'
                });
            }
        }

        // Set default values
        if (!monitorData.conditions) {
            monitorData.conditions = [];
        }
        if (monitorData.active === undefined) {
            monitorData.active = true;
        }
        if (!monitorData.interval) {
            monitorData.interval = 60;
        }
        if (!monitorData.maxretries) {
            monitorData.maxretries = 3;
        }
        
        // Ensure notificationIDList exists (required for Uptime Kuma 2.0+)
        if (!monitorData.notificationIDList) {
            monitorData.notificationIDList = [];
        }

        const client = await getClient();
        const result = await client.addMonitor(monitorData);

        // Clear cache to keep data up-to-date
        connectionManager.monitorListCache = null;

        res.status(201).json({
            success: true,
            message: 'Monitor created successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/monitors/:id - Edit monitor
app.put('/api/monitors/:id', async (req, res, next) => {
    try {
        const monitorId = parseInt(req.params.id);
        
        if (isNaN(monitorId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid monitor ID'
            });
        }

        const monitorData = req.body;
        monitorData.id = monitorId;

        const client = await getClient();
        const result = await client.editMonitor(monitorData);

        // Clear cache to keep data up-to-date
        connectionManager.monitorListCache = null;

        res.json({
            success: true,
            message: 'Monitor updated successfully',
            data: result
        });
    } catch (error) {
        if (error.message.includes('Failed to update monitor')) {
            return res.status(404).json({
                success: false,
                error: 'Monitor not found or update failed'
            });
        }
        next(error);
    }
});

// DELETE /api/monitors/:id - Delete monitor
app.delete('/api/monitors/:id', async (req, res, next) => {
    try {
        const monitorId = parseInt(req.params.id);
        
        if (isNaN(monitorId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid monitor ID'
            });
        }

        const client = await getClient();
        await client.deleteMonitor(monitorId);

        // Clear cache to keep data up-to-date
        connectionManager.monitorListCache = null;

        res.json({
            success: true,
            message: 'Monitor deleted successfully'
        });
    } catch (error) {
        if (error.message.includes('Failed to delete monitor')) {
            return res.status(404).json({
                success: false,
                error: 'Monitor not found or delete failed'
            });
        }
        next(error);
    }
});

// GET /api/monitors/:id/status - Get monitor status (up = true, down = false)
app.get('/api/monitors/:id/status', async (req, res, next) => {
    try {
        const monitorId = parseInt(req.params.id);
        
        if (isNaN(monitorId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid monitor ID'
            });
        }

        const client = await getClient();
        
        // Try to get from cache first
        let monitors = connectionManager.getCachedMonitorList();
        let monitor = null;
        
        if (monitors && monitors[monitorId]) {
            monitor = monitors[monitorId];
        } else {
            // If not in cache, fetch from server
            monitor = await client.getMonitor(monitorId);
        }

        // Determine status: up = true, down = false (following device.js logic)
        let status = false; // default = false (down/unknown)
        
        if (monitor) {
            // Check status by priority
            if (monitor.active === false || monitor.forceInactive === true) {
                status = false; // inactive = false
            } else if (monitor.maintenance) {
                status = false; // maintenance = false
            } else {
                // Get status from heartbeat cache
                const heartbeat = connectionManager.heartbeatCache[monitorId];
                if (heartbeat && typeof heartbeat.status !== 'undefined') {
                    status = heartbeat.status === 1; // 1 = true (up), others = false
                } else {
                    // If no heartbeat from cache, use weight instead
                    // weight 2000+ = true (up), others = false
                    if (typeof monitor.weight === 'number') {
                        status = monitor.weight >= 2000;
                    } else {
                        status = false;
                    }
                }
            }
        }

        // Get additional heartbeat info if available
        const heartbeat = connectionManager.heartbeatCache[monitorId];
        
        res.json({
            success: true,
            data: {
                id: monitorId,
                name: monitor?.name || 'Unknown',
                status: status, // true = up, false = down
                lastCheck: heartbeat?.time || null
            }
        });
    } catch (error) {
        if (error.message.includes('Failed to get monitor')) {
            return res.status(404).json({
                success: false,
                error: 'Monitor not found'
            });
        }
        next(error);
    }
});

// POST /api/monitors/:id/pause - Pause monitor
app.post('/api/monitors/:id/pause', async (req, res, next) => {
    try {
        const monitorId = parseInt(req.params.id);
        
        if (isNaN(monitorId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid monitor ID'
            });
        }

        const client = await getClient();
        await client.pauseMonitor(monitorId);

        res.json({
            success: true,
            message: 'Monitor paused successfully'
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/monitors/:id/resume - Resume monitor
app.post('/api/monitors/:id/resume', async (req, res, next) => {
    try {
        const monitorId = parseInt(req.params.id);
        
        if (isNaN(monitorId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid monitor ID'
            });
        }

        const client = await getClient();
        await client.resumeMonitor(monitorId);

        res.json({
            success: true,
            message: 'Monitor resumed successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Error handling middleware (must be at the end)
app.use(handleError);

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📡 Connecting to Uptime Kuma at ${UPTIME_KUMA_URL}`);
    
    // Connect to Uptime Kuma on startup
    try {
        await connectionManager.ensureConnection();
    } catch (error) {
        console.error('⚠️  Failed to connect on startup, will retry on first request');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    if (connectionManager.client) {
        connectionManager.client.disconnect();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down gracefully...');
    if (connectionManager.client) {
        connectionManager.client.disconnect();
    }
    process.exit(0);
});

module.exports = app;


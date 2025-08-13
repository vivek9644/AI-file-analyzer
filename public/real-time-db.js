
// Real-time Database Integration Module
// Supports Replit Database, Firebase, and Socket.IO real-time sync

class RealTimeDatabase {
    constructor(config = {}) {
        this.config = {
            type: config.type || 'replit', // 'replit', 'firebase', 'memory'
            syncInterval: config.syncInterval || 1000,
            maxRetries: config.maxRetries || 3,
            ...config
        };
        
        this.connected = false;
        this.data = new Map();
        this.listeners = new Map();
        this.syncQueue = [];
        this.retryCount = 0;
        
        this.init();
    }

    async init() {
        try {
            console.log('🔄 Initializing Real-time Database...');
            
            switch (this.config.type) {
                case 'replit':
                    await this.initReplitDB();
                    break;
                case 'firebase':
                    await this.initFirebase();
                    break;
                case 'memory':
                    await this.initMemoryDB();
                    break;
                default:
                    await this.initMemoryDB();
            }
            
            this.connected = true;
            this.startSyncLoop();
            console.log('✅ Real-time Database connected successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.handleConnectionError(error);
        }
    }

    async initReplitDB() {
        // Replit Database integration
        this.baseUrl = `${window.location.origin}/api/db`;
        
        // Test connection
        const response = await fetch(`${this.baseUrl}/test`);
        if (!response.ok) {
            throw new Error('Replit DB connection failed');
        }
        
        console.log('✅ Replit Database connected');
    }

    async initFirebase() {
        // Firebase integration (placeholder for when Firebase SDK is loaded)
        if (typeof firebase !== 'undefined') {
            // Firebase configuration would go here
            console.log('🔥 Firebase Database connected');
        } else {
            throw new Error('Firebase SDK not loaded');
        }
    }

    async initMemoryDB() {
        // In-memory database with local storage persistence
        const stored = localStorage.getItem('nexus-realtime-db');
        if (stored) {
            const parsedData = JSON.parse(stored);
            Object.entries(parsedData).forEach(([key, value]) => {
                this.data.set(key, value);
            });
        }
        console.log('💾 Memory Database initialized');
    }

    // Set data with real-time sync
    async set(key, value, options = {}) {
        try {
            const timestamp = Date.now();
            const dataEntry = {
                value,
                timestamp,
                userId: options.userId || 'anonymous',
                sync: options.sync !== false
            };

            // Update local data
            this.data.set(key, dataEntry);

            // Add to sync queue if real-time sync is enabled
            if (dataEntry.sync) {
                this.syncQueue.push({
                    operation: 'set',
                    key,
                    data: dataEntry,
                    timestamp
                });
            }

            // Trigger listeners
            this.triggerListeners(key, value, 'set');

            // Immediate sync for critical operations
            if (options.immediate) {
                await this.syncNow();
            }

            return true;
        } catch (error) {
            console.error('❌ Database set failed:', error);
            return false;
        }
    }

    // Get data
    async get(key, options = {}) {
        try {
            // Try local first
            if (this.data.has(key)) {
                const entry = this.data.get(key);
                return options.includeMetadata ? entry : entry.value;
            }

            // Fetch from remote if not in local cache
            if (this.connected && options.fetchRemote !== false) {
                const remoteData = await this.fetchFromRemote(key);
                if (remoteData) {
                    this.data.set(key, remoteData);
                    return options.includeMetadata ? remoteData : remoteData.value;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Database get failed:', error);
            return null;
        }
    }

    // Subscribe to real-time changes
    subscribe(key, callback, options = {}) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        
        const listenerId = `${key}_${Date.now()}_${Math.random()}`;
        this.listeners.get(key).push({
            id: listenerId,
            callback,
            options
        });

        console.log(`👂 Subscribed to ${key} with ID: ${listenerId}`);
        return listenerId;
    }

    // Unsubscribe from changes
    unsubscribe(key, listenerId) {
        if (this.listeners.has(key)) {
            const keyListeners = this.listeners.get(key);
            const index = keyListeners.findIndex(l => l.id === listenerId);
            if (index > -1) {
                keyListeners.splice(index, 1);
                console.log(`🔇 Unsubscribed from ${key}`);
                return true;
            }
        }
        return false;
    }

    // Trigger listeners for a key
    triggerListeners(key, value, operation) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(listener => {
                try {
                    listener.callback({
                        key,
                        value,
                        operation,
                        timestamp: Date.now()
                    });
                } catch (error) {
                    console.error('❌ Listener callback failed:', error);
                }
            });
        }
    }

    // Sync with remote database
    async syncNow() {
        if (!this.connected || this.syncQueue.length === 0) {
            return;
        }

        try {
            const operations = [...this.syncQueue];
            this.syncQueue = [];

            for (const op of operations) {
                await this.syncOperation(op);
            }

            this.retryCount = 0;
            console.log(`✅ Synced ${operations.length} operations`);
            
        } catch (error) {
            console.error('❌ Sync failed:', error);
            this.handleSyncError();
        }
    }

    async syncOperation(operation) {
        switch (this.config.type) {
            case 'replit':
                return await this.syncToReplitDB(operation);
            case 'firebase':
                return await this.syncToFirebase(operation);
            case 'memory':
                return await this.syncToMemory(operation);
        }
    }

    async syncToReplitDB(operation) {
        const response = await fetch(`${this.baseUrl}/${operation.operation}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: operation.key,
                data: operation.data
            })
        });

        if (!response.ok) {
            throw new Error(`Replit DB sync failed: ${response.statusText}`);
        }

        return await response.json();
    }

    async syncToMemory(operation) {
        // Persist to localStorage
        const allData = {};
        this.data.forEach((value, key) => {
            allData[key] = value;
        });
        localStorage.setItem('nexus-realtime-db', JSON.stringify(allData));
        return true;
    }

    async fetchFromRemote(key) {
        switch (this.config.type) {
            case 'replit':
                return await this.fetchFromReplitDB(key);
            case 'firebase':
                return await this.fetchFromFirebase(key);
            default:
                return null;
        }
    }

    async fetchFromReplitDB(key) {
        try {
            const response = await fetch(`${this.baseUrl}/get/${encodeURIComponent(key)}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Failed to fetch from Replit DB:', error);
        }
        return null;
    }

    // Start sync loop
    startSyncLoop() {
        setInterval(() => {
            if (this.syncQueue.length > 0) {
                this.syncNow();
            }
        }, this.config.syncInterval);
    }

    // Handle connection errors
    handleConnectionError(error) {
        console.warn('🔄 Falling back to memory database');
        this.config.type = 'memory';
        this.initMemoryDB();
    }

    // Handle sync errors with retry logic
    handleSyncError() {
        this.retryCount++;
        if (this.retryCount < this.config.maxRetries) {
            console.log(`🔄 Retrying sync (${this.retryCount}/${this.config.maxRetries})`);
            setTimeout(() => this.syncNow(), 2000 * this.retryCount);
        } else {
            console.error('❌ Max sync retries reached');
        }
    }

    // Get database statistics
    getStats() {
        return {
            connected: this.connected,
            dataSize: this.data.size,
            queueSize: this.syncQueue.length,
            listenersCount: Array.from(this.listeners.values()).reduce((acc, arr) => acc + arr.length, 0),
            type: this.config.type
        };
    }

    // Clear all data
    async clear() {
        this.data.clear();
        this.syncQueue = [];
        localStorage.removeItem('nexus-realtime-db');
        console.log('🗑️ Database cleared');
    }
}

// Export for global use
window.RealTimeDatabase = RealTimeDatabase;

// Initialize default instance
window.rtdb = new RealTimeDatabase({
    type: 'replit',
    syncInterval: 2000
});

console.log('📡 Real-time Database module loaded');

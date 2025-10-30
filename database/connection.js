const mongoose = require('mongoose');

// Database connection manager
class DatabaseConnection {
    constructor() {
        this.isConnected = false;// Connection status set to false initially because not connected yet
    }
    // Connect to MongoDB Atlas
    async connect() {
        if (this.isConnected) {// If already connected, skip connection
            console.log('Database already connected');
            return;
        }

        try {
            const mongoUri = process.env.MONGODB_URI;// Get MongoDB URI from environment variables
            
            // Validate MongoDB URI
            if (!mongoUri) {
                throw new Error('MONGODB_URI environment variable is not set');
            }

            // Connect to MongoDB
            await mongoose.connect(mongoUri, {
                // No options needed for newer versions of mongoose
                // this would normally include useNewUrlParser, useUnifiedTopology, etc.
                //because mongoose 6+ uses these by default
                //but you have this empty due to linter rules that disallow empty objects
            });

            // Set connection status to true
            this.isConnected = true;
            console.log('✅ Connected to MongoDB Atlas');

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            // Listen for disconnection event
            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ MongoDB disconnected');
                this.isConnected = false;
            });

            // Listen for reconnection event
            mongoose.connection.on('reconnected', () => {
                console.log('✅ MongoDB reconnected');
                this.isConnected = true;
            });

        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    // Disconnect from MongoDB
    async disconnect() {
        if (!this.isConnected) {// If not connected, skip disconnection
            return;
        }

        try {
            await mongoose.disconnect();// Disconnect from MongoDB
            this.isConnected = false;
            console.log('📤 Disconnected from MongoDB');
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error.message);
            throw error;
        }
    }

    // Get current connection status
    getConnectionStatus() {
        return {// Return an object with connection details
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        };
    }
}

// Create a singleton instance of DatabaseConnection
const dbConnection = new DatabaseConnection();
// Export the singleton instance
module.exports = dbConnection;
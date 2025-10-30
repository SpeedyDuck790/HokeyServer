const mongoose = require('mongoose');

class DatabaseConnection {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) {
            console.log('Database already connected');
            return;
        }

        try {
            const mongoUri = process.env.MONGODB_URI;
            
            if (!mongoUri) {
                throw new Error('MONGODB_URI environment variable is not set');
            }

            await mongoose.connect(mongoUri, {
                // No options needed for newer versions of mongoose
            });

            this.isConnected = true;
            console.log('✅ Connected to MongoDB Atlas');

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ MongoDB disconnected');
                this.isConnected = false;
            });

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

    async disconnect() {
        if (!this.isConnected) {
            return;
        }

        try {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('📤 Disconnected from MongoDB');
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error.message);
            throw error;
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        };
    }
}

// Create a singleton instance
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;
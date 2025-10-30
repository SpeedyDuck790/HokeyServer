const roomService = require('../services/roomService');

// Room controller handles HTTP requests for room operations
class RoomController {
    /**
     * Get all public rooms
     * GET /api/rooms
     */
    async getRooms(req, res) {
        try {
            const rooms = await roomService.getAllPublicRooms();
            res.json({
                success: true,
                rooms: rooms
            });
        } catch (error) {
            console.error('Error fetching rooms:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch rooms'
            });
        }
    }

    /**
     * Get a specific room by name
     * GET /api/rooms/:roomName
     */
    async getRoom(req, res) {
        try {
            const { roomName } = req.params;
            const room = await roomService.getRoomByName(roomName);
            res.json({
                success: true,
                room: room
            });
        } catch (error) {
            console.error('Error fetching room:', error.message);
            res.status(404).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Create a new room
     * POST /api/rooms
     * Body: { name, description, createdBy, isPublic, maxUsers, password, persistMessages }
     */
    async createRoom(req, res) {
        try {
            const { name, description, createdBy, isPublic, maxUsers, password, persistMessages } = req.body;
            
            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Room name is required'
                });
            }

            const room = await roomService.createRoom({
                name,
                description,
                createdBy,
                isPublic,
                maxUsers,
                password,
                persistMessages
            });

            res.status(201).json({
                success: true,
                room: room
            });
        } catch (error) {
            console.error('Error creating room:', error.message);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update a room
     * PUT /api/rooms/:roomName
     * Body: { description, isPublic, maxUsers }
     */
    async updateRoom(req, res) {
        try {
            const { roomName } = req.params;
            const updateData = req.body;

            const room = await roomService.updateRoom(roomName, updateData);
            
            res.json({
                success: true,
                room: room
            });
        } catch (error) {
            console.error('Error updating room:', error.message);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Delete a room
     * DELETE /api/rooms/:roomName
     */
    async deleteRoom(req, res) {
        try {
            const { roomName } = req.params;
            await roomService.deleteRoom(roomName);
            
            res.json({
                success: true,
                message: `Room ${roomName} deleted successfully`
            });
        } catch (error) {
            console.error('Error deleting room:', error.message);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}

// Export a singleton instance
module.exports = new RoomController();

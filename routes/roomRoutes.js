const express = require('express');
const { getAllRooms, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const router = express.Router();

// Public route to get all rooms
router.get('/', getAllRooms);

// Admin routes
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

module.exports = router;

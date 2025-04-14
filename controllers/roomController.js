const Room = require('../models/Room');

// Get all rooms (Public)
const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find(); // Fetch all rooms from DB
    res.status(200).json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create a new room (Admin only)
const createRoom = async (req, res) => {
  const {
    name,
    description,
    price,
    available,
    images,
    roomType,
    capacity,
    amenities,
    floorLevel,
    bedType,
  } = req.body;

  try {
    const newRoom = new Room({
      name,
      description,
      price,
      available,
      images,
      roomType,
      capacity,
      amenities,
      floorLevel,
      bedType,
    });

    await newRoom.save();
    res.status(201).json({ message: 'Room added successfully', room: newRoom });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update an existing room (Admin only)
const updateRoom = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    available,
    images,
    roomType,
    capacity,
    amenities,
    floorLevel,
    bedType,
  } = req.body;

  try {
    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      {
        name,
        description,
        price,
        available,
        images,
        roomType,
        capacity,
        amenities,
        floorLevel,
        bedType,
      },
      { new: true }
    );

    if (!updatedRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json({ message: 'Room updated successfully', room: updatedRoom });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// Delete a room (Admin only)
const deleteRoom = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedRoom = await Room.findByIdAndDelete(id);

    if (!deletedRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAllRooms, createRoom, updateRoom, deleteRoom };

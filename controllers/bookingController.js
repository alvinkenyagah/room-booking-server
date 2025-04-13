const Booking = require('../models/Booking');
const Room = require('../models/Room'); // Assuming you have a Room model

// Create a new booking
const createBooking = async (req, res) => {
  const { roomId, checkInDate, checkOutDate } = req.body;

  try {
    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    if (checkIn >= checkOut) {
      return res.status(400).json({ 
        message: 'Check-out date must be after check-in date' 
      });
    }
    
    if (checkIn < new Date()) {
      return res.status(400).json({ 
        message: 'Cannot book in the past' 
      });
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if room is available for the requested dates
    const conflictingBookings = await Booking.find({
      room: roomId,
      status: 'confirmed', // Only check against confirmed bookings
      $or: [
        // Check if requested dates overlap with existing bookings
        { 
          checkInDate: { $lt: checkOutDate },
          checkOutDate: { $gt: checkInDate }
        }
      ]
    });

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ 
        message: 'Room is not available for the selected dates',
        conflicts: conflictingBookings
      });
    }

    // Create the booking
    const booking = new Booking({
      user: req.user.id,
      room: roomId,
      checkInDate,
      checkOutDate,
      status: 'pending',
    });

    await booking.save();
    
    // Populate room details for response
    await booking.populate('room');
    
    res.status(201).json(booking);
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get bookings for a user
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('room')
      .populate('user', 'email name'); // Only include email and name fields
    
    res.status(200).json(bookings);
  } catch (err) {
    console.error('Get user bookings error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// Cancel a booking
const cancelBooking = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'cancelled';
    await booking.save();
    res.status(200).json({ message: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// Get all bookings (admin only)
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('room')
      .populate('user', 'email name')
      .sort({ createdAt: -1 }); // Sort by latest first
    
    res.status(200).json(bookings);
  } catch (err) {
    console.error('Get all bookings error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Admin approves a booking
const approveBooking = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await Booking.findById(bookingId).populate('room');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Booking is not in a pending state' });
    }

    // Check if room is still available for these dates before confirming
    const conflictingBookings = await Booking.find({
      _id: { $ne: bookingId }, // Exclude current booking
      room: booking.room._id,
      status: 'confirmed',
      $or: [
        { 
          checkInDate: { $lt: booking.checkOutDate },
          checkOutDate: { $gt: booking.checkInDate }
        }
      ]
    });

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ 
        message: 'Room is no longer available for these dates',
        conflicts: conflictingBookings
      });
    }

    booking.status = 'confirmed';
    await booking.save();
    
    // Populate user and room details
    await booking.populate('user');
    
    res.status(200).json({ message: 'Booking confirmed successfully', booking });
  } catch (err) {
    console.error('Approve booking error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Admin reject a booking
const rejectBooking = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await Booking.findById(bookingId).populate('room');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Booking is not in a pending state' });
    }

    // Check if room is still available for these dates before confirming
    const conflictingBookings = await Booking.find({
      _id: { $ne: bookingId }, // Exclude current booking
      room: booking.room._id,
      status: 'confirmed',
      $or: [
        { 
          checkInDate: { $lt: booking.checkOutDate },
          checkOutDate: { $gt: booking.checkInDate }
        }
      ]
    });

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ 
        message: 'Room is no longer available for these dates',
        conflicts: conflictingBookings
      });
    }

    booking.status = 'rejected';
    await booking.save();
    
    // Populate user and room details
    await booking.populate('user');
    
    res.status(200).json({ message: 'Booking rejected successfully', booking });
  } catch (err) {
    console.error('Reject booking error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a booking (for both admin and user)
const deleteBooking = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Security check: Only allow users to delete their own bookings
    // Admins can delete any booking (this assumes req.user has isAdmin property)
    if (!req.user.isAdmin && booking.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Access denied. You can only delete your own bookings.' 
      });
    }

    // Check if booking can be deleted (e.g., not allowing deletion of active bookings)
    const currentDate = new Date();
    const checkInDate = new Date(booking.checkInDate);
    
    // Don't allow deletion of bookings that are confirmed and already started
    if (booking.status === 'confirmed' && checkInDate <= currentDate) {
      return res.status(400).json({ 
        message: 'Cannot delete an active or completed booking' 
      });
    }

    // Perform the actual deletion
    await Booking.findByIdAndDelete(bookingId);
    
    res.status(200).json({ 
      message: 'Booking deleted successfully',
      deletedBookingId: bookingId
    });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getAllBookings,
  cancelBooking,
  approveBooking,
  rejectBooking,
  deleteBooking
};
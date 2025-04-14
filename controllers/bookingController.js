const Booking = require('../models/Booking');
const Room = require('../models/Room'); 

// Helper function to combine date and time
function combineDateAndTime(dateStr, timeStr) {
  const date = new Date(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Calculate duration in days between two dates (including partial days)
function calculateDurationInDays(checkIn, checkOut) {
  // Calculate duration in milliseconds
  const durationMs = checkOut.getTime() - checkIn.getTime();
  // Convert to days (can be fractional for partial days)
  return durationMs / (1000 * 60 * 60 * 24);
}

// Create a new booking
const createBooking = async (req, res) => {
  const { 
    roomId, 
    checkInDate, 
    checkInTime = '14:00', // Default check-in time (2 PM)
    checkOutDate, 
    checkOutTime = '11:00'  // Default check-out time (11 AM)
  } = req.body;

  try {
    // Combine date and time
    const checkIn = combineDateAndTime(checkInDate, checkInTime);
    const checkOut = combineDateAndTime(checkOutDate, checkOutTime);
    
    // Validate dates
    if (checkIn >= checkOut) {
      return res.status(400).json({ 
        message: 'Check-out date/time must be after check-in date/time' 
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
          checkInDate: { $lt: checkOut },
          checkOutDate: { $gt: checkIn }
        }
      ]
    });

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ 
        message: 'Room is not available for the selected dates/times',
        conflicts: conflictingBookings
      });
    }

    // Calculate duration and total cost
    const durationInDays = calculateDurationInDays(checkIn, checkOut);
    const totalCost = durationInDays * room.price;

    // Create the booking
    const booking = new Booking({
      user: req.user.id,
      room: roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      status: 'pending',
      totalCost: totalCost
    });

    await booking.save();
    
    // Populate room details for response
    await booking.populate('room');
    
    res.status(201).json({
      ...booking.toJSON(),
      durationInDays,
      roomPrice: room.price
    });
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
    
    // Add duration calculation to each booking
    const bookingsWithDuration = bookings.map(booking => {
      const durationInDays = calculateDurationInDays(
        new Date(booking.checkInDate), 
        new Date(booking.checkOutDate)
      );
      return {
        ...booking.toJSON(),
        durationInDays
      };
    });
    
    res.status(200).json(bookingsWithDuration);
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
    
    // Add duration calculation
    const durationInDays = calculateDurationInDays(
      new Date(booking.checkInDate), 
      new Date(booking.checkOutDate)
    );
    
    res.status(200).json({ 
      message: 'Booking cancelled', 
      booking: {
        ...booking.toJSON(),
        durationInDays
      }
    });
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
    
    // Add duration calculation to each booking
    const bookingsWithDuration = bookings.map(booking => {
      const durationInDays = calculateDurationInDays(
        new Date(booking.checkInDate), 
        new Date(booking.checkOutDate)
      );
      return {
        ...booking.toJSON(),
        durationInDays
      };
    });
    
    res.status(200).json(bookingsWithDuration);
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
    
    // Add duration calculation
    const durationInDays = calculateDurationInDays(
      new Date(booking.checkInDate), 
      new Date(booking.checkOutDate)
    );
    
    res.status(200).json({ 
      message: 'Booking confirmed successfully', 
      booking: {
        ...booking.toJSON(),
        durationInDays
      }
    });
  } catch (err) {
    console.error('Approve booking error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Admin rejects a booking
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

    booking.status = 'rejected';
    await booking.save();
    
    // Populate user and room details
    await booking.populate('user');
    
    // Add duration calculation
    const durationInDays = calculateDurationInDays(
      new Date(booking.checkInDate), 
      new Date(booking.checkOutDate)
    );
    
    res.status(200).json({ 
      message: 'Booking rejected successfully', 
      booking: {
        ...booking.toJSON(),
        durationInDays
      }
    });
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

    // Get booking details before deletion for the response
    const bookingDetails = {
      ...booking.toJSON(),
      durationInDays: calculateDurationInDays(
        new Date(booking.checkInDate), 
        new Date(booking.checkOutDate)
      )
    };

    // Perform the actual deletion
    await Booking.findByIdAndDelete(bookingId);
    
    res.status(200).json({ 
      message: 'Booking deleted successfully',
      deletedBooking: bookingDetails
    });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Calculate booking cost (without creating a booking)
const calculateBookingCost = async (req, res) => {
  const { 
    roomId, 
    checkInDate, 
    checkInTime = '14:00',  // Default check-in time 
    checkOutDate, 
    checkOutTime = '11:00'  // Default check-out time
  } = req.body;
  
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    const checkIn = combineDateAndTime(checkInDate, checkInTime);
    const checkOut = combineDateAndTime(checkOutDate, checkOutTime);
    
    if (checkIn >= checkOut) {
      return res.status(400).json({ 
        message: 'Check-out date/time must be after check-in date/time' 
      });
    }
    
    // Calculate duration and cost
    const durationInDays = calculateDurationInDays(checkIn, checkOut);
    const totalCost = durationInDays * room.price;
    
    res.json({
      roomId,
      roomName: room.name,
      roomPrice: room.price,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      durationInDays,
      totalCost
    });
  } catch (err) {
    console.error('Error calculating booking cost:', err);
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
  deleteBooking,
  calculateBookingCost
};
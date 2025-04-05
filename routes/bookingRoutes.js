// const express = require('express');
// const router = express.Router();
// const { createBooking, getUserBookings, cancelBooking, approveBooking } = require('../controllers/bookingController');
// const { isAdmin } = require('../middleware/authMiddleware');  // Ensure that the user is an admin

// // Routes for bookings
// router.post('/', createBooking);  // Create a new booking
// router.get('/user/bookings', getUserBookings);  // Get all bookings for the authenticated user
// router.delete('/cancel/:bookingId', cancelBooking);  // Cancel a booking
// router.put('/approve/:bookingId', isAdmin, approveBooking);  // Admin approves the booking

// module.exports = router;


const express = require('express');
const router = express.Router();
const { 
  createBooking, 
  getUserBookings, 
  getAllBookings,
  cancelBooking, 
  approveBooking 
} = require('../controllers/bookingController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// All routes should be protected with authentication
router.use(protect);

// Regular user routes
router.post('/', createBooking);  // Create a new booking
router.get('/user', getUserBookings);  // Get all bookings for the authenticated user
router.delete('/cancel/:bookingId', cancelBooking);  // Cancel a booking

// Admin routes
router.get('/all', isAdmin, getAllBookings);  // Admin gets all bookings
router.put('/approve/:bookingId', isAdmin, approveBooking);  // Admin approves the booking

module.exports = router;
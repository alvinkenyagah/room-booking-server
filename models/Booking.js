const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Reference to the user who made the booking
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },  // Reference to the room that was booked
  checkInDate: { type: Date, required: true },  // Includes both date and time
  checkOutDate: { type: Date, required: true }, // Includes both date and time
  status: { type: String, enum: ['pending', 'confirmed', 'rejected', 'cancelled'], default: 'pending' },
  totalCost: { type: Number, required: true } // Total cost of booking
}, { timestamps: true });  

// Virtual property for duration calculation
bookingSchema.virtual('durationInDays').get(function() {
  // Calculate duration in milliseconds
  const durationMs = this.checkOutDate.getTime() - this.checkInDate.getTime();
  // Convert to days (can be fractional for partial days)
  return durationMs / (1000 * 60 * 60 * 24);
});

// Method to calculate total cost
bookingSchema.methods.calculateTotalCost = function(roomPrice) {
  // Get duration in days (can be fractional)
  const durationInDays = this.durationInDays;
  
  // Calculate total cost
  this.totalCost = durationInDays * roomPrice;
  
  return this.totalCost;
};

// Make virtuals available when converting to JSON
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);
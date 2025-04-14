const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  available: { type: Boolean, default: true },
  images: [{ type: String }],
  roomType: { type: String, enum: ['Single', 'Double', 'Suite'], required: true },
  capacity: { type: Number, required: true }, // Number of guests it can accommodate
  amenities: [{ type: String }], // Array of amenities like Wi-Fi, TV, etc.
  floorLevel: { type: String, required: true }, // e.g., '1st floor', '2nd floor'
  bedType: { type: String, enum: ['King', 'Queen', 'Twin', 'Sofa Bed'], required: true }
});

module.exports = mongoose.model('Room', roomSchema);

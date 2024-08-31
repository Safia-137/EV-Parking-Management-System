const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  slot: { type: String, required: true },
  cost: { type: Number, required: true }  // Add this field
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const User = require('./models/User');
const Booking = require('./models/Booking');
const app = express();
const QRCode = require('qrcode'); // Add QR code generation
const SerialPort = require('serialport'); // Serial communication
const Readline = require('@serialport/parser-readline');


// Connect to MongoDB
mongoose.connect('mongodb://localhost/parking_management', { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'secret_key',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.set('view engine', 'ejs');

// Example slots for demonstration
const availableSlots = [
  'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'
];

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login', { message: req.flash('error') });
});

app.get('/signup', (req, res) => {
  res.render('signup', { message: req.flash('error') });
});

app.get('/booking', (req, res) => {
  if (!req.session.userId) {
    req.flash('error', 'You must be logged in to book a slot.');
    return res.redirect('/login');
  }

  res.render('booking', { slots: availableSlots, message: req.flash('error') });
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
    await user.save();
    req.flash('success', 'Account created successfully. You can now log in.');
    res.redirect('/login');
  } catch (error) {
    req.flash('error', 'Username already exists.');
    res.redirect('/signup');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await user.comparePassword(password)) {
    req.session.userId = user._id;
    res.redirect('/booking');
  } else {
    req.flash('error', 'Invalid username or password.');
    res.redirect('/login');
  }
});

app.post('/booking', async (req, res) => {
    const { startTime, endTime, slot, chargingHours } = req.body;
    if (!req.session.userId) {
        req.flash('error', 'You must be logged in to book a slot.');
        return res.redirect('/login');
    }
  try {
    // Fetch user
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/login');
    }

    // Check for overlapping bookings
    const bookings = await Booking.find({
      slot: slot,
      $or: [
        { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } }
      ]
    });

    if (bookings.length > 0) {
      req.flash('error', 'The selected slot is already booked during this time.');
      return res.redirect('/booking');
    }

    // Calculate cost
    
    const ratePerHour = 15; // Example rate
    const totalCost = chargingHours * ratePerHour;

    // Create booking
    const booking = new Booking({
      userId: req.session.userId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      slot,
      cost: totalCost
    });

    await booking.save();

    // Update user balance
    user.balance += totalCost;
    await user.save();

    res.render('confirmation', { booking, totalCost });

  } catch (error) {
    console.error('Error processing booking:', error);
    req.flash('error', 'An error occurred while processing your booking.');
    res.redirect('/booking');
  }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

app.get('/qr/:slot', async (req, res) => {
  const { slot } = req.params;
  const qrCodeData = `http://192.168.133.134:3000/verify/${slot}`; // URL to verify slot
  try {
    const qrCode = await QRCode.toDataURL(qrCodeData);
    res.send(`<img src="${qrCode}" alt="QR Code">`);
  } catch (error) {
    res.status(500).send('Error generating QR code.');
  }
});

// Route to handle QR code verification
app.get('/verify/:slot', (req, res) => {
  const { slot } = req.params;
  res.render('verify', { slot, message: req.flash('error') });
});
/*
app.post('/verify/:slot', async (req, res) => {
  const { slot } = req.params;
  const { password } = req.body;

  try {
    // Fetch the current time
    const now = new Date();

    // Find the booking for the given slot that includes the current time
    const booking = await Booking.findOne({
      slot: slot,
      startTime: { $lte: now },
      endTime: { $gte: now }
    });

    if (!booking) {
      req.flash('error', 'No valid booking found for this slot at the current time.');
      return res.redirect(`/verify/${slot}`);
    }

    // Fetch the user who made the booking
    const user = await User.findById(booking.userId);

    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect(`/verify/${slot}`);
    }

    // Verify the password
    user.comparePassword(password, async (err, isMatch) => {
      if (err) {
        console.error('Error verifying password:', err);
        return res.status(500).send('Error verifying password.');
      }

      if (isMatch) {
        // Send command to Arduino to raise the gate
        port.write('RAISE_GATE\n', (err) => {
          if (err) {
            console.error('Error writing to serial port:', err);
            return res.status(500).send('Failed to raise gate.');
          } else {
            res.send('Gate raised. You can now park.');
          }
        });
      } else {
        req.flash('error', 'Invalid password.');
        res.redirect(`/verify/${slot}`);
      }
    });

  } catch (error) {
    console.error('Error during verification:', error);
    res.status(500).send('Error during verification.');
  }
});
*/
app.post('/verify/:slot', async (req, res) => {
  const { slot } = req.params;
  const { password } = req.body;

  try {
    // Define the default password
    const defaultPassword = '123';

    // Check if the provided password matches the default password
    if (password !== defaultPassword) {
      req.flash('error', 'Invalid password.');
      return res.redirect(`/verify/${slot}`);
    }

    // Fetch the current time
    const now = new Date();

    // Find the booking for the given slot that includes the current time
    const booking = await Booking.findOne({
      slot: slot,
      startTime: { $lte: now },
      endTime: { $gte: now }
    });

    if (!booking) {
      req.flash('error', 'No valid booking found for this slot at the current time.');
      return res.redirect(`/verify/${slot}`);
    }

    // Fetch the user who made the booking
    const user = await User.findById(booking.userId);

    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect(`/verify/${slot}`);
    }

    // Send command to Arduino to raise the gate
    port.write('RAISE_GATE\n', (err) => {
      if (err) {
        console.error('Error writing to serial port:', err);
        if (err.message.includes('Serial port not open')) {
          res.send('Verified, but hardware not connected.');
        } else {
          res.status(500).send('Failed to raise gate. Please check the hardware connection.');
        }
      } else {
        res.send('Gate raised. You can now park.');
      }
    });

  } catch (error) {
    console.error('Verified, but hardware not connected.', error);
    res.status(500).send('Verified, but hardware not connected.');
  }
});


app.get('/qr/:slot', async (req, res) => {
  const { slot } = req.params;
  const qrCodeData = `http://192.168.133.134:3000/verify/${slot}`;
  try {
    const qrCode = await QRCode.toDataURL(qrCodeData);
    res.send(`<img src="${qrCode}" alt="QR Code">`);
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).send('Error generating QR code.');
  }
});
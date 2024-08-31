const QRCode = require('qrcode');

// QR code generation route
app.get('/qr/:slot', async (req, res) => {
  const { slot } = req.params;
  const qrCodeData = `http://192.168.29.12:3000/verify/${slot}`; // Use your local IP address
  try {
    const qrCode = await QRCode.toDataURL(qrCodeData);
    res.send(`<img src="${qrCode}" alt="QR Code">`);
  } catch (error) {
    res.status(500).send('Error generating QR code.');
  }
});

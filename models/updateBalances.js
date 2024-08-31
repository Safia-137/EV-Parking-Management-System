const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction'); // Ensure you have this model for transactions

// Connect to MongoDB
mongoose.connect('mongodb://localhost/yourDatabaseName', { useNewUrlParser: true, useUnifiedTopology: true });

async function updateBalances() {
  try {
    // Get all users
    const users = await User.find();

    // Iterate over each user
    for (const user of users) {
      // Calculate total balance for the user
      const transactions = await Transaction.aggregate([
        { $match: { userId: user._id } }, // Match transactions for this user
        { $group: { _id: "$userId", total: { $sum: "$amount" } } } // Sum the transaction amounts
      ]);

      const totalBalance = transactions[0]?.total || 0;

      // Update the user's total_balance
      await User.updateOne(
        { _id: user._id },
        { $set: { total_balance: totalBalance } }
      );
    }
    console.log('Balances updated successfully');
  } catch (error) {
    console.error('Error updating balances:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
  }
}

// Run the script
updateBalances();

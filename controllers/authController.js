const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    const { username, email, password, dob, isAdmin } = req.body;
    console.log("👉 Register request received:", req.body);

    try {
        console.log("🔍 Checking if user exists...");
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });

        if (existingUser) {
            console.log("⚠️ Username or Email already exists");
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Check if an admin already exists
        if (isAdmin) {
            const existingAdmin = await User.findOne({ isAdmin: true });
            if (existingAdmin) {
                console.log("🚫 Admin already exists");
                return res.status(403).json({ message: 'An admin already exists. Only one admin is allowed.' });
            }
        }

        console.log("🔐 Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log("📦 Creating user...");
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            dob,
            isAdmin: isAdmin || false,
        });

        console.log("💾 Saving user...");
        await newUser.save();

        console.log("✅ User registered successfully");
        res.status(201).json({ message: 'User registered successfully' });

    } catch (err) {
        console.error("❌ Server error:", err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// const login = async (req, res) => {
//     const { username, password } = req.body;

//     try {
//         const user = await User.findOne({ username });
//         if (!user) return res.status(400).json({ message: 'Invalid credentials' });

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

//         const token = jwt.sign(
//             { userId: user._id, isAdmin: user.isAdmin },
//             process.env.JWT_SECRET,
//             { expiresIn: '2h' }
//         );

//         res.status(200).json({ token, user: { username: user.username, isAdmin: user.isAdmin } });

//     } catch (err) {
//         res.status(500).json({ message: 'Server error', error: err.message });
//     }
// };

const login = async (req, res) => {
  const { email, password } = req.body;
  console.log("👉 Login request received:", { email });

  try {
      console.log("🔍 Checking if user exists...");
      const user = await User.findOne({ email });

      if (!user) {
          console.log("❌ Login failed: User not found");
          return res.status(400).json({ message: 'Invalid credentials' });
      }

      console.log("🔑 Verifying password...");
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
          console.log("🚫 Login failed: Incorrect password");
          return res.status(400).json({ message: 'Invalid credentials' });
      }

      console.log("✅ Authentication successful, generating token...");
      const token = jwt.sign(
          { userId: user._id, isAdmin: user.isAdmin },
          process.env.JWT_SECRET,
          { expiresIn: '2h' }
      );

      console.log(`🔐 Token generated for ${email}, isAdmin: ${user.isAdmin}`);
      res.status(200).json({ token, user: { username: user.username, email: user.email, isAdmin: user.isAdmin } });

  } catch (err) {
      console.error("❌ Server error during login:", err.message);
      res.status(500).json({ message: 'Server error', error: err.message });
  }
};




module.exports = { register, login };

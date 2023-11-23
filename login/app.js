if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const cors = require('cors');
// Create Express app
const app = express();
app.use(cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect('mongodb+srv://tylerbra:bawcAh-fixpy0-bufxym@atlascluster.vdebzvl.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

// User Schema Definition
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    // Add other necessary fields
  });
  
  // Create User model
  const User = mongoose.model('User', userSchema);

// Configure passport
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return done(null, false);
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
        
      const token = jwt.sign({username: user.username}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      return done(null, token);
    } else {
      return done(null, false);
    }
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });


// app logging
app.use((req, res, next) => {
    console.log(`Incoming ${req.method} request to ${req.originalUrl}`);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body); // If using body-parser or similar middleware
    console.log('Response headers:', res.headers);
    console.log('Response body:', res.body); 
    next();
  });




// Routes
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) { return res.status(500).json({ error: 'Failed to register user' }); }
    const user = new User({ username, password: hash });
    user.save((err) => {
      if (err) { return res.status(500).json({ error: 'Failed to register user' }); }
      res.json({ message: 'User registered successfully' });
    });
  });
});

app.post('/login', (req, res, next) => {
    console.log('Request body:', req.body)
    passport.authenticate('local', (err, token) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to authenticate' });
      }
      if (!token) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      console.log('Response token:', token)
      res.json({ token });
    })(req, res, next);
  });

  app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error during logout:', err);
            res.status(500).json({ error: 'Failed to logout' });
        } else {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                    res.status(500).json({ error: 'Failed to logout' });
                } else {
                    res.clearCookie('token'); // Clear the token cookie if applicable
                    res.json({ message: 'User logged out successfully' });
                }
            });
        }
    });
});



app.get('/status', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract the token from the authorization header

  if (!token) {
    console.log('No token')
    return res.status(401).json({ loggedIn: false });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
        console.log('Token not verified')
      return res.status(403).json({ loggedIn: false });
    }
    console.log('Token verified')
    // If the token is valid, you might want to perform additional checks,
    // such as database lookups or other validations, and then send the appropriate response.
    res.json({ loggedIn: true });
  });
});

// Start the server
app.listen(3001, () => {
  console.log('Server started on http://localhost:3001');
});

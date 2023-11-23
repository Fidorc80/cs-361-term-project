const mongoose = require('mongoose');

const connectionString = process.env.MONGOOSE_URI; //Use environment variable for security

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
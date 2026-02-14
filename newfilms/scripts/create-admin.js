// Script to create admin user
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://olleikm9527_db_user:K9JCHzqLGkrKTxPM@cluster0.98abcw3.mongodb.net/olkfilms?retryWrites=true&w=majority';

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: { type: String, default: 'user' },
    isBanned: { type: Boolean, default: false },
    avatar: String,
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
});

async function createAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: 'admin@olkfilms.com' });
        if (existingAdmin) {
            console.log('Admin already exists, updating role...');
            existingAdmin.role = 'admin';
            await existingAdmin.save();
        } else {
            // Create new admin
            const hashedPassword = await bcrypt.hash('admin123', 12);
            await User.create({
                name: 'Admin',
                email: 'admin@olkfilms.com',
                password: hashedPassword,
                role: 'admin',
                isBanned: false,
            });
            console.log('Admin created successfully!');
        }

        console.log('\n=================================');
        console.log('Admin Account:');
        console.log('Email: admin@olkfilms.com');
        console.log('Password: admin123');
        console.log('=================================\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createAdmin();

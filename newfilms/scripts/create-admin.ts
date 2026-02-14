// Script to create admin user
// Run with: npx ts-node scripts/create-admin.ts

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://olleikm9527_db_user:olleikmom313@cluster0.98abcw3.mongodb.net/olkfilms?retryWrites=true&w=majority';

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isBanned: { type: Boolean, default: false },
    avatar: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@olkfilms.com';
        const password = 'Admin@123';
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if admin exists
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            console.log('Admin already exists, updating...');
            await User.updateOne(
                { email },
                {
                    role: 'admin',
                    status: 'approved',
                    password: hashedPassword
                }
            );
        } else {
            await User.create({
                name: 'Admin',
                email,
                password: hashedPassword,
                role: 'admin',
                status: 'approved',
                isBanned: false,
            });
        }

        console.log('✅ Admin created/updated successfully!');
        console.log('📧 Email: admin@olkfilms.com');
        console.log('🔑 Password: Admin@123');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createAdmin();

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
    status: 'pending' | 'approved' | 'rejected';
    isBanned: boolean;
    avatar?: string;
    createdAt: Date;
    lastActive: Date;
}

const UserSchema: Schema = new Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    isBanned: {
        type: Boolean,
        default: false,
    },
    avatar: {
        type: String,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastActive: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);


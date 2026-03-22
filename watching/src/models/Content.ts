import mongoose, { Schema, Document } from 'mongoose';

export interface IEpisode {
    title: string;
    titleAr?: string;
    videoUrl: string;
    duration: number;
    episodeNumber: number;
    seasonNumber: number;
}

export interface IContent extends Document {
    title: string;
    titleAr?: string;
    description: string;
    descriptionAr?: string;
    type: 'movie' | 'series';
    poster: string;
    backdrop: string;
    videoUrl?: string;
    trailerUrl?: string;
    category: string;
    genres: string[];
    year: number;
    rating: number;
    duration?: number;
    views: number;
    episodes?: IEpisode[];
    featured: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const EpisodeSchema: Schema = new Schema({
    title: { type: String, required: true },
    titleAr: { type: String },
    videoUrl: { type: String, required: true },
    duration: { type: Number, default: 0 },
    episodeNumber: { type: Number, required: true },
    seasonNumber: { type: Number, default: 1 },
});

const ContentSchema: Schema = new Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    titleAr: {
        type: String,
        maxlength: [200, 'Arabic title cannot be more than 200 characters'],
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
        maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    descriptionAr: {
        type: String,
        maxlength: [2000, 'Arabic description cannot be more than 2000 characters'],
    },
    type: {
        type: String,
        enum: ['movie', 'series'],
        required: true,
    },
    poster: {
        type: String,
        required: [true, 'Please provide a poster URL'],
    },
    backdrop: {
        type: String,
        default: '',
    },
    videoUrl: {
        type: String,
    },
    trailerUrl: {
        type: String,
    },
    category: {
        type: String,
        required: [true, 'Please provide a category'],
    },
    genres: [{
        type: String,
    }],
    year: {
        type: Number,
        required: [true, 'Please provide a year'],
    },
    rating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
    },
    duration: {
        type: Number,
        default: 0,
    },
    views: {
        type: Number,
        default: 0,
    },
    episodes: [EpisodeSchema],
    featured: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

ContentSchema.pre('save', function () {
    this.updatedAt = new Date();
});

export default mongoose.models.Content || mongoose.model<IContent>('Content', ContentSchema);

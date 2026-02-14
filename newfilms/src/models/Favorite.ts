import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
    userId: mongoose.Types.ObjectId;
    tmdbId: number;
    type: 'movie' | 'series';
    title: string;
    titleAr?: string;
    poster: string;
    rating: number;
    year: string;
    addedAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    tmdbId: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['movie', 'series'],
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    titleAr: String,
    poster: String,
    rating: {
        type: Number,
        default: 0,
    },
    year: String,
    addedAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index to prevent duplicates
FavoriteSchema.index({ userId: 1, tmdbId: 1, type: 1 }, { unique: true });

export default mongoose.models.Favorite || mongoose.model<IFavorite>('Favorite', FavoriteSchema);

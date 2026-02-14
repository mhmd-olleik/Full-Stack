import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Favorite from '@/models/Favorite';
import { getSession } from '@/lib/auth';

// GET - Check if item is in favorites
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ isFavorite: false });
        }

        const { searchParams } = new URL(request.url);
        const tmdbId = searchParams.get('tmdbId');
        const type = searchParams.get('type');

        if (!tmdbId || !type) {
            return NextResponse.json({ isFavorite: false });
        }

        await connectDB();

        const favorite = await Favorite.findOne({
            userId: session.userId,
            tmdbId: parseInt(tmdbId),
            type,
        });

        return NextResponse.json({ isFavorite: !!favorite });
    } catch (error) {
        console.error('Check favorite error:', error);
        return NextResponse.json({ isFavorite: false });
    }
}

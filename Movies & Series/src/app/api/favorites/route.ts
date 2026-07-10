import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Favorite from '@/models/Favorite';

// GET - Get all favorites
export async function GET() {
    try {
        await connectDB();

        const favorites = await Favorite.find({})
            .sort({ addedAt: -1 });

        return NextResponse.json({ favorites });
    } catch (error) {
        console.error('Get favorites error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

// POST - Add to favorites
export async function POST(request: NextRequest) {
    try {
        const { tmdbId, type, title, titleAr, poster, rating, year } = await request.json();

        if (!tmdbId || !type || !title) {
            return NextResponse.json(
                { error: 'بيانات ناقصة' },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if already in favorites
        const existing = await Favorite.findOne({
            tmdbId,
            type,
        });

        if (existing) {
            return NextResponse.json(
                { error: 'موجود في المفضلة بالفعل' },
                { status: 400 }
            );
        }

        const favorite = await Favorite.create({
            tmdbId,
            type,
            title,
            titleAr,
            poster,
            rating,
            year,
        });

        return NextResponse.json({ favorite, message: 'تمت الإضافة للمفضلة' }, { status: 201 });
    } catch (error) {
        console.error('Add favorite error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

// DELETE - Remove from favorites
export async function DELETE(request: NextRequest) {
    try {
        const { tmdbId, type } = await request.json();

        if (!tmdbId || !type) {
            return NextResponse.json(
                { error: 'بيانات ناقصة' },
                { status: 400 }
            );
        }

        await connectDB();

        await Favorite.findOneAndDelete({
            tmdbId,
            type,
        });

        return NextResponse.json({ message: 'تم الحذف من المفضلة' });
    } catch (error) {
        console.error('Remove favorite error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

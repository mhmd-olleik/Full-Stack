import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Content from '@/models/Content';

export async function GET() {
    try {
        await connectDB();

        const [
            totalMovies,
            totalSeries,
            totalViews,
            topContent,
        ] = await Promise.all([
            Content.countDocuments({ type: 'movie' }),
            Content.countDocuments({ type: 'series' }),
            Content.aggregate([
                { $group: { _id: null, total: { $sum: '$views' } } },
            ]),
            Content.find({})
                .sort({ views: -1 })
                .limit(5)
                .select('title titleAr poster views type'),
        ]);

        return NextResponse.json({
            stats: {
                totalMovies,
                totalSeries,
                totalContent: totalMovies + totalSeries,
                totalViews: totalViews[0]?.total || 0,
            },
            topContent,
        });
    } catch (error) {
        console.error('Get stats error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Content from '@/models/Content';
import { getSession, isAdmin } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();

        if (!session || !(await isAdmin())) {
            return NextResponse.json(
                { error: 'غير مصرح' },
                { status: 403 }
            );
        }

        await connectDB();

        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            activeUsers24h,
            newUsersWeek,
            newUsersMonth,
            totalMovies,
            totalSeries,
            totalViews,
            bannedUsers,
            topContent,
        ] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ lastActive: { $gte: last24Hours } }),
            User.countDocuments({ createdAt: { $gte: last7Days } }),
            User.countDocuments({ createdAt: { $gte: last30Days } }),
            Content.countDocuments({ type: 'movie' }),
            Content.countDocuments({ type: 'series' }),
            Content.aggregate([
                { $group: { _id: null, total: { $sum: '$views' } } },
            ]),
            User.countDocuments({ isBanned: true }),
            Content.find({})
                .sort({ views: -1 })
                .limit(5)
                .select('title titleAr poster views type'),
        ]);

        // Get user registration trend (last 7 days)
        const userTrend = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: last7Days },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        return NextResponse.json({
            stats: {
                totalUsers,
                activeUsers24h,
                newUsersWeek,
                newUsersMonth,
                totalMovies,
                totalSeries,
                totalContent: totalMovies + totalSeries,
                totalViews: totalViews[0]?.total || 0,
                bannedUsers,
            },
            topContent,
            userTrend,
        });
    } catch (error) {
        console.error('Get stats error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

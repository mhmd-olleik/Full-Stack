import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Content from '@/models/Content';
import { getSession, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session || !(await isAdmin())) {
            return NextResponse.json(
                { error: 'غير مصرح' },
                { status: 403 }
            );
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const query: Record<string, unknown> = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(query),
        ]);

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

export async function GET_STATS() {
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

        const [
            totalUsers,
            activeUsers24h,
            newUsersWeek,
            totalContent,
            totalViews,
            bannedUsers,
        ] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ lastActive: { $gte: last24Hours } }),
            User.countDocuments({ createdAt: { $gte: last7Days } }),
            Content.countDocuments({}),
            Content.aggregate([
                { $group: { _id: null, total: { $sum: '$views' } } },
            ]),
            User.countDocuments({ isBanned: true }),
        ]);

        return NextResponse.json({
            stats: {
                totalUsers,
                activeUsers24h,
                newUsersWeek,
                totalContent,
                totalViews: totalViews[0]?.total || 0,
                bannedUsers,
            },
        });
    } catch (error) {
        console.error('Get stats error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

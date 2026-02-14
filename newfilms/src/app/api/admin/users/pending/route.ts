import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Verify admin
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
        }

        await connectDB();

        // Get pending users
        const pendingUsers = await User.find({ status: 'pending' })
            .select('_id name email createdAt')
            .sort({ createdAt: -1 });

        return NextResponse.json({ users: pendingUsers });
    } catch (error) {
        console.error('Get pending users error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ أثناء جلب المستخدمين' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id: userId } = await params;

        // Find and update user
        const user = await User.findByIdAndUpdate(
            userId,
            { status: 'rejected' },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'تم رفض المستخدم',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                status: user.status,
            },
        });
    } catch (error) {
        console.error('Reject user error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ أثناء رفض المستخدم' },
            { status: 500 }
        );
    }
}

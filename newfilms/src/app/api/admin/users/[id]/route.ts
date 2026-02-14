import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getSession, isAdmin } from '@/lib/auth';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session || !(await isAdmin())) {
            return NextResponse.json(
                { error: 'غير مصرح' },
                { status: 403 }
            );
        }

        await connectDB();

        const { id } = await params;
        const { action } = await request.json();

        const user = await User.findById(id);

        if (!user) {
            return NextResponse.json(
                { error: 'المستخدم غير موجود' },
                { status: 404 }
            );
        }

        // Prevent banning self or other admins
        if (user._id.toString() === session.userId) {
            return NextResponse.json(
                { error: 'لا يمكنك حظر نفسك' },
                { status: 400 }
            );
        }

        if (user.role === 'admin') {
            return NextResponse.json(
                { error: 'لا يمكنك حظر مسؤول آخر' },
                { status: 400 }
            );
        }

        if (action === 'ban') {
            user.isBanned = true;
        } else if (action === 'unban') {
            user.isBanned = false;
        } else if (action === 'makeAdmin') {
            user.role = 'admin';
        } else if (action === 'removeAdmin') {
            user.role = 'user';
        }

        await user.save();

        return NextResponse.json({
            message: 'تم تحديث المستخدم بنجاح',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isBanned: user.isBanned,
            },
        });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session || !(await isAdmin())) {
            return NextResponse.json(
                { error: 'غير مصرح' },
                { status: 403 }
            );
        }

        await connectDB();

        const { id } = await params;

        // Prevent deleting self
        if (id === session.userId) {
            return NextResponse.json(
                { error: 'لا يمكنك حذف حسابك' },
                { status: 400 }
            );
        }

        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return NextResponse.json(
                { error: 'المستخدم غير موجود' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'تم حذف المستخدم بنجاح',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

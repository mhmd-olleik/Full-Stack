import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const { email, password } = await request.json();

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { error: 'الرجاء ملء جميع الحقول' },
                { status: 400 }
            );
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return NextResponse.json(
                { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
                { status: 401 }
            );
        }

        // Check if banned
        if (user.isBanned) {
            return NextResponse.json(
                { error: 'تم حظر حسابك. يرجى التواصل مع الدعم' },
                { status: 403 }
            );
        }

        // Check user status (pending/rejected)
        if (user.status === 'pending') {
            return NextResponse.json(
                { error: 'حسابك قيد المراجعة. يرجى انتظار موافقة المشرف.', pending: true },
                { status: 403 }
            );
        }

        if (user.status === 'rejected') {
            return NextResponse.json(
                { error: 'تم رفض طلب تسجيلك.', rejected: true },
                { status: 403 }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
                { status: 401 }
            );
        }

        // Update last active
        user.lastActive = new Date();
        await user.save();

        // Create token
        const token = await createToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        // Set cookie
        const response = NextResponse.json(
            {
                message: 'تم تسجيل الدخول بنجاح',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    status: user.status,
                },
            },
            { status: 200 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ أثناء تسجيل الدخول' },
            { status: 500 }
        );
    }
}


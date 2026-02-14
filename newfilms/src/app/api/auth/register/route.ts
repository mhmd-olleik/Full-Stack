import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        // Check if MONGODB_URI is set
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined');
            return NextResponse.json(
                { error: 'خطأ في إعدادات الخادم - MONGODB_URI غير معرّف' },
                { status: 500 }
            );
        }

        await connectDB();

        const { name, email, password } = await request.json();

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'الرجاء ملء جميع الحقول' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'البريد الإلكتروني مسجل مسبقاً' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with pending status (requires admin approval)
        await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'user',
            status: 'pending', // User needs admin approval
            isBanned: false,
        });

        // Return success - user needs to wait for approval
        return NextResponse.json(
            {
                message: 'تم إرسال طلب التسجيل بنجاح. يرجى انتظار موافقة المشرف.',
                pending: true,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'حدث خطأ: ' + errorMessage },
            { status: 500 }
        );
    }
}



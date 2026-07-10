import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Content from '@/models/Content';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const category = searchParams.get('category');
        const featured = searchParams.get('featured');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const query: Record<string, unknown> = {};

        if (type) query.type = type;
        if (category) query.category = category;
        if (featured === 'true') query.featured = true;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { titleAr: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [content, total] = await Promise.all([
            Content.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-episodes'),
            Content.countDocuments(query),
        ]);

        return NextResponse.json({
            content,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get content error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const data = await request.json();

        const content = await Content.create(data);

        return NextResponse.json(
            { message: 'تم إضافة المحتوى بنجاح', content },
            { status: 201 }
        );
    } catch (error) {
        console.error('Create content error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ أثناء إضافة المحتوى' },
            { status: 500 }
        );
    }
}

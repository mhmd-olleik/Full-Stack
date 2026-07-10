import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Content from '@/models/Content';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();

        const { id } = await params;
        const content = await Content.findById(id);

        if (!content) {
            return NextResponse.json(
                { error: 'المحتوى غير موجود' },
                { status: 404 }
            );
        }

        // Increment views
        content.views += 1;
        await content.save();

        return NextResponse.json({ content });
    } catch (error) {
        console.error('Get content error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();

        const { id } = await params;
        const data = await request.json();

        const content = await Content.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!content) {
            return NextResponse.json(
                { error: 'المحتوى غير موجود' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'تم تحديث المحتوى بنجاح',
            content,
        });
    } catch (error) {
        console.error('Update content error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ أثناء تحديث المحتوى' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();

        const { id } = await params;
        const content = await Content.findByIdAndDelete(id);

        if (!content) {
            return NextResponse.json(
                { error: 'المحتوى غير موجود' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'تم حذف المحتوى بنجاح',
        });
    } catch (error) {
        console.error('Delete content error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ أثناء حذف المحتوى' },
            { status: 500 }
        );
    }
}

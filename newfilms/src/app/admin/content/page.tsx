'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Content {
    _id: string;
    title: string;
    titleAr?: string;
    poster: string;
    type: 'movie' | 'series';
    year: number;
    rating: number;
    category: string;
    views: number;
    featured: boolean;
    createdAt: string;
}

// Sample content data
const sampleContent: Content[] = [
    {
        _id: '1',
        title: 'The Dark Knight',
        titleAr: 'فارس الظلام',
        poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        type: 'movie',
        year: 2008,
        rating: 9.0,
        category: 'أكشن',
        views: 15420,
        featured: true,
        createdAt: '2024-01-15T10:30:00Z',
    },
    {
        _id: '2',
        title: 'Breaking Bad',
        titleAr: 'بريكنج باد',
        poster: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        type: 'series',
        year: 2008,
        rating: 9.5,
        category: 'دراما',
        views: 23150,
        featured: true,
        createdAt: '2024-02-20T15:45:00Z',
    },
    {
        _id: '3',
        title: 'Inception',
        titleAr: 'البداية',
        poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Ber.jpg',
        type: 'movie',
        year: 2010,
        rating: 8.8,
        category: 'خيال علمي',
        views: 18900,
        featured: true,
        createdAt: '2024-03-10T08:00:00Z',
    },
];

export default function ContentPage() {
    const [content, setContent] = useState<Content[]>([]);
    const [filteredContent, setFilteredContent] = useState<Content[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setContent(sampleContent);
            setFilteredContent(sampleContent);
            setIsLoading(false);
        }, 500);
    }, []);

    useEffect(() => {
        let filtered = [...content];

        if (searchQuery) {
            filtered = filtered.filter(
                (c) =>
                    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.titleAr?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter((c) => c.type === typeFilter);
        }

        setFilteredContent(filtered);
    }, [content, searchQuery, typeFilter]);

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المحتوى؟')) return;
        setContent(content.filter((c) => c._id !== id));
    };

    const toggleFeatured = (id: string) => {
        setContent(
            content.map((c) =>
                c._id === id ? { ...c, featured: !c.featured } : c
            )
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">إدارة المحتوى</h1>
                    <p className="text-gray-400 mt-1">إجمالي {content.length} محتوى</p>
                </div>
                <Link
                    href="/admin/content/new"
                    className="btn-primary"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    إضافة محتوى جديد
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="ابحث عن فيلم أو مسلسل..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                    />
                    <svg
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Type Filter */}
                <div className="flex gap-2">
                    {[
                        { value: 'all', label: 'الكل' },
                        { value: 'movie', label: 'أفلام' },
                        { value: 'series', label: 'مسلسلات' },
                    ].map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setTypeFilter(f.value as typeof typeFilter)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === f.value
                                    ? 'bg-red-600 text-white'
                                    : 'bg-[#1a1a1a] text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.map((item) => (
                    <div
                        key={item._id}
                        className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
                    >
                        <div className="relative aspect-video">
                            <Image
                                src={item.poster}
                                alt={item.titleAr || item.title}
                                fill
                                className="object-cover"
                            />
                            <div className="absolute top-2 right-2 flex gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'movie' ? 'bg-blue-600' : 'bg-purple-600'
                                    }`}>
                                    {item.type === 'movie' ? 'فيلم' : 'مسلسل'}
                                </span>
                                {item.featured && (
                                    <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-600">
                                        مميز
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-4">
                            <h3 className="text-lg font-bold text-white mb-1">
                                {item.titleAr || item.title}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-400 mb-4">
                                <span>{item.year}</span>
                                <span>•</span>
                                <span>{item.category}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    {item.rating}
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                                <span>{item.views.toLocaleString()} مشاهدة</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleFeatured(item._id)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${item.featured
                                            ? 'bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    {item.featured ? 'إزالة من المميز' : 'تمييز'}
                                </button>
                                <button
                                    onClick={() => handleDelete(item._id)}
                                    className="px-4 py-2 bg-red-600/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-colors"
                                >
                                    حذف
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredContent.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">لا يوجد محتوى</h3>
                    <p className="text-gray-400 mb-4">لم يتم العثور على محتوى مطابق</p>
                    <Link href="/admin/content/new" className="btn-primary">
                        إضافة محتوى جديد
                    </Link>
                </div>
            )}
        </div>
    );
}

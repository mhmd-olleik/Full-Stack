'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
    totalUsers: number;
    activeUsers24h: number;
    newUsersWeek: number;
    newUsersMonth: number;
    totalMovies: number;
    totalSeries: number;
    totalContent: number;
    totalViews: number;
    bannedUsers: number;
}

interface TopContent {
    _id: string;
    title: string;
    titleAr?: string;
    poster: string;
    views: number;
    type: string;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [topContent, setTopContent] = useState<TopContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (!res.ok) {
                throw new Error('فشل في تحميل الإحصائيات');
            }
            const data = await res.json();
            setStats(data.stats);
            setTopContent(data.topContent || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">جاري تحميل الإحصائيات...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <p className="text-red-400 mb-4">{error}</p>
                    <button onClick={fetchStats} className="btn-primary">
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    const statCards = [
        {
            title: 'إجمالي المستخدمين',
            value: stats?.totalUsers || 0,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            color: 'from-blue-500 to-blue-600',
            link: '/admin/users',
        },
        {
            title: 'نشط اليوم',
            value: stats?.activeUsers24h || 0,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'from-green-500 to-green-600',
        },
        {
            title: 'مستخدمين جدد (أسبوع)',
            value: stats?.newUsersWeek || 0,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            ),
            color: 'from-purple-500 to-purple-600',
        },
        {
            title: 'المحظورين',
            value: stats?.bannedUsers || 0,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            ),
            color: 'from-red-500 to-red-600',
        },
        {
            title: 'إجمالي الأفلام',
            value: stats?.totalMovies || 0,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
            ),
            color: 'from-cyan-500 to-cyan-600',
            link: '/admin/content',
        },
        {
            title: 'إجمالي المسلسلات',
            value: stats?.totalSeries || 0,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
            color: 'from-pink-500 to-pink-600',
            link: '/admin/content',
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">لوحة التحكم</h1>
                    <p className="text-gray-400 mt-1">مرحباً! إليك نظرة عامة على نشاط المنصة</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="btn-secondary flex items-center gap-2 w-fit"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    تحديث
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="glass rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer group"
                        onClick={() => stat.link && (window.location.href = stat.link)}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">{stat.title}</p>
                                <p className="text-4xl font-bold text-white">{stat.value.toLocaleString()}</p>
                            </div>
                            <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                        </div>
                        {stat.link && (
                            <div className="mt-4 text-sm text-gray-500 group-hover:text-white transition-colors flex items-center gap-1">
                                عرض التفاصيل
                                <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Content Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Content Distribution */}
                <div className="glass rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6">توزيع المحتوى</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">الأفلام</span>
                                <span className="text-white">{stats?.totalMovies || 0}</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${stats?.totalContent ? ((stats.totalMovies / stats.totalContent) * 100) : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">المسلسلات</span>
                                <span className="text-white">{stats?.totalSeries || 0}</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${stats?.totalContent ? ((stats.totalSeries / stats.totalContent) * 100) : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">إجمالي المحتوى</span>
                            <span className="text-2xl font-bold text-white">{stats?.totalContent || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6">إجراءات سريعة</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            href="/admin/users"
                            className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-center group"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <span className="text-white font-medium">إدارة المستخدمين</span>
                        </Link>
                        <Link
                            href="/admin/content"
                            className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-center group"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <span className="text-white font-medium">إدارة المحتوى</span>
                        </Link>
                        <Link
                            href="/"
                            className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-center group"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </div>
                            <span className="text-white font-medium">معاينة الموقع</span>
                        </Link>
                        <div className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-center group cursor-pointer">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-white font-medium">الإعدادات</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="glass rounded-xl p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold mb-1">ملاحظة</h3>
                        <p className="text-gray-400 text-sm">
                            المحتوى (الأفلام والمسلسلات) يتم جلبه تلقائياً من TMDB API.
                            لإضافة محتوى مخصص أو تعديل الروابط، استخدم صفحة إدارة المحتوى.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

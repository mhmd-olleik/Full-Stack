'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    createdAt: string;
}

interface Favorite {
    _id: string;
    tmdbId: number;
    type: 'movie' | 'series';
    title: string;
    titleAr?: string;
    poster: string;
    rating: number;
    year: string;
    addedAt: string;
}

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'movies' | 'series'>('movies');
    const router = useRouter();

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const [userRes, favRes] = await Promise.all([
                fetch('/api/auth/me'),
                fetch('/api/favorites'),
            ]);

            if (!userRes.ok) {
                router.push('/auth/login');
                return;
            }

            const userData = await userRes.json();
            setUser(userData.user);

            if (favRes.ok) {
                const favData = await favRes.json();
                setFavorites(favData.favorites || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFavorite = async (tmdbId: number, type: string) => {
        try {
            const res = await fetch('/api/favorites', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tmdbId, type }),
            });

            if (res.ok) {
                setFavorites(favorites.filter(f => !(f.tmdbId === tmdbId && f.type === type)));
            }
        } catch (error) {
            console.error('Error removing favorite:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const filteredFavorites = favorites.filter(f =>
        activeTab === 'movies' ? f.type === 'movie' : f.type === 'series'
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Profile Header */}
                <div className="glass rounded-2xl p-6 md:p-8 mb-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white text-4xl md:text-5xl font-bold shadow-lg">
                            {user.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-right">
                            <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
                            <p className="text-gray-400 mb-4">{user.email}</p>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                <span className={`px-4 py-2 rounded-full text-sm font-medium ${user.role === 'admin'
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {user.role === 'admin' ? '👑 مشرف' : '👤 مستخدم'}
                                </span>
                                <span className="text-gray-500 text-sm">
                                    عضو منذ {formatDate(user.createdAt)}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            {user.role === 'admin' && (
                                <Link href="/admin" className="btn-primary">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    لوحة التحكم
                                </Link>
                            )}
                            <button onClick={handleLogout} className="btn-secondary">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                تسجيل الخروج
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-white">{favorites.filter(f => f.type === 'movie').length}</p>
                        <p className="text-gray-400 text-sm">أفلام مفضلة</p>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-white">{favorites.filter(f => f.type === 'series').length}</p>
                        <p className="text-gray-400 text-sm">مسلسلات مفضلة</p>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-white">{favorites.length}</p>
                        <p className="text-gray-400 text-sm">إجمالي المفضلة</p>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-white">∞</p>
                        <p className="text-gray-400 text-sm">ساعات المشاهدة</p>
                    </div>
                </div>

                {/* Favorites Section */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="w-1 h-8 bg-red-600 rounded-full"></span>
                            قائمة المفضلة
                        </h2>

                        {/* Tabs */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('movies')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'movies'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                الأفلام ({favorites.filter(f => f.type === 'movie').length})
                            </button>
                            <button
                                onClick={() => setActiveTab('series')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'series'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                المسلسلات ({favorites.filter(f => f.type === 'series').length})
                            </button>
                        </div>
                    </div>

                    {filteredFavorites.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <p className="text-gray-400 mb-4">
                                لا توجد {activeTab === 'movies' ? 'أفلام' : 'مسلسلات'} في المفضلة
                            </p>
                            <Link href={activeTab === 'movies' ? '/movies' : '/series'} className="btn-primary">
                                تصفح {activeTab === 'movies' ? 'الأفلام' : 'المسلسلات'}
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {filteredFavorites.map((item) => (
                                <div key={item._id} className="group relative">
                                    <Link href={`/watch/${item.type}/${item.tmdbId}`}>
                                        <div className="card relative overflow-hidden rounded-xl">
                                            <div className="relative aspect-[2/3] overflow-hidden">
                                                <Image
                                                    src={item.poster || '/placeholder-poster.jpg'}
                                                    alt={item.title}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                    sizes="(max-width: 768px) 50vw, 16vw"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className={`w-12 h-12 ${item.type === 'movie' ? 'bg-red-600/90' : 'bg-purple-600/90'} rounded-full flex items-center justify-center`}>
                                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                {item.rating > 0 && (
                                                    <div className="absolute top-2 right-2 rating-badge">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                        {item.rating.toFixed(1)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2">
                                                <h3 className="font-bold text-white text-sm truncate group-hover:text-red-400">
                                                    {item.titleAr || item.title}
                                                </h3>
                                                <p className="text-gray-400 text-xs">{item.year}</p>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => handleRemoveFavorite(item.tmdbId, item.type)}
                                        className="absolute top-2 left-2 w-8 h-8 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="إزالة من المفضلة"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

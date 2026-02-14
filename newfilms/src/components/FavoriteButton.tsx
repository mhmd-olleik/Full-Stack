'use client';

import { useState, useEffect } from 'react';

interface FavoriteButtonProps {
    tmdbId: number;
    type: 'movie' | 'series';
    title: string;
    titleAr?: string;
    poster: string;
    rating: number;
    year: string;
    size?: 'small' | 'large';
}

export default function FavoriteButton({
    tmdbId,
    type,
    title,
    titleAr,
    poster,
    rating,
    year,
    size = 'large',
}: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        checkFavorite();
    }, [tmdbId, type]);

    const checkFavorite = async () => {
        try {
            const res = await fetch(`/api/favorites/check?tmdbId=${tmdbId}&type=${type}`);
            const data = await res.json();
            setIsFavorite(data.isFavorite);
        } catch (error) {
            console.error('Error checking favorite:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFavorite = async () => {
        setIsUpdating(true);
        try {
            if (isFavorite) {
                // Remove from favorites
                const res = await fetch('/api/favorites', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tmdbId, type }),
                });
                if (res.ok) {
                    setIsFavorite(false);
                }
            } else {
                // Add to favorites
                const res = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tmdbId, type, title, titleAr, poster, rating, year }),
                });
                if (res.ok) {
                    setIsFavorite(true);
                } else if (res.status === 401) {
                    // Not logged in, redirect to login
                    window.location.href = '/auth/login';
                    return;
                }
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <button
                disabled
                className={`${size === 'large' ? 'btn-secondary text-lg px-8 py-4' : 'p-3 bg-white/10 rounded-full'
                    } opacity-50`}
            >
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </button>
        );
    }

    if (size === 'small') {
        return (
            <button
                onClick={toggleFavorite}
                disabled={isUpdating}
                className={`p-3 rounded-full transition-all ${isFavorite
                        ? 'bg-red-600 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                title={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            >
                {isUpdating ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg
                        className="w-5 h-5"
                        fill={isFavorite ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                    </svg>
                )}
            </button>
        );
    }

    return (
        <button
            onClick={toggleFavorite}
            disabled={isUpdating}
            className={`btn-secondary text-lg px-8 py-4 ${isFavorite ? 'bg-red-600/20 border-red-500' : ''}`}
        >
            {isUpdating ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <svg
                    className="w-6 h-6"
                    fill={isFavorite ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                </svg>
            )}
            {isFavorite ? 'في المفضلة' : 'إضافة للمفضلة'}
        </button>
    );
}

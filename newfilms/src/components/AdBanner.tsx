'use client';

import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        adsbygoogle: unknown[];
    }
}

interface AdBannerProps {
    adSlot: string;
    adFormat?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
    fullWidth?: boolean;
    className?: string;
}

export default function AdBanner({
    adSlot,
    adFormat = 'auto',
    fullWidth = true,
    className = '',
}: AdBannerProps) {
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && adRef.current) {
                // Push ad to adsbygoogle
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (error) {
            console.error('AdSense error:', error);
        }
    }, []);

    return (
        <div className={`ad-container my-4 ${className}`}>
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{
                    display: 'block',
                    textAlign: 'center',
                }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // استبدل بـ Publisher ID الخاص بك
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={fullWidth ? 'true' : 'false'}
            />
        </div>
    );
}

// مكون بديل يظهر إذا لم يكن لديك AdSense بعد
export function AdPlaceholder({
    size = 'medium',
    className = '',
}: {
    size?: 'small' | 'medium' | 'large' | 'video';
    className?: string;
}) {
    const sizeClasses = {
        small: 'h-16',
        medium: 'h-24',
        large: 'h-64',
        video: 'aspect-video',
    };

    return (
        <div
            className={`ad-banner ${size === 'large' ? 'large' : ''} ${sizeClasses[size]} ${className}`}
        >
            <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                        />
                    </svg>
                    <span>مساحة إعلانية</span>
                </div>
                <p className="text-xs opacity-60">
                    {size === 'small' && '728 × 90'}
                    {size === 'medium' && '728 × 90'}
                    {size === 'large' && '300 × 250'}
                    {size === 'video' && 'إعلان فيديو'}
                </p>
            </div>
        </div>
    );
}

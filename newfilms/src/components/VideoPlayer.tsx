'use client';

import { useState } from 'react';
import { VideoSource } from '@/lib/vidsrc';

interface VideoPlayerProps {
    sources: VideoSource[];
    title: string;
}

export default function VideoPlayer({ sources, title }: VideoPlayerProps) {
    const [currentSource, setCurrentSource] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="space-y-4">
            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-white">جاري تحميل الفيديو...</p>
                        </div>
                    </div>
                )}
                <iframe
                    src={sources[currentSource]?.url}
                    title={title}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    onLoad={() => setIsLoading(false)}
                />
            </div>

            {/* Server Selection */}
            <div className="flex flex-wrap gap-2">
                <span className="text-gray-400 text-sm ml-2 self-center">السيرفرات:</span>
                {sources.map((source, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setIsLoading(true);
                            setCurrentSource(index);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentSource === index
                                ? 'bg-red-600 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        {source.name}
                    </button>
                ))}
            </div>

            {/* Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    إذا لم يعمل السيرفر، جرب سيرفر آخر. قد يستغرق التحميل بضع ثوان.
                </p>
            </div>
        </div>
    );
}

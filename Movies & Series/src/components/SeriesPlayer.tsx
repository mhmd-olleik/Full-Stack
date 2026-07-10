'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getTVEmbedUrls, VideoSource } from '@/lib/vidsrc';

interface Season {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
}

interface SeriesPlayerProps {
    seriesId: number;
    seasons: Season[];
    seriesPoster: string;
    title: string;
}

export default function SeriesPlayer({ seriesId, seasons, seriesPoster, title }: SeriesPlayerProps) {
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [currentSource, setCurrentSource] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const currentSeason = seasons.find(s => s.season_number === selectedSeason);
    const episodeCount = currentSeason?.episode_count || 1;
    const videoSources = getTVEmbedUrls(seriesId, selectedSeason, selectedEpisode);

    const handleSeasonChange = (season: number) => {
        setSelectedSeason(season);
        setSelectedEpisode(1);
        setIsLoading(true);
        setCurrentSource(0);
    };

    const handleEpisodeChange = (episode: number) => {
        setSelectedEpisode(episode);
        setIsLoading(true);
        setCurrentSource(0);
    };

    return (
        <div className="space-y-6">
            {/* Video Player */}
            <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-white">جاري تحميل الحلقة...</p>
                            </div>
                        </div>
                    )}
                    <iframe
                        key={`${selectedSeason}-${selectedEpisode}-${currentSource}`}
                        src={videoSources[currentSource]?.url}
                        title={`${title} - S${selectedSeason}E${selectedEpisode}`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        onLoad={() => setIsLoading(false)}
                    />
                </div>

                {/* Server Selection */}
                <div className="flex flex-wrap gap-2">
                    <span className="text-gray-400 text-sm ml-2 self-center">السيرفرات:</span>
                    {videoSources.map((source, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setIsLoading(true);
                                setCurrentSource(index);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentSource === index
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            {source.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Season & Episode Selection */}
            <div className="glass rounded-xl p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Seasons */}
                    <div className="md:w-1/3">
                        <h3 className="text-lg font-bold text-white mb-4">المواسم</h3>
                        <div className="flex flex-wrap md:flex-col gap-2 max-h-64 overflow-y-auto">
                            {seasons.filter(s => s.season_number > 0).map((season) => (
                                <button
                                    key={season.id}
                                    onClick={() => handleSeasonChange(season.season_number)}
                                    className={`px-4 py-3 rounded-lg text-right transition-all ${selectedSeason === season.season_number
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="font-medium">{season.name}</span>
                                    <span className="text-sm opacity-70 mr-2">({season.episode_count} حلقة)</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Episodes */}
                    <div className="md:w-2/3">
                        <h3 className="text-lg font-bold text-white mb-4">
                            الحلقات - الموسم {selectedSeason}
                        </h3>
                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 overflow-y-auto">
                            {Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => (
                                <button
                                    key={ep}
                                    onClick={() => handleEpisodeChange(ep)}
                                    className={`aspect-square rounded-lg text-sm font-bold transition-all ${selectedEpisode === ep
                                            ? 'bg-purple-600 text-white scale-110'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                        }`}
                                >
                                    {ep}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Current Episode Info */}
            <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                <p className="text-purple-300 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    تشاهد الآن: الموسم {selectedSeason} - الحلقة {selectedEpisode}
                </p>
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

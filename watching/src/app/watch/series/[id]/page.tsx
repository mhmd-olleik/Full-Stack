import Image from 'next/image';
import Link from 'next/link';
import { getTVShowDetails, getPopularTVShows, getImageUrl, getTrailerUrl } from '@/lib/tmdb';
import SeriesPlayer from '@/components/SeriesPlayer';
import { AdPlaceholder as AdBanner } from '@/components/AdBanner';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function WatchSeriesPage({ params }: PageProps) {
    const { id } = await params;
    const seriesId = parseInt(id);

    if (isNaN(seriesId)) {
        notFound();
    }

    let series;
    try {
        series = await getTVShowDetails(seriesId);
    } catch {
        notFound();
    }

    const trailerUrl = getTrailerUrl(series.videos);
    const relatedShows = await getPopularTVShows();

    // Prepare seasons data for client component
    const seasonsData = series.seasons?.filter(s => s.season_number > 0).map(s => ({
        id: s.id,
        name: s.name,
        season_number: s.season_number,
        episode_count: s.episode_count,
        poster_path: s.poster_path,
    })) || [];

    return (
        <div className="min-h-screen">
            {/* Hero Background */}
            <div className="relative h-[40vh] overflow-hidden">
                <Image
                    src={getImageUrl(series.backdrop_path, 'original')}
                    alt={series.name}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-[#141414]/40" />
            </div>

            {/* Content */}
            <div className="relative -mt-32 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Series Info Header */}
                    <div className="flex flex-col md:flex-row gap-6 mb-8">
                        {/* Poster */}
                        <div className="flex-shrink-0 hidden md:block">
                            <div className="relative w-48 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
                                <Image
                                    src={getImageUrl(series.poster_path)}
                                    alt={series.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="px-3 py-1 bg-purple-600 rounded-full text-sm font-bold">مسلسل</span>
                                {series.vote_average > 0 && (
                                    <span className="rating-badge">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        {series.vote_average.toFixed(1)}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                                {series.name}
                            </h1>

                            {series.original_name !== series.name && (
                                <p className="text-lg text-gray-400 mb-3">{series.original_name}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-gray-400 mb-4">
                                <span>{series.first_air_date?.split('-')[0]}</span>
                                <span>•</span>
                                <span>{series.number_of_seasons} مواسم</span>
                                <span>•</span>
                                <span>{series.number_of_episodes} حلقة</span>
                            </div>

                            {/* Genres */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {series.genres?.map((genre) => (
                                    <span key={genre.id} className="category-badge">
                                        {genre.name}
                                    </span>
                                ))}
                            </div>

                            <p className="text-gray-300 leading-relaxed line-clamp-3">
                                {series.overview || 'لا يوجد وصف متاح لهذا المسلسل.'}
                            </p>
                        </div>
                    </div>

                    {/* Series Player */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-1 h-8 bg-purple-600 rounded-full"></span>
                            شاهد الآن
                        </h2>
                        <SeriesPlayer
                            seriesId={seriesId}
                            seasons={seasonsData}
                            seriesPoster={getImageUrl(series.poster_path)}
                            title={series.name}
                        />
                    </section>

                    {/* Ad Banner */}
                    <AdBanner size="large" className="my-8" />

                    {/* Trailer Section */}
                    {trailerUrl && (
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-8 bg-yellow-500 rounded-full"></span>
                                الإعلان الرسمي
                            </h2>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black max-w-4xl">
                                <iframe
                                    src={trailerUrl}
                                    title={`${series.name} - Trailer`}
                                    className="absolute inset-0 w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </section>
                    )}

                    {/* Related Content */}
                    <section className="py-8">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-1 h-8 bg-purple-600 rounded-full"></span>
                            مسلسلات مشابهة
                        </h2>
                        <div className="content-grid">
                            {relatedShows.results.slice(0, 6).map((show) => (
                                <Link key={show.id} href={`/watch/series/${show.id}`} className="group">
                                    <div className="card relative overflow-hidden rounded-xl">
                                        <div className="relative aspect-[2/3] overflow-hidden">
                                            <Image
                                                src={getImageUrl(show.poster_path)}
                                                alt={show.name}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                sizes="(max-width: 768px) 50vw, 20vw"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-14 h-14 bg-purple-600/90 rounded-full flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-bold text-white truncate group-hover:text-purple-400">
                                                {show.name}
                                            </h3>
                                            <p className="text-gray-400 text-sm">{show.first_air_date?.split('-')[0]}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

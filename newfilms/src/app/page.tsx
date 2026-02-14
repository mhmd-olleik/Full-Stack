import Link from 'next/link';
import Image from 'next/image';
import { getTrendingMovies, getTrendingTVShows, getImageUrl, getGenreNameAr } from '@/lib/tmdb';
import { AdPlaceholder } from '@/components/AdBanner';

// Content Card Component
function ContentCard({
  id,
  title,
  poster,
  type,
  year,
  rating,
  genreId
}: {
  id: number;
  title: string;
  poster: string;
  type: 'movie' | 'series';
  year: string;
  rating: number;
  genreId?: number;
}) {
  return (
    <Link href={`/watch/${type}/${id}`} className="group">
      <div className="card relative overflow-hidden rounded-xl">
        <div className="relative aspect-[2/3] overflow-hidden">
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-16 h-16 bg-red-600/90 rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <svg className="w-8 h-8 text-white mr-[-3px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {rating > 0 && (
            <div className="absolute top-2 right-2 rating-badge">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {rating.toFixed(1)}
            </div>
          )}

          <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${type === 'movie' ? 'bg-blue-600' : 'bg-purple-600'
            }`}>
            {type === 'movie' ? 'فيلم' : 'مسلسل'}
          </div>
        </div>

        <div className="p-3">
          <h3 className="font-bold text-white truncate group-hover:text-red-400 transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
            <span>{year}</span>
            {genreId && (
              <>
                <span>•</span>
                <span>{getGenreNameAr(genreId)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  // Fetch data from TMDB
  const [trendingMovies, trendingTVShows] = await Promise.all([
    getTrendingMovies(),
    getTrendingTVShows(),
  ]);

  const featuredContent = [...trendingMovies.results.slice(0, 3), ...trendingTVShows.results.slice(0, 2)];
  const movies = trendingMovies.results.slice(0, 12);
  const series = trendingTVShows.results.slice(0, 12);

  // Get first featured item for hero
  const heroContent = trendingMovies.results[0];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      {heroContent && (
        <section className="relative h-[85vh] overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src={getImageUrl(heroContent.backdrop_path, 'original')}
              alt={heroContent.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
            <div className="max-w-2xl animate-fadeIn">
              <span className="inline-block px-3 py-1 rounded-full text-sm font-bold mb-4 bg-blue-600">
                فيلم
              </span>

              <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
                {heroContent.title}
              </h1>

              <div className="flex items-center gap-4 text-gray-300 mb-6">
                <span className="rating-badge">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {heroContent.vote_average.toFixed(1)}
                </span>
                <span>{heroContent.release_date?.split('-')[0]}</span>
                {heroContent.genre_ids?.[0] && (
                  <span className="category-badge">{getGenreNameAr(heroContent.genre_ids[0])}</span>
                )}
              </div>

              <p className="text-lg text-gray-300 mb-8 line-clamp-3">
                {heroContent.overview || 'لا يوجد وصف متاح'}
              </p>

              <div className="flex gap-4">
                <Link href={`/watch/movie/${heroContent.id}`} className="btn-primary text-lg px-8 py-4">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  شاهد الآن
                </Link>
                <Link href={`/watch/movie/${heroContent.id}`} className="btn-secondary text-lg px-8 py-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  تفاصيل
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Ad Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdPlaceholder size="medium" />
      </div>

      {/* Trending Movies Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="w-1 h-8 bg-red-600 rounded-full"></span>
            أفلام رائجة
          </h2>
          <Link href="/movies" className="text-red-500 hover:text-red-400 transition-colors flex items-center gap-1">
            عرض الكل
            <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="content-grid">
          {movies.map((movie) => (
            <ContentCard
              key={movie.id}
              id={movie.id}
              title={movie.title || movie.original_title}
              poster={getImageUrl(movie.poster_path)}
              type="movie"
              year={movie.release_date?.split('-')[0] || ''}
              rating={movie.vote_average}
              genreId={movie.genre_ids?.[0]}
            />
          ))}
        </div>
      </section>

      {/* Ad Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdPlaceholder size="large" />
      </div>

      {/* Trending Series Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="w-1 h-8 bg-purple-600 rounded-full"></span>
            مسلسلات رائجة
          </h2>
          <Link href="/series" className="text-red-500 hover:text-red-400 transition-colors flex items-center gap-1">
            عرض الكل
            <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="content-grid">
          {series.map((show) => (
            <ContentCard
              key={show.id}
              id={show.id}
              title={show.name || show.original_name}
              poster={getImageUrl(show.poster_path)}
              type="series"
              year={show.first_air_date?.split('-')[0] || ''}
              rating={show.vote_average}
              genreId={show.genre_ids?.[0]}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          لماذا OLK Films؟
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 glass rounded-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">مشاهدة مجانية</h3>
            <p className="text-gray-400">استمتع بمشاهدة آلاف الأفلام والمسلسلات مجاناً بدون اشتراك</p>
          </div>

          <div className="text-center p-6 glass rounded-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">جودة عالية</h3>
            <p className="text-gray-400">شاهد بجودة HD و 4K على جميع الأجهزة</p>
          </div>

          <div className="text-center p-6 glass rounded-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">تحديث مستمر</h3>
            <p className="text-gray-400">محتوى جديد يُضاف يومياً من أحدث الإصدارات</p>
          </div>
        </div>
      </section>
    </div>
  );
}

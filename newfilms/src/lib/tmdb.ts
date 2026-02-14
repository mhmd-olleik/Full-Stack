const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    vote_average: number;
    vote_count: number;
    genre_ids: number[];
    popularity: number;
    adult: boolean;
}

export interface TMDBTVShow {
    id: number;
    name: string;
    original_name: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    first_air_date: string;
    vote_average: number;
    vote_count: number;
    genre_ids: number[];
    popularity: number;
}

export interface TMDBResponse<T> {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
    runtime: number;
    genres: { id: number; name: string }[];
    production_countries: { iso_3166_1: string; name: string }[];
    videos?: {
        results: { key: string; site: string; type: string }[];
    };
}

export interface TMDBTVDetails extends TMDBTVShow {
    number_of_seasons: number;
    number_of_episodes: number;
    genres: { id: number; name: string }[];
    seasons: {
        id: number;
        name: string;
        season_number: number;
        episode_count: number;
        poster_path: string | null;
    }[];
    videos?: {
        results: { key: string; site: string; type: string }[];
    };
}

// Genre mappings (English to Arabic)
const genreMapAr: Record<number, string> = {
    28: 'أكشن',
    12: 'مغامرة',
    16: 'أنيميشن',
    35: 'كوميديا',
    80: 'جريمة',
    99: 'وثائقي',
    18: 'دراما',
    10751: 'عائلي',
    14: 'فانتازيا',
    36: 'تاريخي',
    27: 'رعب',
    10402: 'موسيقي',
    9648: 'غموض',
    10749: 'رومانسي',
    878: 'خيال علمي',
    10770: 'تلفزيوني',
    53: 'إثارة',
    10752: 'حرب',
    37: 'غربي',
    10759: 'أكشن ومغامرة',
    10762: 'أطفال',
    10763: 'أخبار',
    10764: 'واقعي',
    10765: 'خيال علمي وفانتازيا',
    10766: 'مسلسل',
    10767: 'حوار',
    10768: 'سياسة وحرب',
};

export function getImageUrl(path: string | null, size: 'w200' | 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string {
    if (!path) return '/placeholder-poster.jpg';
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getGenreNameAr(genreId: number): string {
    return genreMapAr[genreId] || 'أخرى';
}

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.set('api_key', TMDB_API_KEY || '');
    url.searchParams.set('language', 'ar-SA');

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), { next: { revalidate: 3600 } });

    if (!response.ok) {
        throw new Error(`TMDB API Error: ${response.status}`);
    }

    return response.json();
}

// Movies
export async function getTrendingMovies(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchTMDB<TMDBResponse<TMDBMovie>>('/trending/movie/week', { page: page.toString() });
}

export async function getPopularMovies(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchTMDB<TMDBResponse<TMDBMovie>>('/movie/popular', { page: page.toString() });
}

export async function getTopRatedMovies(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchTMDB<TMDBResponse<TMDBMovie>>('/movie/top_rated', { page: page.toString() });
}

export async function getNowPlayingMovies(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchTMDB<TMDBResponse<TMDBMovie>>('/movie/now_playing', { page: page.toString() });
}

export async function getUpcomingMovies(page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchTMDB<TMDBResponse<TMDBMovie>>('/movie/upcoming', { page: page.toString() });
}

export async function getMovieDetails(id: number): Promise<TMDBMovieDetails> {
    return fetchTMDB<TMDBMovieDetails>(`/movie/${id}`, { append_to_response: 'videos' });
}

export async function getMoviesByGenre(genreId: number, page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', {
        with_genres: genreId.toString(),
        page: page.toString(),
        sort_by: 'popularity.desc'
    });
}

// TV Shows
export async function getTrendingTVShows(page = 1): Promise<TMDBResponse<TMDBTVShow>> {
    return fetchTMDB<TMDBResponse<TMDBTVShow>>('/trending/tv/week', { page: page.toString() });
}

export async function getPopularTVShows(page = 1): Promise<TMDBResponse<TMDBTVShow>> {
    return fetchTMDB<TMDBResponse<TMDBTVShow>>('/tv/popular', { page: page.toString() });
}

export async function getTopRatedTVShows(page = 1): Promise<TMDBResponse<TMDBTVShow>> {
    return fetchTMDB<TMDBResponse<TMDBTVShow>>('/tv/top_rated', { page: page.toString() });
}

export async function getOnTheAirTVShows(page = 1): Promise<TMDBResponse<TMDBTVShow>> {
    return fetchTMDB<TMDBResponse<TMDBTVShow>>('/tv/on_the_air', { page: page.toString() });
}

export async function getTVShowDetails(id: number): Promise<TMDBTVDetails> {
    return fetchTMDB<TMDBTVDetails>(`/tv/${id}`, { append_to_response: 'videos' });
}

export async function getTVShowsByGenre(genreId: number, page = 1): Promise<TMDBResponse<TMDBTVShow>> {
    return fetchTMDB<TMDBResponse<TMDBTVShow>>('/discover/tv', {
        with_genres: genreId.toString(),
        page: page.toString(),
        sort_by: 'popularity.desc'
    });
}

// Search
export async function searchMovies(query: string, page = 1): Promise<TMDBResponse<TMDBMovie>> {
    return fetchTMDB<TMDBResponse<TMDBMovie>>('/search/movie', { query, page: page.toString() });
}

export async function searchTVShows(query: string, page = 1): Promise<TMDBResponse<TMDBTVShow>> {
    return fetchTMDB<TMDBResponse<TMDBTVShow>>('/search/tv', { query, page: page.toString() });
}

export async function searchMulti(query: string, page = 1): Promise<TMDBResponse<TMDBMovie | TMDBTVShow>> {
    return fetchTMDB<TMDBResponse<TMDBMovie | TMDBTVShow>>('/search/multi', { query, page: page.toString() });
}

// Get trailer URL
export function getTrailerUrl(videos?: { results: { key: string; site: string; type: string }[] }): string | null {
    if (!videos?.results?.length) return null;

    const trailer = videos.results.find(
        v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );

    if (trailer) {
        return `https://www.youtube.com/embed/${trailer.key}`;
    }

    return null;
}

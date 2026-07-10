// ============================================
// API Layer — TMDB + Embed Providers + Fallback Data
// ============================================

const API = {
  // TMDB Configuration — Get your free key at https://www.themoviedb.org/settings/api
  TMDB_BASE: 'https://api.themoviedb.org/3',
  TMDB_KEY: localStorage.getItem('tmdb_api_key') || '',
  TMDB_IMG: 'https://image.tmdb.org/t/p',

  // Embed Providers (free streaming servers)
  SERVERS: [
    { name: 'VidCore', id: 'vidcore', icon: '🎬' },
    { name: 'Cine.su', id: 'cinesu', icon: '🎥' },
    { name: 'Embed SU', id: 'embedsu', icon: '📺' },
    { name: 'AutoEmbed', id: 'autoembed', icon: '⚡' },
    { name: 'NontonGo', id: 'nontongo', icon: '🎞️' },
    { name: '2Embed', id: '2embed', icon: '🌐' },
  ],

  setApiKey(key) {
    this.TMDB_KEY = key;
    localStorage.setItem('tmdb_api_key', key);
  },

  // ---- Image Helpers ----
  img(path, size = 'w500') {
    if (!path) return this.placeholder();
    return `${this.TMDB_IMG}/${size}${path}`;
  },

  backdrop(path) {
    if (!path) return '';
    return `${this.TMDB_IMG}/original${path}`;
  },

  placeholder() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%231a1a2e'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b6b80' font-family='sans-serif' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
  },

  // ---- TMDB API Calls ----
  async fetch(endpoint, params = {}) {
    if (!this.TMDB_KEY) return null;

    const url = new URL(`${this.TMDB_BASE}${endpoint}`);
    url.searchParams.set('api_key', this.TMDB_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('TMDB API Error:', err);
      return null;
    }
  },

  // ---- API methods with fallback ----
  async getTrending(type = 'all', time = 'week', page = 1) {
    const data = await this.fetch(`/trending/${type}/${time}`, { page });
    return data || { results: this.FALLBACK_DATA.trending, total_pages: 1 };
  },

  async getPopular(type = 'movie', page = 1) {
    const data = await this.fetch(`/${type}/popular`, { page });
    return data || { results: type === 'movie' ? this.FALLBACK_DATA.movies : this.FALLBACK_DATA.tvshows, total_pages: 1 };
  },

  async getTopRated(type = 'movie', page = 1) {
    const data = await this.fetch(`/${type}/top_rated`, { page });
    return data || { results: this.FALLBACK_DATA.topRated, total_pages: 1 };
  },

  async getNowPlaying(page = 1) {
    const data = await this.fetch('/movie/now_playing', { page });
    return data || { results: this.FALLBACK_DATA.nowPlaying, total_pages: 1 };
  },

  async getAiringToday(page = 1) {
    const data = await this.fetch('/tv/airing_today', { page });
    return data || { results: this.FALLBACK_DATA.tvshows, total_pages: 1 };
  },

  async search(query, page = 1, type = 'multi') {
    if (!query) return null;
    const data = await this.fetch(`/search/${type}`, { query, page });
    if (data) return data;
    // Fallback search
    const allItems = [...this.FALLBACK_DATA.trending, ...this.FALLBACK_DATA.movies, ...this.FALLBACK_DATA.tvshows];
    const q = query.toLowerCase();
    const filtered = allItems.filter(item => (item.title || item.name || '').toLowerCase().includes(q));
    return { results: filtered, total_results: filtered.length, total_pages: 1 };
  },

  async getDetails(type, id) {
    const data = await this.fetch(`/${type}/${id}`, { append_to_response: 'credits,videos,recommendations,similar' });
    if (data) return data;
    // Fallback details
    const allItems = [...this.FALLBACK_DATA.trending, ...this.FALLBACK_DATA.movies, ...this.FALLBACK_DATA.tvshows, ...this.FALLBACK_DATA.topRated, ...this.FALLBACK_DATA.nowPlaying];
    const item = allItems.find(i => i.id == id);
    if (item) {
      return {
        ...item,
        genres: (item.genre_ids || []).map(gid => ({ id: gid, name: this.getGenreName(gid, type) })),
        recommendations: { results: allItems.filter(i => i.id != id).slice(0, 8) },
        seasons: type === 'tv' ? [
          { season_number: 1, episode_count: 10 },
          { season_number: 2, episode_count: 10 },
        ] : undefined,
      };
    }
    return null;
  },

  async getSeasonDetails(tvId, seasonNum) {
    const data = await this.fetch(`/tv/${tvId}/season/${seasonNum}`);
    if (data) return data;
    // Fallback episodes
    return {
      episodes: Array.from({ length: 10 }, (_, i) => ({
        episode_number: i + 1,
        name: `Episode ${i + 1}`,
        overview: 'Episode description will appear when connected to TMDB API.',
        still_path: null,
      }))
    };
  },

  async getGenres(type = 'movie') {
    const data = await this.fetch(`/genre/${type}/list`);
    if (data) return data;
    const map = type === 'movie' ? this.MOVIE_GENRES : this.TV_GENRES;
    return { genres: Object.entries(map).map(([id, name]) => ({ id: parseInt(id), name })) };
  },

  async discoverByGenre(type = 'movie', genreId, page = 1) {
    const data = await this.fetch(`/discover/${type}`, { with_genres: genreId, page, sort_by: 'popularity.desc' });
    if (data) return data;
    const allItems = type === 'movie' ? this.FALLBACK_DATA.movies : this.FALLBACK_DATA.tvshows;
    const filtered = allItems.filter(i => (i.genre_ids || []).includes(parseInt(genreId)));
    return { results: filtered.length > 0 ? filtered : allItems, total_pages: 1 };
  },

  // ---- Embed URL Generators ----
  getEmbedUrl(serverId, type, tmdbId, season = null, episode = null) {
    const isTv = type === 'tv';

    switch (serverId) {
      case 'vidcore':
        if (isTv && season && episode) return `https://vidcore.org/embed/tv/${tmdbId}/${season}/${episode}`;
        return `https://vidcore.org/embed/movie/${tmdbId}`;

      case 'cinesu':
        if (isTv && season && episode) return `https://cine.su/embed/tv/${tmdbId}/${season}/${episode}`;
        return `https://cine.su/embed/movie/${tmdbId}`;

      case 'embedsu':
        if (isTv && season && episode) return `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`;
        return `https://embed.su/embed/movie/${tmdbId}`;

      case 'autoembed':
        if (isTv && season && episode) return `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`;
        return `https://player.autoembed.cc/embed/movie/${tmdbId}`;

      case 'nontongo':
        if (isTv && season && episode) return `https://www.NontonGo.win/embed/tv/${tmdbId}/${season}/${episode}`;
        return `https://www.NontonGo.win/embed/movie/${tmdbId}`;

      case '2embed':
        if (isTv && season && episode) return `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`;
        return `https://www.2embed.cc/embed/${tmdbId}`;

      default:
        return this.getEmbedUrl('vidcore', type, tmdbId, season, episode);
    }
  },

  getAllServers(type, tmdbId, season = null, episode = null) {
    return this.SERVERS.map(server => ({
      ...server,
      url: this.getEmbedUrl(server.id, type, tmdbId, season, episode)
    }));
  },

  // ---- Genre Maps ----
  MOVIE_GENRES: {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western'
  },

  TV_GENRES: {
    10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids',
    9648: 'Mystery', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
    10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics', 37: 'Western'
  },

  getGenreName(id, type = 'movie') {
    const map = type === 'movie' ? this.MOVIE_GENRES : this.TV_GENRES;
    return map[id] || 'Unknown';
  },

  // ============================================
  // FALLBACK DATA — Used when TMDB API key is not set
  // ============================================
  FALLBACK_DATA: {
    trending: [
      { id: 912649, title: 'Venom: The Last Dance', media_type: 'movie', overview: 'Eddie and Venom are on the run. Hunted by both of their worlds and with the net closing in, the duo are forced into a devastating decision that will bring the curtains down on Venom and Eddie\'s last dance.', poster_path: '/aosm8NMQ3UyoBVpSxyimorCQykC.jpg', backdrop_path: '/3V4kLQg0kSqPLctI5ziYWabAZYF.jpg', vote_average: 6.4, release_date: '2024-10-22', genre_ids: [28, 878, 12] },
      { id: 1184918, title: 'The Wild Robot', media_type: 'movie', overview: 'After a shipwreck, an intelligent robot called Roz is stranded on an uninhabited island. To survive the harsh environment, Roz bonds with the island\'s animals and cares for an orphaned baby goose.', poster_path: '/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg', backdrop_path: '/4zlOPT9CrtIzs0f3Eui6pZAkfAZ.jpg', vote_average: 8.5, release_date: '2024-09-12', genre_ids: [16, 878, 10751] },
      { id: 533535, title: 'Deadpool & Wolverine', media_type: 'movie', overview: 'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit up again.', poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', backdrop_path: '/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg', vote_average: 7.7, release_date: '2024-07-24', genre_ids: [28, 35, 878] },
      { id: 1034541, title: 'Terrifier 3', media_type: 'movie', overview: 'Five years after surviving Art the Clown\'s Halloween massacre, Sienna Shaw is struggling to rebuild her shattered life. As Christmas approaches, she tries to embrace the holiday spirit, but the festive season turns into a new nightmare.', poster_path: '/63xYQj1BwRFielxsBDXvHIJyXVm.jpg', backdrop_path: '/18TSJF1WLA2I1IT2GQHQ3GN6MXQ.jpg', vote_average: 7.0, release_date: '2024-10-09', genre_ids: [27, 53] },
      { id: 698687, title: 'Transformers One', media_type: 'movie', overview: 'The untold origin story of Optimus Prime and Megatron, better known as sworn enemies, but once were friends bonded like brothers who changed the fate of Cybertron forever.', poster_path: '/qbkAqmmEIZfrCO8ZQAuIuVMlWoV.jpg', backdrop_path: '/2BbMESLqSB2gNTEEXw3FLp8V75f.jpg', vote_average: 8.1, release_date: '2024-09-11', genre_ids: [16, 878, 12, 28] },
      { id: 976734, title: 'Canary Black', media_type: 'movie', overview: 'Top level CIA agent Avery Graves is blackmailed by terrorists into betraying her own country to save her kidnapped husband.', poster_path: '/hhiR6uUbTYYvKoACkdAIQPS5c6f.jpg', backdrop_path: '/vKfR7P45cU8KvHkgnO1iFNkRQXz.jpg', vote_average: 6.7, release_date: '2024-10-10', genre_ids: [28, 53] },
      { id: 945961, title: 'Alien: Romulus', media_type: 'movie', overview: 'While scavenging the deep ends of a derelict space station, a group of young space colonizers come face to face with the most terrifying life form in the universe.', poster_path: '/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg', backdrop_path: '/9SSEUrSqhljBMzRe4aBTh17Bo6H.jpg', vote_average: 7.2, release_date: '2024-08-13', genre_ids: [27, 878] },
      { id: 1100782, title: 'Smile 2', media_type: 'movie', overview: 'About to embark on a new world tour, global pop sensation Skye Riley begins experiencing increasingly terrifying and inexplicable events.', poster_path: '/ht8Ail6hCAHACKQXfM11nFcLfWq.jpg', backdrop_path: '/50VB3bXC4PYDKPezJxwOqM6oHLg.jpg', vote_average: 6.8, release_date: '2024-10-16', genre_ids: [27, 9648] },
      { id: 402431, title: 'Wicked', media_type: 'movie', overview: 'In the land of Oz, ostracized and misunderstood green-skinned Elphaba is forced to share a room with the extremely popular Galinda at Shiz University.', poster_path: '/xDGbZ0JJ3mYaGKy4Nzd9Kph6M9L.jpg', backdrop_path: '/c6wqFk3PfGKtuyG7yYU7VXfSGgH.jpg', vote_average: 7.6, release_date: '2024-11-20', genre_ids: [18, 14, 10749] },
      { id: 278, title: 'The Shawshank Redemption', media_type: 'movie', overview: 'Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.', poster_path: '/9cjIGRjdCPVHMJFBFGhUFYqMSuA.jpg', backdrop_path: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', vote_average: 8.7, release_date: '1994-09-23', genre_ids: [18, 80] },
      { id: 238, title: 'The Godfather', media_type: 'movie', overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.', poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg', vote_average: 8.7, release_date: '1972-03-14', genre_ids: [18, 80] },
      { id: 155, title: 'The Dark Knight', media_type: 'movie', overview: 'Batman raises the stakes in his war on crime, with the help of Lt. Jim Gordon and District Attorney Harvey Dent.', poster_path: '/qJ2tW6WMUDux911BTUgMe1nOrai.jpg', backdrop_path: '/nMKdUUepR0i5zn0y1T4CsSB5ez.jpg', vote_average: 8.5, release_date: '2008-07-16', genre_ids: [18, 28, 80, 53] },
    ],
    movies: [
      { id: 550, title: 'Fight Club', overview: 'A ticking-Loss insomnia-Loss. An insomniac office worker and a devil-may-care soapmaker form an underground fight club.', poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', backdrop_path: '/52AfXWnXi1Hy9QnDv1iUd0dNLIa.jpg', vote_average: 8.4, release_date: '1999-10-15', genre_ids: [18, 53, 35], media_type: 'movie' },
      { id: 680, title: 'Pulp Fiction', overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.', poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', backdrop_path: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', vote_average: 8.5, release_date: '1994-09-10', genre_ids: [53, 80], media_type: 'movie' },
      { id: 13, title: 'Forrest Gump', overview: 'A man with a low IQ has accomplished great things in his life and been present during significant historic events.', poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', backdrop_path: '/qdIMHd4sEfJSckfVJfKQvisL02a.jpg', vote_average: 8.5, release_date: '1994-06-23', genre_ids: [35, 18, 10749], media_type: 'movie' },
      { id: 157336, title: 'Interstellar', overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.', poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', backdrop_path: '/xJHokMbljXjADYdit5fK1B4FyZu.jpg', vote_average: 8.4, release_date: '2014-11-05', genre_ids: [12, 18, 878], media_type: 'movie' },
      { id: 27205, title: 'Inception', overview: 'A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.', poster_path: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg', backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg', vote_average: 8.4, release_date: '2010-07-15', genre_ids: [28, 878, 12], media_type: 'movie' },
      { id: 603, title: 'The Matrix', overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.', poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', backdrop_path: '/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg', vote_average: 8.2, release_date: '1999-03-30', genre_ids: [28, 878], media_type: 'movie' },
      { id: 429, title: 'The Good, the Bad and the Ugly', overview: 'While the Civil War rages, three men – a quiet loner, a ruthless hitman, and a Mexican bandit – comb the American Southwest in search of a buried fortune.', poster_path: '/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg', backdrop_path: '/eMXhkn0mp5QE1rVhkYmTIRWjlUJ.jpg', vote_average: 8.5, release_date: '1966-12-23', genre_ids: [37], media_type: 'movie' },
      { id: 496243, title: 'Parasite', overview: 'All unemployed, Ki-taek\'s family takes a peculiar interest in the wealthy and glamorous Parks.', poster_path: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', backdrop_path: '/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg', vote_average: 8.5, release_date: '2019-05-30', genre_ids: [35, 53, 18], media_type: 'movie' },
      { id: 122, title: 'The Lord of the Rings: Return of the King', overview: 'Gandalf and Aragorn lead the World of Men against Sauron\'s army to draw his gaze from Frodo and Sam as they approach Mount Doom.', poster_path: '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg', backdrop_path: '/pm0RiwNpSja8gR0BTWpxo5a9Bbl.jpg', vote_average: 8.5, release_date: '2003-12-01', genre_ids: [12, 14, 28], media_type: 'movie' },
      { id: 240, title: 'The Godfather Part II', overview: 'In the continuing saga of the Corleone crime family, a young Vito Corleone grows up in Sicily and in 1910s New York.', poster_path: '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg', backdrop_path: '/kGzFbGhp99zva6oZODW5atUtnqi.jpg', vote_average: 8.6, release_date: '1974-12-20', genre_ids: [18, 80], media_type: 'movie' },
      { id: 569094, title: 'Spider-Man: Across the Spider-Verse', overview: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.', poster_path: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', backdrop_path: '/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg', vote_average: 8.4, release_date: '2023-05-31', genre_ids: [16, 28, 12], media_type: 'movie' },
      { id: 872585, title: 'Oppenheimer', overview: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.', poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', backdrop_path: '/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg', vote_average: 8.1, release_date: '2023-07-19', genre_ids: [18, 36], media_type: 'movie' },
      { id: 346698, title: 'Barbie', overview: 'Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land.', poster_path: '/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg', backdrop_path: '/nHf61UzkfFno5X1ofIhugCPus2R.jpg', vote_average: 7.0, release_date: '2023-07-19', genre_ids: [35, 12, 14], media_type: 'movie' },
      { id: 901362, title: 'Trolls Band Together', overview: 'When Branch\'s brother Floyd is kidnapped by pop-star villains, Branch and Poppy embark on a journey to reunite his family.', poster_path: '/bkpPTZUdq31UGDovmszsg2CchiI.jpg', backdrop_path: '/t9YjGl5L8i35c7VgPUXDQvLymse.jpg', vote_average: 7.1, release_date: '2023-10-12', genre_ids: [16, 35, 10751, 10402], media_type: 'movie' },
      { id: 466420, title: 'Killers of the Flower Moon', overview: 'When oil is discovered in 1920s Oklahoma under Osage Nation land, the Osage people are murdered one by one.', poster_path: '/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg', backdrop_path: '/1X7vow16X7CnCoexXh4H4F2yDJv.jpg', vote_average: 7.5, release_date: '2023-10-18', genre_ids: [80, 18, 36], media_type: 'movie' },
      { id: 940721, title: 'Godzilla Minus One', overview: 'In postwar Japan, a new terror rises. Can the devastated people defend themselves against Godzilla?', poster_path: '/hkxxMIGaiCTmrEArK7J56JTKUlB.jpg', backdrop_path: '/fY3lD0jM5AoHJMunjGWqJ0hRk3.jpg', vote_average: 7.9, release_date: '2023-11-03', genre_ids: [878, 28, 18], media_type: 'movie' },
      { id: 787699, title: 'Wonka', overview: 'Willy Wonka – chock-full of ideas and determined to change the world – arrives at a town where the finest chocolate bars come from the most fiendish thieves.', poster_path: '/qhb1qOilapbapxWQn9jtRCMwXJF.jpg', backdrop_path: '/yOm993lsJyPmBodlYjgpPwBjI0P.jpg', vote_average: 7.2, release_date: '2023-12-06', genre_ids: [35, 10751, 14], media_type: 'movie' },
      { id: 609681, title: 'The Marvels', overview: 'Carol Danvers, aka Captain Marvel, has reclaimed her identity from the tyrannical Kree.', poster_path: '/Ag3D9qXpaj1Yk3LMTvp0ivjH0IQ.jpg', backdrop_path: '/eSVu1FvGPy86TDo4hQbpuHx55DJ.jpg', vote_average: 6.2, release_date: '2023-11-08', genre_ids: [28, 12, 878], media_type: 'movie' },
    ],
    tvshows: [
      { id: 1396, name: 'Breaking Bad', media_type: 'tv', overview: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.', poster_path: '/ztkUQFLlC19CCMYHW73GM1HBGld.jpg', backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', vote_average: 8.9, first_air_date: '2008-01-20', genre_ids: [18, 80] },
      { id: 94997, name: 'House of the Dragon', media_type: 'tv', overview: 'The story of the Targaryen civil war that took place about 200 years before events portrayed in Game of Thrones.', poster_path: '/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg', backdrop_path: '/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg', vote_average: 8.4, first_air_date: '2022-08-21', genre_ids: [10765, 18, 10759] },
      { id: 1399, name: 'Game of Thrones', media_type: 'tv', overview: 'Seven noble families fight for control of the mythical land of Westeros.', poster_path: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', backdrop_path: '/2OMB0ynKlyIenMJWI2Dv9usRi5K.jpg', vote_average: 8.4, first_air_date: '2011-04-17', genre_ids: [10765, 18, 10759] },
      { id: 76479, name: 'The Boys', media_type: 'tv', overview: 'A group of vigilantes known informally as "The Boys" set out to take down corrupt superheroes.', poster_path: '/stTEycfG9Ev3OogFAucKOlAjhBH.jpg', backdrop_path: '/7q448EVOnuE3gVAx24krzO7SNXM.jpg', vote_average: 8.5, first_air_date: '2019-07-25', genre_ids: [10765, 10759] },
      { id: 84958, name: 'Loki', media_type: 'tv', overview: 'After stealing the Tesseract during the events of "Avengers: Endgame," Loki is brought before the TVA.', poster_path: '/voHUmluYmKyleFkTu3lOXQG702u.jpg', backdrop_path: '/q3jHCb4dMfYF6ojikKuHd6LscxC.jpg', vote_average: 8.2, first_air_date: '2021-06-09', genre_ids: [18, 10765, 10759] },
      { id: 60735, name: 'The Flash', media_type: 'tv', overview: 'After a particle accelerator causes a freak storm, CSI Investigator Barry Allen is struck by lightning and falls into a coma.', poster_path: '/rg8N7u5GFCiCjPGFIbssmGJoGAb.jpg', backdrop_path: '/z59kJfcElR9eHO9rJbWp4qWMuee.jpg', vote_average: 7.8, first_air_date: '2014-10-07', genre_ids: [18, 10765] },
      { id: 100088, name: 'The Last of Us', media_type: 'tv', overview: 'Joel is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone.', poster_path: '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg', backdrop_path: '/uDgy6hyPd82kOHh6I95FLtxnviZ.jpg', vote_average: 8.6, first_air_date: '2023-01-15', genre_ids: [18, 10765, 10759] },
      { id: 71912, name: 'The Witcher', media_type: 'tv', overview: 'Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world of beasts and humans.', poster_path: '/7vjaCdMw15FEbXyLQTVa04URsPm.jpg', backdrop_path: '/jBJWaqoSCiARWtfV0GlqHrcdiJq.jpg', vote_average: 8.1, first_air_date: '2019-12-20', genre_ids: [10765, 18, 10759] },
      { id: 93405, name: 'Squid Game', media_type: 'tv', overview: 'Hundreds of cash-strapped players accept a strange invitation to compete in children\'s games for a tempting prize.', poster_path: '/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg', backdrop_path: '/oaGvjB0DvdhXhOAuADfHb261ZHa.jpg', vote_average: 7.8, first_air_date: '2021-09-17', genre_ids: [10759, 9648, 18] },
      { id: 85552, name: 'Euphoria', media_type: 'tv', overview: 'A group of high school students navigate love and friendships in a world of drugs, sex, trauma, and social media.', poster_path: '/jtnfNzqZwN4E32FGGxx1YZaBWWf.jpg', backdrop_path: '/oKt4J3TFjWirVwBqoHyIvv5IImd.jpg', vote_average: 8.4, first_air_date: '2019-06-16', genre_ids: [18] },
      { id: 246, name: 'Avatar: The Last Airbender', media_type: 'tv', overview: 'In a war-torn world of elemental magic, a young boy reawakens to undertake a dangerous mystic quest.', poster_path: '/cHFMh5zp9YMmYxjEhPRSFsKSf5e.jpg', backdrop_path: '/4dXiYXGaHHNVhPRAxQdIK1IwwEH.jpg', vote_average: 8.7, first_air_date: '2005-02-21', genre_ids: [16, 10759, 10765] },
      { id: 37854, name: 'One Piece', media_type: 'tv', overview: 'Monkey D. Luffy sails with his crew of Straw Hat Pirates through the Grand Line to find the treasure One Piece.', poster_path: '/e3NBGiAifW9Xt8xD5tpARskjccO.jpg', backdrop_path: '/2rmK7mnchw9Xr3XdiTFSxTTLXqv.jpg', vote_average: 8.7, first_air_date: '1999-10-20', genre_ids: [16, 10759, 35] },
    ],
    topRated: [
      { id: 278, title: 'The Shawshank Redemption', overview: 'Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.', poster_path: '/9cjIGRjdCPVHMJFBFGhUFYqMSuA.jpg', backdrop_path: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', vote_average: 8.7, release_date: '1994-09-23', genre_ids: [18, 80], media_type: 'movie' },
      { id: 238, title: 'The Godfather', overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.', poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg', vote_average: 8.7, release_date: '1972-03-14', genre_ids: [18, 80], media_type: 'movie' },
      { id: 240, title: 'The Godfather Part II', overview: 'In the continuing saga of the Corleone crime family, a young Vito Corleone grows up in Sicily and in 1910s New York.', poster_path: '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg', backdrop_path: '/kGzFbGhp99zva6oZODW5atUtnqi.jpg', vote_average: 8.6, release_date: '1974-12-20', genre_ids: [18, 80], media_type: 'movie' },
      { id: 424, title: 'Schindler\'s List', overview: 'The true story of how businessman Oskar Schindler saved over a thousand Jewish lives from the Nazis.', poster_path: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', backdrop_path: '/loRmRzQXZeqG78TqZuB3KrssBBr.jpg', vote_average: 8.6, release_date: '1993-11-30', genre_ids: [18, 36, 10752], media_type: 'movie' },
      { id: 19404, title: '12 Angry Men', overview: 'The defense and the prosecution have rested and the jury is filing into the jury room to decide if a young man is guilty or innocent of murdering his father.', poster_path: '/ppd84D2i9W8jXmsyInGyihiSyqz.jpg', backdrop_path: '/qqHQsStV6exghCM7bIhZP5GWKV.jpg', vote_average: 8.5, release_date: '1957-04-10', genre_ids: [18], media_type: 'movie' },
      { id: 155, title: 'The Dark Knight', overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.', poster_path: '/qJ2tW6WMUDux911BTUgMe1nOrai.jpg', backdrop_path: '/nMKdUUepR0i5zn0y1T4CsSB5ez.jpg', vote_average: 8.5, release_date: '2008-07-16', genre_ids: [18, 28, 80, 53], media_type: 'movie' },
      { id: 680, title: 'Pulp Fiction', overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.', poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', backdrop_path: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', vote_average: 8.5, release_date: '1994-09-10', genre_ids: [53, 80], media_type: 'movie' },
      { id: 122, title: 'The Lord of the Rings: Return of the King', overview: 'Gandalf and Aragorn lead the World of Men against Sauron\'s army.', poster_path: '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg', backdrop_path: '/pm0RiwNpSja8gR0BTWpxo5a9Bbl.jpg', vote_average: 8.5, release_date: '2003-12-01', genre_ids: [12, 14, 28], media_type: 'movie' },
      { id: 13, title: 'Forrest Gump', overview: 'A man with a low IQ has accomplished great things in his life.', poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', backdrop_path: '/qdIMHd4sEfJSckfVJfKQvisL02a.jpg', vote_average: 8.5, release_date: '1994-06-23', genre_ids: [35, 18, 10749], media_type: 'movie' },
      { id: 429, title: 'The Good, the Bad and the Ugly', overview: 'While the Civil War rages, three men comb the American Southwest in search of a buried fortune.', poster_path: '/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg', backdrop_path: '/eMXhkn0mp5QE1rVhkYmTIRWjlUJ.jpg', vote_average: 8.5, release_date: '1966-12-23', genre_ids: [37], media_type: 'movie' },
      { id: 157336, title: 'Interstellar', overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.', poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', backdrop_path: '/xJHokMbljXjADYdit5fK1B4FyZu.jpg', vote_average: 8.4, release_date: '2014-11-05', genre_ids: [12, 18, 878], media_type: 'movie' },
      { id: 550, title: 'Fight Club', overview: 'An insomniac office worker and a devil-may-care soapmaker form an underground fight club.', poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', backdrop_path: '/52AfXWnXi1Hy9QnDv1iUd0dNLIa.jpg', vote_average: 8.4, release_date: '1999-10-15', genre_ids: [18, 53, 35], media_type: 'movie' },
    ],
    nowPlaying: [
      { id: 912649, title: 'Venom: The Last Dance', overview: 'Eddie and Venom are on the run.', poster_path: '/aosm8NMQ3UyoBVpSxyimorCQykC.jpg', backdrop_path: '/3V4kLQg0kSqPLctI5ziYWabAZYF.jpg', vote_average: 6.4, release_date: '2024-10-22', genre_ids: [28, 878, 12], media_type: 'movie' },
      { id: 1184918, title: 'The Wild Robot', overview: 'After a shipwreck, an intelligent robot called Roz is stranded on an uninhabited island.', poster_path: '/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg', backdrop_path: '/4zlOPT9CrtIzs0f3Eui6pZAkfAZ.jpg', vote_average: 8.5, release_date: '2024-09-12', genre_ids: [16, 878, 10751], media_type: 'movie' },
      { id: 1034541, title: 'Terrifier 3', overview: 'Five years after surviving Art the Clown\'s Halloween massacre.', poster_path: '/63xYQj1BwRFielxsBDXvHIJyXVm.jpg', backdrop_path: '/18TSJF1WLA2I1IT2GQHQ3GN6MXQ.jpg', vote_average: 7.0, release_date: '2024-10-09', genre_ids: [27, 53], media_type: 'movie' },
      { id: 698687, title: 'Transformers One', overview: 'The untold origin story of Optimus Prime and Megatron.', poster_path: '/qbkAqmmEIZfrCO8ZQAuIuVMlWoV.jpg', backdrop_path: '/2BbMESLqSB2gNTEEXw3FLp8V75f.jpg', vote_average: 8.1, release_date: '2024-09-11', genre_ids: [16, 878, 12, 28], media_type: 'movie' },
      { id: 976734, title: 'Canary Black', overview: 'Top level CIA agent Avery Graves is blackmailed by terrorists.', poster_path: '/hhiR6uUbTYYvKoACkdAIQPS5c6f.jpg', backdrop_path: '/vKfR7P45cU8KvHkgnO1iFNkRQXz.jpg', vote_average: 6.7, release_date: '2024-10-10', genre_ids: [28, 53], media_type: 'movie' },
      { id: 945961, title: 'Alien: Romulus', overview: 'While scavenging, a group of young colonizers face the most terrifying alien.', poster_path: '/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg', backdrop_path: '/9SSEUrSqhljBMzRe4aBTh17Bo6H.jpg', vote_average: 7.2, release_date: '2024-08-13', genre_ids: [27, 878], media_type: 'movie' },
      { id: 1100782, title: 'Smile 2', overview: 'Pop sensation Skye Riley experiences increasingly terrifying events.', poster_path: '/ht8Ail6hCAHACKQXfM11nFcLfWq.jpg', backdrop_path: '/50VB3bXC4PYDKPezJxwOqM6oHLg.jpg', vote_average: 6.8, release_date: '2024-10-16', genre_ids: [27, 9648], media_type: 'movie' },
      { id: 402431, title: 'Wicked', overview: 'In Oz, green-skinned Elphaba shares a room with the extremely popular Galinda at Shiz University.', poster_path: '/xDGbZ0JJ3mYaGKy4Nzd9Kph6M9L.jpg', backdrop_path: '/c6wqFk3PfGKtuyG7yYU7VXfSGgH.jpg', vote_average: 7.6, release_date: '2024-11-20', genre_ids: [18, 14, 10749], media_type: 'movie' },
      { id: 533535, title: 'Deadpool & Wolverine', overview: 'Wade Wilson must reluctantly suit up again.', poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', backdrop_path: '/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg', vote_average: 7.7, release_date: '2024-07-24', genre_ids: [28, 35, 878], media_type: 'movie' },
      { id: 569094, title: 'Spider-Man: Across the Spider-Verse', overview: 'Miles Morales catapults across the Multiverse.', poster_path: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', backdrop_path: '/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg', vote_average: 8.4, release_date: '2023-05-31', genre_ids: [16, 28, 12], media_type: 'movie' },
      { id: 872585, title: 'Oppenheimer', overview: 'The story of J. Robert Oppenheimer and the atomic bomb.', poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', backdrop_path: '/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg', vote_average: 8.1, release_date: '2023-07-19', genre_ids: [18, 36], media_type: 'movie' },
      { id: 940721, title: 'Godzilla Minus One', overview: 'In postwar Japan, a new terror rises.', poster_path: '/hkxxMIGaiCTmrEArK7J56JTKUlB.jpg', backdrop_path: '/fY3lD0jM5AoHJMunjGWqJ0hRk3.jpg', vote_average: 7.9, release_date: '2023-11-03', genre_ids: [878, 28, 18], media_type: 'movie' },
    ],
  },
};

// Make available globally
window.API = API;

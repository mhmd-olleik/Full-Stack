// ============================================
// App — Main Router & Page Renderers
// ============================================

const App = {
  currentPage: null,
  searchTimeout: null,

  // ---- Initialize App ----
  init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.route());

    // Scroll behavior for navbar
    window.addEventListener('scroll', () => {
      const nav = document.querySelector('.navbar');
      const backToTop = document.querySelector('.back-to-top');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
      if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 400);
    });

    // Pre-load live TV channels from iptv-org API
    Channels.loadFromAPI().catch(e => console.warn('Channel preload:', e));

    // Initial route
    this.route();

    // Start hero slideshow
    this.heroInterval = null;
  },

  // ---- Router ----
  route() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);
    const page = parts[0] || '';
    const content = document.getElementById('appContent');

    if (!content) {
      console.warn('appContent not found, retrying...');
      setTimeout(() => this.route(), 100);
      return;
    }

    // Close mobile nav
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) navLinks.classList.remove('open');

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href === '#/' + page || (page === '' && href === '#/')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Route to page
    switch (page) {
      case '':
      case 'home':
        this.renderHome(content);
        break;
      case 'movies':
        this.renderBrowse(content, 'movie', parts[1]);
        break;
      case 'series':
        this.renderBrowse(content, 'tv', parts[1]);
        break;
      case 'anime':
        this.renderAnime(content);
        break;

      case 'livetv':
        this.renderLiveTV(content);
        break;
      case 'watch':
        this.renderWatch(content, parts[1], parts[2], parts[3], parts[4]);
        break;
      case 'channel':
        this.renderChannel(content, parts[1]);
        break;
      case 'search':
        this.renderSearch(content, parts[1]);
        break;
      case 'watchlist':
        this.renderWatchlist(content);
        break;
      default:
        content.innerHTML = this.render404();
    }
  },

  navigate(path) {
    window.location.hash = path;
  },

  // ---- Toast Notification ----
  showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✓</span> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  // ---- Skeleton Loading ----
  showSkeleton(content, count = 12) {
    const skeletons = Array(count).fill('').map(() => `
      <div class="skeleton-card">
        <div class="skeleton-poster"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-meta"></div>
      </div>
    `).join('');
    return `<div class="container page-transition"><div style="padding-top:32px;"><div class="content-grid">${skeletons}</div></div></div>`;
  },

  // ---- Content Card Generator ----
  contentCard(item, mediaType = null) {
    const type = mediaType || item.media_type || 'movie';
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').split('-')[0];
    const rating = item.vote_average?.toFixed(1);
    const watchUrl = type === 'tv' ? `/watch/tv/${item.id}/1/1` : `/watch/movie/${item.id}`;
    const isInWatchlist = Storage.isInWatchlist(item.id, type);

    return `
      <div class="content-card" onclick="App.navigate('${watchUrl}')">
        <div class="card-poster">
          <img src="${API.img(item.poster_path, 'w342')}" alt="${title}"
               loading="lazy" onerror="this.src='${API.placeholder()}'">
          <div class="card-poster-overlay">
            <div class="card-play-btn">▶</div>
          </div>
          <div class="card-badges">
            <span class="card-badge hd">HD</span>
          </div>
          ${rating ? `<div class="card-rating">⭐ ${rating}</div>` : ''}
        </div>
        <div class="card-info">
          <div class="card-title">${title}</div>
          <div class="card-meta">
            <span>${year || 'N/A'}</span>
            <span>•</span>
            <span>${type === 'tv' ? 'TV' : 'Movie'}</span>
          </div>
        </div>
      </div>
    `;
  },

  // ======================================
  // PAGE RENDERERS
  // ======================================

  // ---- HOME PAGE ----
  async renderHome(content) {
    document.title = 'IPTV World — Free Streaming, World Cup 2026 & Live TV';
    content.innerHTML = this.showSkeleton(content);

    // Fetch data in parallel
    const [trending, popular, topRated, nowPlaying, airingToday] = await Promise.all([
      API.getTrending('all', 'week'),
      API.getPopular('movie'),
      API.getTopRated('movie'),
      API.getNowPlaying(),
      API.getAiringToday(),
    ]);

    const heroItems = trending?.results?.slice(0, 5) || [];
    const trendingItems = trending?.results?.slice(5, 25) || [];
    const popularItems = popular?.results?.slice(0, 18) || [];
    const topRatedItems = topRated?.results?.slice(0, 12) || [];
    const nowPlayingItems = nowPlaying?.results?.slice(0, 12) || [];
    const airingItems = airingToday?.results?.slice(0, 12) || [];

    content.innerHTML = `
      <!-- Hero Slideshow -->
      <div class="hero" id="heroSlider">
        ${heroItems.map((item, i) => {
          const type = item.media_type || 'movie';
          const title = item.title || item.name;
          const year = (item.release_date || item.first_air_date || '').split('-')[0];
          const rating = item.vote_average?.toFixed(1);
          const watchUrl = type === 'tv' ? `/watch/tv/${item.id}/1/1` : `/watch/movie/${item.id}`;

          return `
            <div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
              <div class="hero-backdrop" style="background-image:url('${API.backdrop(item.backdrop_path)}')"></div>
              <div class="hero-content">
                <span class="hero-badge trending">🔥 Trending #${i + 1}</span>
                <h1 class="hero-title">${title}</h1>
                <div class="hero-meta">
                  <span class="rating">⭐ ${rating}</span>
                  <span>${year}</span>
                  <span class="quality">4K</span>
                  <span>${type === 'tv' ? '📺 TV Series' : '🎬 Movie'}</span>
                </div>
                <p class="hero-description">${item.overview || ''}</p>
                <div class="hero-actions">
                  <a href="#${watchUrl}" class="btn btn-primary btn-lg">▶ Watch Now</a>
                  <button class="btn btn-secondary btn-lg" onclick="event.stopPropagation(); App.quickBookmark(${item.id}, '${type}', '${title.replace(/'/g, "\\'")}', '${item.poster_path}', ${item.vote_average})">
                    🤍 Watchlist
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}

        <div class="hero-dots">
          ${heroItems.map((_, i) => `
            <div class="hero-dot ${i === 0 ? 'active' : ''}" onclick="App.goToSlide(${i})"></div>
          `).join('')}
        </div>
      </div>

      <div class="container">
        <!-- Sports Live TV Banner -->
        <div class="worldcup-banner" onclick="App.navigate('/livetv')">
          <div class="worldcup-info">
            <div class="wc-label">⚽ LIVE SPORTS</div>
            <h2>Watch World Cup & Sports Live</h2>
            <p class="wc-subtitle">beIN Sports, ESPN, Sky Sports & more — Free Live Streams</p>
            <button class="btn btn-primary" style="margin-top:12px;">📡 Watch Live Sports →</button>
          </div>
          <div class="worldcup-emoji">⚽📺</div>
        </div>

        <!-- Trending Now -->
        <div class="section-header">
          <div>
            <h2 class="section-title">🔥 Trending Now</h2>
            <p class="section-subtitle">Most popular this week</p>
          </div>
          <a href="#/movies" class="section-link">View All →</a>
        </div>
        <div class="scroll-row">
          ${trendingItems.map(item => `<div class="content-card" style="flex:0 0 180px;" onclick="App.navigate('${(item.media_type || 'movie') === 'tv' ? `/watch/tv/${item.id}/1/1` : `/watch/movie/${item.id}`}')">
            <div class="card-poster">
              <img src="${API.img(item.poster_path, 'w342')}" alt="${item.title || item.name}" loading="lazy" onerror="this.src='${API.placeholder()}'">
              <div class="card-poster-overlay"><div class="card-play-btn">▶</div></div>
              <div class="card-badges"><span class="card-badge hd">HD</span></div>
              ${item.vote_average ? `<div class="card-rating">⭐ ${item.vote_average.toFixed(1)}</div>` : ''}
            </div>
            <div class="card-info">
              <div class="card-title">${item.title || item.name}</div>
              <div class="card-meta"><span>${(item.release_date || item.first_air_date || '').split('-')[0]}</span></div>
            </div>
          </div>`).join('')}
        </div>

        <!-- Popular Movies -->
        <div class="section-header">
          <div>
            <h2 class="section-title">🎬 Popular Movies</h2>
            <p class="section-subtitle">What everyone's watching</p>
          </div>
          <a href="#/movies" class="section-link">View All →</a>
        </div>
        <div class="content-grid">
          ${popularItems.map(item => this.contentCard(item, 'movie')).join('')}
        </div>

        <!-- Now Playing -->
        <div class="section-header">
          <div>
            <h2 class="section-title">🍿 In Theaters Now</h2>
            <p class="section-subtitle">Currently in cinemas</p>
          </div>
        </div>
        <div class="scroll-row">
          ${nowPlayingItems.map(item => `<div class="content-card" style="flex:0 0 180px;" onclick="App.navigate('/watch/movie/${item.id}')">
            <div class="card-poster">
              <img src="${API.img(item.poster_path, 'w342')}" alt="${item.title}" loading="lazy" onerror="this.src='${API.placeholder()}'">
              <div class="card-poster-overlay"><div class="card-play-btn">▶</div></div>
              <div class="card-badges"><span class="card-badge new">NEW</span></div>
              ${item.vote_average ? `<div class="card-rating">⭐ ${item.vote_average.toFixed(1)}</div>` : ''}
            </div>
            <div class="card-info">
              <div class="card-title">${item.title}</div>
              <div class="card-meta"><span>${(item.release_date || '').split('-')[0]}</span></div>
            </div>
          </div>`).join('')}
        </div>

        <!-- Top Rated -->
        <div class="section-header">
          <div>
            <h2 class="section-title">⭐ Top Rated</h2>
            <p class="section-subtitle">Highest rated of all time</p>
          </div>
        </div>
        <div class="content-grid">
          ${topRatedItems.map(item => this.contentCard(item, 'movie')).join('')}
        </div>

        <!-- Airing Today TV Shows -->
        <div class="section-header">
          <div>
            <h2 class="section-title">📺 Airing Today</h2>
            <p class="section-subtitle">New TV episodes today</p>
          </div>
          <a href="#/series" class="section-link">View All →</a>
        </div>
        <div class="content-grid">
          ${airingItems.map(item => this.contentCard(item, 'tv')).join('')}
        </div>

        <!-- Live TV Promo -->
        <div class="worldcup-banner" style="background: linear-gradient(135deg, #1a1a3e, #2d2a6a, #4a3f9c); margin-top:48px;" onclick="App.navigate('/livetv')">
          <div class="worldcup-info">
            <div class="wc-label">📡 LIVE TELEVISION</div>
            <h2>${Channels.getCount()}+ Channels</h2>
            <p class="wc-subtitle">Sports, News, Entertainment, Movies & More — All Free</p>
            <button class="btn btn-primary" style="margin-top:12px;">Browse Channels →</button>
          </div>
          <div class="worldcup-emoji">📺📡</div>
        </div>
      </div>
    `;

    // Start hero slideshow
    this.startHeroSlideshow();
  },

  // ---- Hero Slideshow ----
  startHeroSlideshow() {
    if (this.heroInterval) clearInterval(this.heroInterval);
    let current = 0;
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (slides.length === 0) return;

    this.heroInterval = setInterval(() => {
      current = (current + 1) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('active', i === current));
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }, 6000);
  },

  goToSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    slides.forEach((s, i) => s.classList.toggle('active', i === index));
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
    if (this.heroInterval) clearInterval(this.heroInterval);
    this.startHeroSlideshow();
  },

  quickBookmark(id, type, title, poster, rating) {
    const added = Storage.toggleWatchlist({ id, type, media_type: type, title, poster_path: poster, vote_average: rating });
    this.showToast(added ? 'Added to Watchlist' : 'Removed from Watchlist');
  },

  // ---- BROWSE PAGE (Movies / Series) ----
  async renderBrowse(content, type, genreId = null) {
    const typeName = type === 'movie' ? 'Movies' : 'TV Series';
    document.title = `${typeName} — IPTV World`;
    content.innerHTML = this.showSkeleton(content);

    const [genresData, popularData, topRatedData] = await Promise.all([
      API.getGenres(type),
      genreId ? API.discoverByGenre(type, genreId) : API.getPopular(type),
      API.getTopRated(type),
    ]);

    const genres = genresData?.genres || [];
    const items = popularData?.results || [];
    const topRated = topRatedData?.results?.slice(0, 12) || [];
    const totalPages = popularData?.total_pages || 1;

    content.innerHTML = `
      <div class="container page-transition">
        <div class="section-header" style="padding-top:32px;">
          <h1 class="section-title" style="font-size:2rem;">${type === 'movie' ? '🎬' : '📺'} ${typeName}</h1>
        </div>

        <!-- Genre Chips -->
        <div class="genre-chips">
          <button class="genre-chip ${!genreId ? 'active' : ''}" onclick="App.navigate('/${type === 'movie' ? 'movies' : 'series'}')">All</button>
          ${genres.map(g => `
            <button class="genre-chip ${genreId == g.id ? 'active' : ''}" 
                    onclick="App.navigate('/${type === 'movie' ? 'movies' : 'series'}/${g.id}')">
              ${g.name}
            </button>
          `).join('')}
        </div>

        <!-- Results -->
        <div class="content-grid large" id="browseGrid">
          ${items.map(item => this.contentCard(item, type)).join('')}
        </div>

        ${totalPages > 1 ? `
          <div class="load-more" id="loadMore">
            <button class="btn btn-secondary btn-lg" onclick="App.loadMoreBrowse('${type}', ${genreId || 'null'}, 2)">
              Load More
            </button>
          </div>
        ` : ''}

        ${!genreId ? `
          <!-- Top Rated -->
          <div class="section-header" style="margin-top:48px;">
            <h2 class="section-title">⭐ Top Rated ${typeName}</h2>
          </div>
          <div class="content-grid">
            ${topRated.map(item => this.contentCard(item, type)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  async loadMoreBrowse(type, genreId, page) {
    const btn = document.querySelector('#loadMore button');
    if (btn) btn.innerHTML = '<div class="spinner" style="padding:0;"></div>';

    const data = genreId
      ? await API.discoverByGenre(type, genreId, page)
      : await API.getPopular(type, page);

    const grid = document.getElementById('browseGrid');
    const items = data?.results || [];

    if (grid && items.length) {
      grid.insertAdjacentHTML('beforeend', items.map(item => this.contentCard(item, type)).join(''));
    }

    const loadMore = document.getElementById('loadMore');
    if (loadMore) {
      if (page < (data?.total_pages || 1) && page < 10) {
        loadMore.innerHTML = `
          <button class="btn btn-secondary btn-lg" onclick="App.loadMoreBrowse('${type}', ${genreId || 'null'}, ${page + 1})">
            Load More
          </button>
        `;
      } else {
        loadMore.innerHTML = '<p style="color:var(--text-muted);">No more results</p>';
      }
    }
  },

  // ---- ANIME PAGE ----
  async renderAnime(content) {
    document.title = 'Anime — IPTV World';
    content.innerHTML = this.showSkeleton(content);

    // Animation genre ID = 16
    const [animMovies, animTV] = await Promise.all([
      API.discoverByGenre('movie', 16),
      API.discoverByGenre('tv', 16),
    ]);

    const movies = animMovies?.results || [];
    const shows = animTV?.results || [];

    content.innerHTML = `
      <div class="container page-transition">
        <div class="section-header" style="padding-top:32px;">
          <h1 class="section-title" style="font-size:2rem;">🎌 Anime</h1>
        </div>

        <div class="section-header">
          <h2 class="section-title">📺 Anime Series</h2>
        </div>
        <div class="content-grid large">
          ${shows.map(item => this.contentCard(item, 'tv')).join('')}
        </div>

        <div class="section-header" style="margin-top:48px;">
          <h2 class="section-title">🎬 Anime Movies</h2>
        </div>
        <div class="content-grid large">
          ${movies.map(item => this.contentCard(item, 'movie')).join('')}
        </div>
      </div>
    `;
  },


  // ---- LIVE TV PAGE ----
  async renderLiveTV(content) {
    document.title = 'Live TV — IPTV World';

    // Show loading
    content.innerHTML = `<div class="container"><div class="spinner" style="padding:100px 0;"></div><p style="text-align:center;color:var(--text-muted);">Loading live channels from iptv-org...</p></div>`;

    // Ensure channels are loaded
    await Channels.loadFromAPI();

    const categories = Channels.CATEGORIES;
    const countries = Channels.COUNTRIES;
    const channels = Channels.getAll();

    content.innerHTML = `
      <div class="container page-transition">
        <div class="section-header" style="padding-top:32px;">
          <h1 class="section-title" style="font-size:2rem;">📡 Live TV</h1>
          <p class="section-subtitle">${channels.length}+ real channels from iptv-org</p>
        </div>

        <!-- Category Tabs -->
        <div class="tab-nav" id="categoryTabs">
          ${categories.map(c => `
            <div class="tab-item ${c.id === 'all' ? 'active' : ''}" 
                 onclick="App.filterChannels('${c.id}', null, this)">
              ${c.icon} ${c.name} <span style="opacity:0.5; font-size:0.75rem;">(${Channels.getCategoryCount(c.id)})</span>
            </div>
          `).join('')}
        </div>

        <!-- Country Filter -->
        <div class="country-filter" id="countryFilter">
          ${countries.map(c => `
            <button class="country-btn ${c.id === 'all' ? 'active' : ''}" 
                    onclick="App.filterChannels(null, '${c.id}', this)">
              ${c.flag} ${c.name}
            </button>
          `).join('')}
        </div>

        <!-- Channel Grid -->
        <div class="channel-grid" id="channelGrid">
          ${channels.map(ch => `
            <div class="channel-card" data-category="${ch.category}" data-country="${ch.country}" 
                 onclick="App.navigate('/channel/${ch.id}')">
              <div class="channel-logo">
                ${ch.logoUrl 
                  ? `<img src="${ch.logoUrl}" alt="${ch.name}" class="channel-logo-img" onerror="this.outerHTML='${ch.logo}'">`
                  : ch.logo}
              </div>
              <div class="channel-info">
                <h4>${ch.name}</h4>
                <span class="channel-category">${ch.quality || '720p'}</span>
              </div>
              <div class="channel-live-dot"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this._currentCategory = 'all';
    this._currentCountry = 'all';
  },

  _currentCategory: 'all',
  _currentCountry: 'all',

  filterChannels(category, country, el) {
    if (category !== null) {
      this._currentCategory = category;
      document.querySelectorAll('#categoryTabs .tab-item').forEach(t => t.classList.remove('active'));
      if (el) el.classList.add('active');
    }
    if (country !== null) {
      this._currentCountry = country;
      document.querySelectorAll('#countryFilter .country-btn').forEach(b => b.classList.remove('active'));
      if (el) el.classList.add('active');
    }

    // World Cup uses a separate array, so we need to re-render the grid
    const grid = document.getElementById('channelGrid');
    if (grid) {
      const isWorldCup = this._currentCategory === 'worldcup';
      const wasWorldCup = grid.dataset.currentSource === 'worldcup';

      if (isWorldCup || wasWorldCup) {
        // Re-render channel cards with the correct source array
        const channelList = isWorldCup ? Channels._worldCupChannels : Channels.getAll();
        grid.dataset.currentSource = isWorldCup ? 'worldcup' : 'all';
        grid.innerHTML = channelList.map(ch => `
          <div class="channel-card" data-category="${ch.category}" data-country="${ch.country}" 
               onclick="App.navigate('/channel/${ch.id}')">
            <div class="channel-logo">
              ${ch.logoUrl 
                ? `<img src="${ch.logoUrl}" alt="${ch.name}" class="channel-logo-img" onerror="this.outerHTML='${ch.logo}'">`
                : ch.logo}
            </div>
            <div class="channel-info">
              <h4>${ch.name}</h4>
              <span class="channel-category">${ch.quality || '720p'}</span>
            </div>
            <div class="channel-live-dot"></div>
          </div>
        `).join('');
      }
    }

    const cards = document.querySelectorAll('#channelGrid .channel-card');
    cards.forEach(card => {
      const matchCat = this._currentCategory === 'all' || this._currentCategory === 'worldcup' || card.dataset.category === this._currentCategory;
      const matchCountry = this._currentCountry === 'all' || card.dataset.country === this._currentCountry;
      card.style.display = (matchCat && matchCountry) ? '' : 'none';
    });
  },

  // ---- WATCH PAGE (Player) ----
  async renderWatch(content, type, id, season, episode) {
    document.title = 'Loading... — IPTV World';
    content.innerHTML = `<div class="container"><div class="spinner" style="padding:100px 0;"></div></div>`;

    const html = await Player.init(type, id, season || null, episode || null);
    content.innerHTML = html;
  },

  // ---- CHANNEL PAGE (Live TV Player) ----
  async renderChannel(content, channelId) {
    // Ensure channels are loaded
    await Channels.loadFromAPI();

    const channel = Channels.getById(channelId);
    if (!channel) {
      content.innerHTML = this.render404();
      return;
    }
    content.innerHTML = Player.renderLiveTVPlayer(channel);

    // Start playing the HLS stream after DOM renders
    setTimeout(() => Player.playLiveStream(channel), 100);
  },

  // ---- SEARCH PAGE ----
  async renderSearch(content, query = '') {
    document.title = 'Search — IPTV World';
    const decodedQuery = decodeURIComponent(query || '');

    let resultsHtml = '';
    let channelResultsHtml = '';

    if (decodedQuery) {
      // Search Live TV channels
      await Channels.loadFromAPI();
      const q = decodedQuery.toLowerCase();
      const matchingChannels = Channels.getAll().filter(ch => 
        ch.name.toLowerCase().includes(q)
      ).slice(0, 20);

      if (matchingChannels.length > 0) {
        channelResultsHtml = `
          <div class="section-header">
            <h2 class="section-title">📡 Live TV Channels</h2>
            <span class="section-subtitle">${matchingChannels.length} channels found</span>
          </div>
          <div class="channel-grid" style="margin-bottom:32px;">
            ${matchingChannels.map(ch => `
              <div class="channel-card" onclick="App.navigate('/channel/${ch.id}')">
                <div class="channel-logo">
                  ${ch.logoUrl 
                    ? `<img src="${ch.logoUrl}" alt="${ch.name}" class="channel-logo-img" onerror="this.outerHTML='${ch.logo}'">`
                    : ch.logo}
                </div>
                <div class="channel-info">
                  <h4>${ch.name}</h4>
                  <span class="channel-category">${ch.quality || '720p'}</span>
                </div>
                <div class="channel-live-dot"></div>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Search TMDB movies/shows
      const data = await API.search(decodedQuery);
      const results = (data?.results || []).filter(r => r.media_type !== 'person');

      if (results.length > 0) {
        resultsHtml = `
          <div class="section-header">
            <h2 class="section-title">🎬 Movies & TV Shows</h2>
            <span class="section-subtitle">${data?.total_results || 0} results found</span>
          </div>
          <div class="content-grid large">
            ${results.map(item => this.contentCard(item)).join('')}
          </div>
        `;
      }

      if (!channelResultsHtml && !resultsHtml) {
        resultsHtml = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h2>No results found</h2>
            <p>Try searching for something else</p>
          </div>
        `;
      }
    }

    content.innerHTML = `
      <div class="container page-transition">
        <div class="search-hero">
          <h1>🔍 Search</h1>
          <div class="search-input-large">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input type="text" id="searchPageInput" placeholder="Search movies, TV shows, channels..." 
                   value="${decodedQuery}" autofocus
                   onkeydown="if(event.key==='Enter') App.doSearch(this.value)">
          </div>
        </div>
        <div id="searchResults">
          ${channelResultsHtml}
          ${resultsHtml}
        </div>
      </div>
    `;
  },

  doSearch(query) {
    if (query.trim()) {
      this.navigate(`/search/${encodeURIComponent(query.trim())}`);
    }
  },

  // Nav search handler
  handleNavSearch(input) {
    clearTimeout(this.searchTimeout);
    const query = input.value.trim();
    if (query.length > 2) {
      this.searchTimeout = setTimeout(() => {
        this.navigate(`/search/${encodeURIComponent(query)}`);
      }, 500);
    }
  },

  // ---- WATCHLIST PAGE ----
  renderWatchlist(content) {
    document.title = 'Watchlist — IPTV World';
    const items = Storage.getWatchlist();

    if (items.length === 0) {
      content.innerHTML = `
        <div class="container page-transition">
          <div class="empty-state">
            <div class="empty-icon">🤍</div>
            <h2>Your Watchlist is Empty</h2>
            <p>Start adding movies and shows to your watchlist</p>
            <a href="#/" class="btn btn-primary btn-lg">Browse Content</a>
          </div>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="container page-transition">
        <div class="section-header" style="padding-top:32px;">
          <h1 class="section-title" style="font-size:2rem;">⭐ My Watchlist</h1>
          <span class="section-subtitle">${items.length} items</span>
        </div>
        <div class="content-grid large">
          ${items.map(item => {
            const watchUrl = item.type === 'tv' ? `/watch/tv/${item.id}/1/1` : `/watch/movie/${item.id}`;
            return `
              <div class="content-card" onclick="App.navigate('${watchUrl}')">
                <div class="card-poster">
                  <img src="${API.img(item.poster, 'w342')}" alt="${item.title}" loading="lazy" onerror="this.src='${API.placeholder()}'">
                  <div class="card-poster-overlay"><div class="card-play-btn">▶</div></div>
                  ${item.rating ? `<div class="card-rating">⭐ ${item.rating.toFixed(1)}</div>` : ''}
                </div>
                <div class="card-info">
                  <div class="card-title">${item.title}</div>
                  <div class="card-meta">
                    <span>${item.year || ''}</span>
                    <span>•</span>
                    <span>${item.type === 'tv' ? 'TV' : 'Movie'}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ---- 404 Page ----
  render404() {
    document.title = 'Not Found — IPTV World';
    return `
      <div class="container page-transition">
        <div class="empty-state">
          <div class="empty-icon">😕</div>
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist</p>
          <a href="#/" class="btn btn-primary btn-lg">← Back to Home</a>
        </div>
      </div>
    `;
  },
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Make available globally
window.App = App;

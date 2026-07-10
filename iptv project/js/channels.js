// ============================================
// Live TV Channels — Real IPTV Streams via iptv-org API
// ============================================

const Channels = {
  // Cached data
  _streams: [],
  _channelMap: {},
  _loaded: false,

  // Priority channels — beIN Sports + sports channels (only channels with REAL working streams)
  _priorityChannels: [
    // beIN Sports — FREE working streams from iptv-org
    { id: 'bein_usa', name: 'beIN Sports USA', logo: '⚽', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/BeIN_Sports_logo_%28vertical_version%29.svg/500px-BeIN_Sports_logo_%28vertical_version%29.svg.png', category: 'sports', country: 'US', stream: 'http://23.237.104.106:8080/USA_BEIN/index.m3u8', quality: '720p' },
    { id: 'bein_xtra', name: 'beIN SPORTS XTRA', logo: '⚽', logoUrl: 'https://i.ibb.co/HT49GPmB/XTRA-2.png', category: 'sports', country: 'US', stream: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', quality: '1080p' },
    { id: 'bein_xtra_alt', name: 'beIN SPORTS XTRA (CloudFront)', logo: '⚽', logoUrl: 'https://i.ibb.co/HT49GPmB/XTRA-2.png', category: 'sports', country: 'US', stream: 'https://d9ssxzmclhfo4.cloudfront.net/bein_sports.m3u8', quality: '720p' },
    { id: 'bein_xtra_fire', name: 'beIN SPORTS XTRA (FireTV)', logo: '⚽', logoUrl: 'https://i.ibb.co/HT49GPmB/XTRA-2.png', category: 'sports', country: 'US', stream: 'https://bein-beinxtrasports-firetv.amagi.tv/playlist.m3u8', quality: '720p' },
    { id: 'bein_esp', name: 'beIN SPORTS XTRA en Español', logo: '⚽', logoUrl: 'https://i.imgur.com/V562tpO.png', category: 'sports', country: 'US', stream: 'https://dc1644a9jazgj.cloudfront.net/beIN_Sports_Xtra_Espanol.m3u8', quality: '1080p' },
    { id: 'bein_esp_alt', name: 'beIN SPORTS Español (KlowdTV)', logo: '⚽', logoUrl: 'https://i.imgur.com/V562tpO.png', category: 'sports', country: 'US', stream: 'https://bein-esp-klowdtv.amagi.tv/playlist.m3u8', quality: '720p' },
  ],

  // Category definitions
  CATEGORIES: [
    { id: 'all', name: 'All Channels', icon: '📡' },
    { id: 'worldcup', name: 'World Cup', icon: '🏆' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'news', name: 'News', icon: '📰' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎭' },
    { id: 'movies', name: 'Movies', icon: '🎬' },
    { id: 'kids', name: 'Kids', icon: '👶' },
    { id: 'music', name: 'Music', icon: '🎵' },
    { id: 'general', name: 'General', icon: '📺' },
  ],

  // World Cup 2026 free channels — real working streams from official broadcasters
  _worldCupChannels: [
    // beIN Sports (Free tier)
    { id: 'wc_bein_usa', name: 'beIN Sports USA', logo: '⚽', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/BeIN_Sports_logo_%28vertical_version%29.svg/500px-BeIN_Sports_logo_%28vertical_version%29.svg.png', category: 'worldcup', country: 'US', stream: 'http://23.237.104.106:8080/USA_BEIN/index.m3u8', quality: '720p' },
    { id: 'wc_bein_xtra', name: 'beIN SPORTS XTRA', logo: '⚽', logoUrl: 'https://i.ibb.co/HT49GPmB/XTRA-2.png', category: 'worldcup', country: 'US', stream: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', quality: '1080p' },
    { id: 'wc_bein_esp', name: 'beIN SPORTS XTRA Español', logo: '⚽', logoUrl: 'https://i.imgur.com/V562tpO.png', category: 'worldcup', country: 'US', stream: 'https://dc1644a9jazgj.cloudfront.net/beIN_Sports_Xtra_Espanol.m3u8', quality: '1080p' },
    // FIFA Official
    { id: 'wc_fifa', name: 'FIFA+', logo: '🏆', logoUrl: null, category: 'worldcup', country: 'GB', stream: 'https://jmp2.uk/plu-66997e8d3a4ad20008e50be9.m3u8', quality: '720p' },
    // Fox Sports USA
    { id: 'wc_fox2', name: 'Fox Sports 2', logo: '📺', logoUrl: null, category: 'worldcup', country: 'US', stream: 'https://tvsen7.aynaott.com/foxsports2/index.m3u8', quality: '480p' },
    // ESPN
    { id: 'wc_espn_dep', name: 'ESPN Deportes', logo: '📺', logoUrl: null, category: 'worldcup', country: 'US', stream: 'http://origin.thetvapp.to/hls/espn-deportes/mono.m3u8', quality: '360p' },
    // Italy — Rai
    { id: 'wc_rai1', name: 'Rai 1 (Italy)', logo: '🇮🇹', logoUrl: null, category: 'worldcup', country: 'IT', stream: 'https://srv1.adriatelekom.com/Rai1/index.m3u8', quality: '1080p' },
    { id: 'wc_raisport', name: 'Rai Sport (Italy)', logo: '🇮🇹', logoUrl: null, category: 'worldcup', country: 'IT', stream: 'https://srv1.adriatelekom.com/RaiSport/index.m3u8', quality: '1080p' },
    // Germany — ZDF/ARD
    { id: 'wc_zdf', name: 'ZDF (Germany)', logo: '🇩🇪', logoUrl: null, category: 'worldcup', country: 'DE', stream: 'https://zdf-hls-15.akamaized.net/hls/live/2016498/de/high/master.m3u8', quality: '720p' },
    { id: 'wc_ard', name: 'ARD-alpha (Germany)', logo: '🇩🇪', logoUrl: null, category: 'worldcup', country: 'DE', stream: 'https://brlive-lh.akamaihd.net/i/bralpha_germany@119899/master.m3u8', quality: '720p' },
    // France
    { id: 'wc_fr2', name: 'France 2', logo: '🇫🇷', logoUrl: null, category: 'worldcup', country: 'FR', stream: 'http://69.64.57.208/france2/mono.m3u8', quality: '1080p' },
    { id: 'wc_m6', name: 'M6 (France)', logo: '🇫🇷', logoUrl: null, category: 'worldcup', country: 'FR', stream: 'http://99.27.51.147:8080/M6/index.m3u8', quality: '1080p' },
    // UK
    { id: 'wc_itv1', name: 'ITV1 (UK)', logo: '🇬🇧', logoUrl: null, category: 'worldcup', country: 'GB', stream: 'http://80.194.62.172:50002/stream/channelid/95929545', quality: '1080p' },
    // Spain
    { id: 'wc_la1', name: 'La 1 / RTVE (Spain)', logo: '🇪🇸', logoUrl: null, category: 'worldcup', country: 'ES', stream: 'https://rtvelivestream.rtve.es/rtvesec/la1/la1_main.m3u8', quality: '720p' },
    // Portugal
    { id: 'wc_rtp1', name: 'RTP 1 (Portugal)', logo: '🇵🇹', logoUrl: null, category: 'worldcup', country: 'PT', stream: 'https://streaming-live.rtp.pt/liverepeater/rtp1HD.smil/playlist.m3u8', quality: '720p' },
    // Turkey
    { id: 'wc_trt1', name: 'TRT 1 (Turkey)', logo: '🇹🇷', logoUrl: null, category: 'worldcup', country: 'TR', stream: 'https://tv-trt1.medya.trt.com.tr/master.m3u8', quality: '1080p' },
    { id: 'wc_trtspor', name: 'TRT Spor (Turkey)', logo: '🇹🇷', logoUrl: null, category: 'worldcup', country: 'TR', stream: 'https://tv-trtspor1.medya.trt.com.tr/master.m3u8', quality: '1080p' },
    // Argentina
    { id: 'wc_tyc', name: 'TyC Sports (Argentina)', logo: '🇦🇷', logoUrl: null, category: 'worldcup', country: 'SA', stream: 'https://live-04-11-tyc24.vodgc.net/tyc24/index_tyc24_1080.m3u8', quality: '1080p' },
    // Brazil
    { id: 'wc_globo', name: 'TV Globo SP (Brazil)', logo: '🇧🇷', logoUrl: null, category: 'worldcup', country: 'other', stream: 'https://cdn-5.nxplay.com.br/GLOBO_SP_TK/index.m3u8', quality: '720p' },
    // Mexico
    { id: 'wc_tudn', name: 'TUDN (Mexico)', logo: '🇲🇽', logoUrl: null, category: 'worldcup', country: 'other', stream: 'https://streaming.alwaysdata.net/tudn.php', quality: '1080p' },
    { id: 'wc_tudn_us', name: 'TUDN (USA)', logo: '🇺🇸', logoUrl: null, category: 'worldcup', country: 'US', stream: 'https://streaming-live-fcdn.api.prd.univisionnow.com/tudn/tudn.isml/hls/tudn.m3u8', quality: '1080p' },
    { id: 'wc_azteca', name: 'Azteca Internacional', logo: '🇲🇽', logoUrl: null, category: 'worldcup', country: 'other', stream: 'https://azt-mun.otteravision.com/azt/mun/mun.m3u8', quality: '1080p' },
    // Japan
    { id: 'wc_nhk', name: 'NHK World-Japan', logo: '🇯🇵', logoUrl: null, category: 'worldcup', country: 'other', stream: 'https://nhk.lls.pbs.org/index.m3u8', quality: '1080p' },
    // Scandinavia
    { id: 'wc_nrk1', name: 'NRK1 (Norway)', logo: '🇳🇴', logoUrl: null, category: 'worldcup', country: 'other', stream: 'https://nrk-live-no.akamaized.net/nrk1/muxed.m3u8', quality: '1080p' },
    { id: 'wc_svt1', name: 'SVT1 (Sweden)', logo: '🇸🇪', logoUrl: null, category: 'worldcup', country: 'other', stream: 'https://svt-live-channel.akamaized.net/l4/se/svt1/master-fmp4.m3u8?defaultSubLang=1&format=hls', quality: '1080p' },
    // India/Pakistan
    { id: 'wc_star1', name: 'Star Sports 1 (India)', logo: '🇮🇳', logoUrl: null, category: 'worldcup', country: 'other', stream: 'http://103.253.18.58:8000/play/a00m', quality: '1080p' },
    { id: 'wc_ptv', name: 'PTV Sports (Pakistan)', logo: '🇵🇰', logoUrl: null, category: 'worldcup', country: 'other', stream: 'http://103.250.28.74:8000/play/a019/index.m3u8', quality: '1080p' },
    // Canada
    { id: 'wc_tsn', name: 'TSN The Ocho (Canada)', logo: '🇨🇦', logoUrl: null, category: 'worldcup', country: 'other', stream: 'https://d3pnbvng3bx2nj.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-rds8g35qfqrnv/TSN_The_Ocho.m3u8', quality: '1080p' },
    // US Spanish
    { id: 'wc_telemundo', name: 'Telemundo Internacional', logo: '🇺🇸', logoUrl: null, category: 'worldcup', country: 'US', stream: 'http://181.114.57.246:4000/play/XmUjm3NXcGJkvvQ8/index.m3u8', quality: '720p' },
    { id: 'wc_univision', name: 'Univision Latin America', logo: '🇲🇽', logoUrl: null, category: 'worldcup', country: 'other', stream: 'http://138.121.15.230:9002/UNIVISION/index.m3u8', quality: '1080p' },
  ],

  COUNTRIES: [
    { id: 'all', name: 'All', flag: '🌍' },
    { id: 'US', name: 'USA', flag: '🇺🇸' },
    { id: 'GB', name: 'UK', flag: '🇬🇧' },
    { id: 'SA', name: 'Arabic', flag: '🇸🇦' },
    { id: 'FR', name: 'France', flag: '🇫🇷' },
    { id: 'ES', name: 'Spain', flag: '🇪🇸' },
    { id: 'DE', name: 'Germany', flag: '🇩🇪' },
    { id: 'IN', name: 'India', flag: '🇮🇳' },
    { id: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { id: 'TR', name: 'Turkey', flag: '🇹🇷' },
    { id: 'IT', name: 'Italy', flag: '🇮🇹' },
    { id: 'CA', name: 'Canada', flag: '🇨🇦' },
    { id: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { id: 'other', name: 'Other', flag: '🌐' },
  ],

  // Map of known countries to our filter IDs
  _COUNTRY_MAP: {
    'US': 'US', 'GB': 'GB', 'UK': 'GB', 'SA': 'SA', 'AE': 'SA', 'QA': 'SA', 'KW': 'SA', 'EG': 'SA', 'LB': 'SA', 'JO': 'SA', 'IQ': 'SA', 'BH': 'SA',
    'FR': 'FR', 'ES': 'ES', 'DE': 'DE', 'IN': 'IN', 'BR': 'BR', 'TR': 'TR', 'IT': 'IT', 'CA': 'CA', 'MX': 'MX',
  },

  // Map iptv-org categories to our categories
  _CATEGORY_MAP: {
    'sports': 'sports', 'news': 'news', 'entertainment': 'entertainment',
    'movies': 'movies', 'cinema': 'movies', 'kids': 'kids', 'children': 'kids',
    'music': 'music', 'general': 'general', 'education': 'general',
    'documentary': 'entertainment', 'comedy': 'entertainment', 'drama': 'entertainment',
    'lifestyle': 'entertainment', 'cooking': 'entertainment', 'travel': 'entertainment',
    'science': 'entertainment', 'nature': 'entertainment', 'culture': 'entertainment',
    'animation': 'kids', 'religious': 'general', 'classic': 'movies',
    'family': 'entertainment', 'weather': 'news', 'business': 'news',
    'shop': 'general', 'auto': 'entertainment', 'outdoor': 'entertainment',
    'series': 'entertainment', 'legislative': 'news',
  },

  // ---- Load real streams from iptv-org API ----
  async loadFromAPI() {
    if (this._loaded) return;

    try {
      // Fetch both streams and channels in parallel
      const [streamsRes, channelsRes] = await Promise.all([
        fetch('https://iptv-org.github.io/api/streams.json'),
        fetch('https://iptv-org.github.io/api/channels.json'),
      ]);

      if (!streamsRes.ok || !channelsRes.ok) throw new Error('Failed to fetch data');

      const streams = await streamsRes.json();
      const channels = await channelsRes.json();

      // Build a lookup map of channel ID -> channel info
      this._channelMap = {};
      channels.forEach(ch => {
        this._channelMap[ch.id] = ch;
      });

      // Process streams — only keep ones with valid URLs and matching channel data
      let idx = 0;
      const seen = new Set(); // avoid duplicate channels
      
      this._streams = [];

      for (const stream of streams) {
        // Skip streams without URL or channel reference
        if (!stream.url || !stream.channel) continue;

        // Get channel info
        const chInfo = this._channelMap[stream.channel];
        if (!chInfo) continue;

        // Skip NSFW
        if (chInfo.is_nsfw) continue;

        // Skip duplicates (keep first stream per channel)
        if (seen.has(stream.channel)) continue;
        seen.add(stream.channel);

        // Map country
        const rawCountry = (chInfo.country || '').toUpperCase();
        const country = this._COUNTRY_MAP[rawCountry] || 'other';

        // Map category
        const rawCategories = chInfo.categories || [];
        let category = 'general';
        for (const cat of rawCategories) {
          const mapped = this._CATEGORY_MAP[cat.toLowerCase()];
          if (mapped) {
            category = mapped;
            break;
          }
        }

        // Also guess category from name if none was found from metadata
        if (category === 'general' && rawCategories.length === 0) {
          category = this._guessCategory(chInfo.name || '');
        }

        this._streams.push({
          id: 'live_' + idx,
          channelId: stream.channel,
          name: chInfo.name || stream.channel,
          logo: chInfo.logo || this._getCategoryIcon(category),
          logoUrl: chInfo.logo || null,
          category: category,
          country: country,
          stream: stream.url,
          quality: stream.quality || '720p',
          referrer: stream.http_referrer || null,
          userAgent: stream.user_agent || null,
        });

        idx++;
      }
      // Try to fill in stream URLs for priority channels from iptv-org data
      const beinStreams = streams.filter(s => s.channel && /bein/i.test(s.channel) && s.url);
      const beinMap = {};
      for (const bs of beinStreams) {
        const chName = (this._channelMap[bs.channel]?.name || bs.channel).toLowerCase();
        if (!beinMap[chName]) beinMap[chName] = bs.url;
      }

      // Match priority channels with found streams
      for (const pCh of this._priorityChannels) {
        const pName = pCh.name.toLowerCase();
        for (const [streamName, url] of Object.entries(beinMap)) {
          if (streamName.includes(pName.replace(' hd', '').replace('bein sports ', 'bein sports ')) ||
              pName.includes(streamName.replace(' hd', ''))) {
            pCh.stream = url;
            break;
          }
        }
        // Also try matching by number
        const numMatch = pCh.name.match(/(\d+)/);
        if (numMatch && !pCh.stream) {
          for (const [streamName, url] of Object.entries(beinMap)) {
            if (streamName.includes(numMatch[1]) && streamName.includes('bein')) {
              pCh.stream = url;
              break;
            }
          }
        }
      }

      // Always prepend priority sports channels (beIN Sports, etc.)
      this._streams = [...this._priorityChannels, ...this._streams];

      this._loaded = true;
      console.log(`✅ Loaded ${this._streams.length} live streams from iptv-org API (from ${streams.length} total streams, ${channels.length} channels)`);
    } catch (err) {
      console.warn('Failed to load from iptv-org API, using fallback channels:', err);
      this._streams = [...this._priorityChannels, ...this._fallbackChannels];
      this._loaded = true;
    }
  },

  // Guess category from channel name (fallback)
  _guessCategory(name) {
    const n = name.toLowerCase();
    if (/sport|espn|fox sport|sky sport|bein|dazn|nfl|nba|cricket|football|soccer|racing|motorsport|ufc|wwe|wrestling|rugby|tennis|golf|f1|formula|champions|premier league|liga|serie a|bundesliga|ligue|world cup|fifa/i.test(n)) return 'sports';
    if (/news|cnn|bbc news|fox news|msnbc|cnbc|sky news|al jazeera|france 24|euronews|reuters|dw|ntv|trt world|ndtv|cbc news|global news/i.test(n)) return 'news';
    if (/movie|cinema|film|tcm|hallmark|lifetime|starz|showtime|hbo|cinemax/i.test(n)) return 'movies';
    if (/nick|cartoon|disney|pbs kids|cbbc|cbeebies|boomerang|baby|toon/i.test(n)) return 'kids';
    if (/mtv|music|vh1|hit|rock|pop|jazz/i.test(n)) return 'music';
    if (/comedy|drama|entertainment|reality|talk|bravo|tlc|hgtv|food|cooking|travel|discovery|national geo|history|animal|science/i.test(n)) return 'entertainment';
    return 'general';
  },

  _getCategoryIcon(category) {
    const icons = {
      sports: '⚽', news: '📰', movies: '🎬', kids: '👶',
      music: '🎵', entertainment: '🎭', general: '📺', worldcup: '🏆',
    };
    return icons[category] || '📺';
  },

  // ---- Get Sports channels (beIN, ESPN, etc. for World Cup) ----
  getSportsChannels() {
    return this._streams.filter(ch => ch.category === 'sports');
  },

  // ---- Public Methods ----
  getAll() {
    return this._streams;
  },

  getByCategory(categoryId) {
    if (categoryId === 'all') return this._streams;
    if (categoryId === 'worldcup') return this._worldCupChannels;
    return this._streams.filter(ch => ch.category === categoryId);
  },

  filter(categoryId = 'all', countryId = 'all', search = '') {
    let result = categoryId === 'worldcup' ? this._worldCupChannels : this._streams;

    if (categoryId !== 'all') {
      result = result.filter(ch => ch.category === categoryId);
    }

    if (countryId !== 'all') {
      result = result.filter(ch => ch.country === countryId);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(ch => ch.name.toLowerCase().includes(q));
    }

    return result;
  },

  getById(id) {
    return this._streams.find(ch => ch.id === id) || this._worldCupChannels.find(ch => ch.id === id);
  },

  getSportsChannels() {
    return this._streams.filter(ch => ch.category === 'sports');
  },

  getCount() {
    return this._streams.length;
  },

  getCategoryCount(categoryId) {
    if (categoryId === 'all') return this._streams.length;
    if (categoryId === 'worldcup') return this._worldCupChannels.length;
    return this._streams.filter(ch => ch.category === categoryId).length;
  },

  // ---- Fallback channels (used if API fails) ----
  _fallbackChannels: [
    // Sports — beIN Sports & World Cup channels
    { id: 'fb_bein1', name: 'beIN Sports 1 HD', logo: '⚽', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/BeIN_Sports_logo_%282017%29.svg/200px-BeIN_Sports_logo_%282017%29.svg.png', category: 'sports', country: 'SA', stream: 'https://jfreetv.com/bein1hd', quality: '1080p' },
    { id: 'fb_bein2', name: 'beIN Sports 2 HD', logo: '⚽', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/BeIN_Sports_logo_%282017%29.svg/200px-BeIN_Sports_logo_%282017%29.svg.png', category: 'sports', country: 'SA', stream: 'https://jfreetv.com/bein2hd', quality: '1080p' },
    { id: 'fb_bein3', name: 'beIN Sports 3 HD', logo: '⚽', logoUrl: null, category: 'sports', country: 'SA', stream: 'https://jfreetv.com/bein3hd', quality: '720p' },
    { id: 'fb_bein_en', name: 'beIN Sports English', logo: '⚽', logoUrl: null, category: 'sports', country: 'US', stream: 'https://jfreetv.com/beinsportsen', quality: '720p' },
    { id: 'fb_bein_fr', name: 'beIN Sports France', logo: '⚽', logoUrl: null, category: 'sports', country: 'FR', stream: 'https://jfreetv.com/beinsportsfr', quality: '720p' },
    { id: 'fb_skysport', name: 'Sky Sports Football', logo: '⚽', logoUrl: null, category: 'sports', country: 'GB', stream: 'https://jfreetv.com/skysportsfootball', quality: '1080p' },
    { id: 'fb_ssc', name: 'SSC Sport', logo: '⚽', logoUrl: null, category: 'sports', country: 'SA', stream: 'https://jfreetv.com/ssc', quality: '1080p' },
    { id: 'fb_sport1', name: 'Sport TV 1', logo: '⚽', logoUrl: null, category: 'sports', country: 'other', stream: 'https://jfreetv.com/sporttv1', quality: '720p' },
    // News
    { id: 'fb_1', name: 'Al Jazeera English', logo: '📰', logoUrl: 'https://i.imgur.com/IdFriqm.png', category: 'news', country: 'SA', stream: 'https://live-hls-web-aje.getaj.net/AJE/01.m3u8', quality: '1080p' },
    { id: 'fb_2', name: 'France 24 English', logo: '📰', logoUrl: null, category: 'news', country: 'FR', stream: 'https://stream.france24.com/F24_EN_LO_HLS/live_web.m3u8', quality: '720p' },
    { id: 'fb_3', name: 'DW News', logo: '📰', logoUrl: null, category: 'news', country: 'DE', stream: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8', quality: '720p' },
    { id: 'fb_4', name: 'TRT World', logo: '📰', logoUrl: null, category: 'news', country: 'TR', stream: 'https://tv-trtworld.medya.trt.com.tr/master.m3u8', quality: '1080p' },
    { id: 'fb_5', name: 'CGTN', logo: '📰', logoUrl: null, category: 'news', country: 'other', stream: 'https://news.cgtn.com/resource/live/english/cgtn-news.m3u8', quality: '720p' },
    { id: 'fb_6', name: 'Euronews', logo: '📰', logoUrl: null, category: 'news', country: 'FR', stream: 'https://euronews.akamaized.net/hls/live/2027421/en/master.m3u8', quality: '1080p' },
    { id: 'fb_7', name: 'NHK World', logo: '📰', logoUrl: null, category: 'news', country: 'other', stream: 'https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index.m3u8', quality: '720p' },
    { id: 'fb_8', name: 'ABC News Live', logo: '📰', logoUrl: null, category: 'news', country: 'US', stream: 'https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8', quality: '1080p' },
    // Entertainment & General
    { id: 'fb_9', name: 'NASA TV', logo: '🎥', logoUrl: null, category: 'entertainment', country: 'US', stream: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8', quality: '1080p' },
    { id: 'fb_10', name: 'Arirang TV', logo: '📺', logoUrl: null, category: 'general', country: 'other', stream: 'https://amdlive.ctnd.com.edgesuite.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8', quality: '720p' },
  ],
};

// Make available globally
window.Channels = Channels;

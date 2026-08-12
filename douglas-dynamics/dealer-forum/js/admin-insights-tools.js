/**
 * Admin Insights — analytics tools.
 *
 * Stable tool names + argument shapes are the contract for a future server.
 * Replace createLocalToolRuntime(ctx) with an HTTP client that POSTs the same
 * tool names to /api/admin/insights/tools/:name without changing the chat UI.
 */
(function (global) {
  'use strict';

  var DAY_MS = 86400000;

  var PRODUCT_CATALOG = [
    { id: 'xv2', name: 'XV2 wing', labels: ['xv2', 'xv-2'], family: 'Wings' },
    { id: 'hdx', name: 'HDX plow / moldboard', labels: ['hdx'], family: 'Blades & plows' },
    { id: 'western-wing', name: 'Western wing / wide-out', labels: ['western', 'wide-out', 'wideout'], family: 'Wings' },
    { id: 'poly-caster', name: 'POLY-CASTER / Snowcaster', labels: ['poly-caster', 'polycaster', 'snowcaster'], family: 'Spreaders' },
    { id: 'skid-shoes', name: 'Skid shoes', labels: ['skid shoe', 'skid shoes', 'carbide skid'], family: 'Parts & wear' },
    { id: 'trip-springs', name: 'Trip springs', labels: ['trip spring', 'trip springs'], family: 'Parts & wear' },
    { id: 'trip-edge', name: 'Trip-edge', labels: ['trip-edge', 'trip edge'], family: 'Service' },
    { id: 'mount-kit', name: 'Mount kits', labels: ['mount kit', 'mount kits', 'f250 mount', 'ford f250'], family: 'Mounts' },
    { id: 'controller', name: 'Controller / module', labels: ['controller', 'module for older'], family: 'Electrical' },
    { id: 'led-lighting', name: 'LED lighting / strobes', labels: ['led', 'strobe', 'strobes'], family: 'Lighting' },
    { id: 'cutting-edges', name: 'Cutting edges / moldboard', labels: ['cutting edge', 'cutting edges', 'moldboard', 'back drag'], family: 'Parts & wear' },
    { id: 'hydraulics', name: 'Hydraulics / hoses', labels: ['hydraulic', 'hydraulics', 'hose', 'hoses', 'fittings'], family: 'Hydraulics' },
    { id: 'v-plow', name: 'V plow', labels: ['v plow', 'v-plow'], family: 'Blades & plows' },
    { id: 'straight-blade', name: 'Straight blade', labels: ['straight blade', 'straight 8'], family: 'Blades & plows' }
  ];

  var TOOL_SCHEMAS = [
    {
      name: 'trending_topics',
      description: 'Rank forum topics by recent engagement (replies, subscriptions, mentions).',
      parameters: {
        type: 'object',
        properties: {
          // number|string: models often emit numeric args as strings; Groq validates against this schema.
          days: { type: ['number', 'string'], description: 'Lookback window in days. Default 30.' },
          board: { type: 'string', enum: ['swap', 'service', 'all'], description: 'Board filter. Default all.' },
          limit: { type: ['number', 'string'], description: 'Max topics to return. Default 8.' }
        }
      }
    },
    {
      name: 'distributor_engagement',
      description: 'Rank dealers/distributors by topics authored, replies, mentions, and subscriptions.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: ['number', 'string'], description: 'Lookback window in days. Default 90.' },
          limit: { type: ['number', 'string'], description: 'Max distributors to return. Default 10.' }
        }
      }
    },
    {
      name: 'product_mentions',
      description: 'Find which products / product families are mentioned in topic titles and bodies.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: ['number', 'string'], description: 'Lookback window in days. Default 90.' },
          query: { type: 'string', description: 'Optional product name filter.' },
          limit: { type: ['number', 'string'], description: 'Max products to return. Default 10.' }
        }
      }
    },
    {
      name: 'category_activity',
      description: 'Summarize activity by board and sub-category.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: ['number', 'string'], description: 'Lookback window in days. Default 90.' },
          board: { type: 'string', enum: ['swap', 'service', 'all'], description: 'Board filter. Default all.' }
        }
      }
    },
    {
      name: 'search_topics',
      description: 'Keyword search across topic titles, bodies, and replies for evidence.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search terms.' },
          board: { type: 'string', enum: ['swap', 'service', 'all'] },
          limit: { type: ['number', 'string'], description: 'Max results. Default 8.' }
        },
        required: ['query']
      }
    }
  ];

  function clampInt(n, fallback, min, max) {
    var v = parseInt(n, 10);
    if (isNaN(v)) v = fallback;
    if (v < min) v = min;
    if (v > max) v = max;
    return v;
  }

  function topicText(t) {
    var parts = [t.title || '', t.body || ''];
    (t.replies || []).forEach(function (r) {
      parts.push(r.body || '');
    });
    return parts.join('\n').toLowerCase();
  }

  function lastActivityAt(t) {
    var latest = t.createdAt || 0;
    (t.replies || []).forEach(function (r) {
      if (r.createdAt > latest) latest = r.createdAt;
    });
    return latest;
  }

  function inWindow(ts, since) {
    return !since || ts >= since;
  }

  function topicSummary(t, usersById, getCategoryLabel) {
    var author = usersById[t.authorId];
    return {
      id: t.id,
      title: t.title,
      board: t.board,
      categoryId: t.categoryId || null,
      categoryLabel: getCategoryLabel ? getCategoryLabel(t.board, t.categoryId) : '',
      authorId: t.authorId,
      authorName: author ? author.name : t.authorId,
      createdAt: t.createdAt,
      lastActivityAt: lastActivityAt(t),
      replyCount: (t.replies || []).length,
      subscriberCount: (t.subscriberIds || []).length,
      mentionCount: (t.taggedUserIds || []).length
    };
  }

  function createLocalToolRuntime(ctx) {
    var getTopics = ctx.getTopics;
    var getUsers = ctx.getUsers;
    var getCategoryLabel = ctx.getCategoryLabel || function () { return ''; };

    function usersById() {
      var map = {};
      (getUsers() || []).forEach(function (u) {
        map[u.id] = u;
      });
      return map;
    }

    function filteredTopics(board, since) {
      return (getTopics() || []).filter(function (t) {
        if (board && board !== 'all' && t.board !== board) return false;
        if (since && lastActivityAt(t) < since) return false;
        return true;
      });
    }

    var executors = {
      trending_topics: function (args) {
        args = args || {};
        var days = clampInt(args.days, 30, 1, 365);
        var limit = clampInt(args.limit, 8, 1, 25);
        var board = args.board || 'all';
        var since = Date.now() - days * DAY_MS;
        var users = usersById();

        var scored = filteredTopics(board, null).map(function (t) {
          var recentReplies = (t.replies || []).filter(function (r) {
            return inWindow(r.createdAt, since);
          }).length;
          var createdBoost = inWindow(t.createdAt, since) ? 2 : 0;
          var score =
            recentReplies * 5 +
            (t.subscriberIds || []).length * 3 +
            (t.taggedUserIds || []).length * 2 +
            createdBoost +
            (lastActivityAt(t) >= since ? 1 : 0);
          var summary = topicSummary(t, users, getCategoryLabel);
          summary.score = score;
          summary.recentReplyCount = recentReplies;
          return summary;
        });

        scored.sort(function (a, b) {
          if (b.score !== a.score) return b.score - a.score;
          return b.lastActivityAt - a.lastActivityAt;
        });

        return {
          windowDays: days,
          board: board,
          topics: scored.filter(function (t) { return t.score > 0; }).slice(0, limit)
        };
      },

      distributor_engagement: function (args) {
        args = args || {};
        var days = clampInt(args.days, 90, 1, 365);
        var limit = clampInt(args.limit, 10, 1, 50);
        var since = Date.now() - days * DAY_MS;
        var users = getUsers() || [];
        var topics = getTopics() || [];
        var byId = {};

        users.forEach(function (u) {
          byId[u.id] = {
            id: u.id,
            name: u.name,
            handle: u.handle,
            topicsAuthored: 0,
            repliesAuthored: 0,
            timesMentioned: 0,
            subscriptions: 0,
            boards: { swap: 0, service: 0 },
            score: 0,
            lastActiveAt: 0
          };
        });

        topics.forEach(function (t) {
          var author = byId[t.authorId];
          if (author && inWindow(t.createdAt, since)) {
            author.topicsAuthored += 1;
            author.boards[t.board] = (author.boards[t.board] || 0) + 1;
            if (t.createdAt > author.lastActiveAt) author.lastActiveAt = t.createdAt;
          }
          (t.taggedUserIds || []).forEach(function (uid) {
            if (byId[uid] && inWindow(t.createdAt, since)) byId[uid].timesMentioned += 1;
          });
          (t.subscriberIds || []).forEach(function (uid) {
            if (byId[uid]) byId[uid].subscriptions += 1;
          });
          (t.replies || []).forEach(function (r) {
            var ra = byId[r.authorId];
            if (ra && inWindow(r.createdAt, since)) {
              ra.repliesAuthored += 1;
              if (r.createdAt > ra.lastActiveAt) ra.lastActiveAt = r.createdAt;
            }
            (r.taggedUserIds || []).forEach(function (uid) {
              if (byId[uid] && inWindow(r.createdAt, since)) byId[uid].timesMentioned += 1;
            });
          });
        });

        var ranked = Object.keys(byId).map(function (id) {
          var row = byId[id];
          row.score =
            row.topicsAuthored * 4 +
            row.repliesAuthored * 3 +
            row.timesMentioned * 2 +
            row.subscriptions;
          return row;
        });

        ranked.sort(function (a, b) {
          if (b.score !== a.score) return b.score - a.score;
          return b.lastActiveAt - a.lastActiveAt;
        });

        return {
          windowDays: days,
          distributors: ranked.slice(0, limit)
        };
      },

      product_mentions: function (args) {
        args = args || {};
        var days = clampInt(args.days, 90, 1, 365);
        var limit = clampInt(args.limit, 10, 1, 30);
        var query = (args.query || '').toLowerCase().trim();
        var since = Date.now() - days * DAY_MS;
        var users = usersById();
        var catalog = PRODUCT_CATALOG.filter(function (p) {
          if (!query) return true;
          if (p.name.toLowerCase().indexOf(query) !== -1) return true;
          return p.labels.some(function (l) { return l.indexOf(query) !== -1 || query.indexOf(l) !== -1; });
        });

        var results = catalog.map(function (product) {
          var matches = [];
          filteredTopics('all', since).forEach(function (t) {
            var hay = topicText(t);
            var hit = product.labels.some(function (label) {
              return hay.indexOf(label) !== -1;
            });
            if (hit) matches.push(topicSummary(t, users, getCategoryLabel));
          });
          return {
            productId: product.id,
            name: product.name,
            family: product.family,
            mentionCount: matches.length,
            topics: matches.slice(0, 5)
          };
        });

        results = results.filter(function (r) { return r.mentionCount > 0; });
        results.sort(function (a, b) { return b.mentionCount - a.mentionCount; });

        return {
          windowDays: days,
          query: query || null,
          products: results.slice(0, limit)
        };
      },

      category_activity: function (args) {
        args = args || {};
        var days = clampInt(args.days, 90, 1, 365);
        var board = args.board || 'all';
        var since = Date.now() - days * DAY_MS;
        var buckets = {};

        filteredTopics(board, since).forEach(function (t) {
          var key = t.board + '::' + (t.categoryId || 'unknown');
          if (!buckets[key]) {
            buckets[key] = {
              board: t.board,
              categoryId: t.categoryId || null,
              categoryLabel: getCategoryLabel(t.board, t.categoryId) || t.categoryId || 'Unknown',
              topicCount: 0,
              replyCount: 0,
              subscriberCount: 0
            };
          }
          buckets[key].topicCount += 1;
          buckets[key].replyCount += (t.replies || []).length;
          buckets[key].subscriberCount += (t.subscriberIds || []).length;
        });

        var categories = Object.keys(buckets).map(function (k) { return buckets[k]; });
        categories.sort(function (a, b) {
          var aScore = a.topicCount + a.replyCount;
          var bScore = b.topicCount + b.replyCount;
          return bScore - aScore;
        });

        return {
          windowDays: days,
          board: board,
          categories: categories
        };
      },

      search_topics: function (args) {
        args = args || {};
        var query = (args.query || '').trim();
        if (!query) {
          return { query: '', topics: [], error: 'query is required' };
        }
        var limit = clampInt(args.limit, 8, 1, 25);
        var board = args.board || 'all';
        var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        var users = usersById();

        var hits = filteredTopics(board, null).filter(function (t) {
          var hay = topicText(t);
          return terms.every(function (term) { return hay.indexOf(term) !== -1; });
        }).map(function (t) {
          return topicSummary(t, users, getCategoryLabel);
        });

        hits.sort(function (a, b) { return b.lastActivityAt - a.lastActivityAt; });

        return {
          query: query,
          board: board,
          topics: hits.slice(0, limit)
        };
      }
    };

    return {
      schemas: TOOL_SCHEMAS,
      listTools: function () {
        return TOOL_SCHEMAS.slice();
      },
      execute: function (name, args) {
        if (!executors[name]) {
          return { error: 'Unknown tool: ' + name };
        }
        try {
          return executors[name](args || {});
        } catch (err) {
          return { error: String(err && err.message ? err.message : err) };
        }
      }
    };
  }

  global.DealerForumInsights = global.DealerForumInsights || {};
  global.DealerForumInsights.PRODUCT_CATALOG = PRODUCT_CATALOG;
  global.DealerForumInsights.TOOL_SCHEMAS = TOOL_SCHEMAS;
  global.DealerForumInsights.createLocalToolRuntime = createLocalToolRuntime;
})(window);

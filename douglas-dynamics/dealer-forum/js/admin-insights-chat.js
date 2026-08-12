/**
 * Admin Insights — generative chat UI + adapters.
 *
 * Modes (auto-selected):
 *   - groq: API key saved in Connection settings → tool-calling via Groq (direct)
 *   - api:  window.DEALER_FORUM_INSIGHTS.mode = 'api'
 *   - demo: local intent → analytics tools (no key)
 */
(function ($, global) {
  'use strict';

  var SETTINGS_KEY = 'dealerForum.insights.connection';
  var DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';
  var DEFAULT_MODEL = 'llama-3.3-70b-versatile';
  var MAX_TOOL_ROUNDS = 4;

  var SUGGESTED_PROMPTS = [
    'What topics are trending right now?',
    'Which distributors have the most engagement?',
    'Which products are being talked about?',
    'How is activity split across Swap Shop vs Service Board?',
    'Search for anything about hydraulics'
  ];

  var SYSTEM_PROMPT =
    'You are Forum Insights, an admin assistant for the Fisher dealer forum. ' +
    'Answer using the provided analytics tools only — do not invent metrics. ' +
    'Be concise, cite topic titles when relevant, and prefer ranked lists. ' +
    'If a tool returns empty results, say so clearly.';

  function getConfig() {
    var cfg = global.DEALER_FORUM_INSIGHTS || {};
    return {
      mode: cfg.mode || 'auto',
      apiUrl: cfg.apiUrl || '/api/admin/insights/chat',
      apiHeaders: cfg.apiHeaders || {},
      apiKey: normalizeApiKey(cfg.apiKey || cfg.groqApiKey || ''),
      model: cfg.model || DEFAULT_MODEL,
      baseUrl: cfg.baseUrl || DEFAULT_BASE_URL
    };
  }

  function getDemoDefaults() {
    var cfg = getConfig();
    return {
      apiKey: cfg.apiKey || '',
      model: cfg.model || DEFAULT_MODEL,
      baseUrl: cfg.baseUrl || DEFAULT_BASE_URL
    };
  }

  function normalizeApiKey(raw) {
    var key = String(raw == null ? '' : raw).trim();
    // Common paste mistakes
    if (/^bearer\s+/i.test(key)) key = key.replace(/^bearer\s+/i, '').trim();
    if (
      (key.charAt(0) === '"' && key.charAt(key.length - 1) === '"') ||
      (key.charAt(0) === "'" && key.charAt(key.length - 1) === "'")
    ) {
      key = key.slice(1, -1).trim();
    }
    return key;
  }

  function loadSettings() {
    var defaults = getDemoDefaults();
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        return {
          apiKey: defaults.apiKey,
          model: defaults.model,
          baseUrl: defaults.baseUrl,
          fromConfig: !!defaults.apiKey
        };
      }
      var parsed = JSON.parse(raw);
      var baseUrl = parsed.baseUrl || defaults.baseUrl || DEFAULT_BASE_URL;
      // Prefer direct Groq; migrate local proxy defaults from earlier builds.
      if (
        baseUrl === 'http://127.0.0.1:8787/openai/v1' ||
        baseUrl === 'http://localhost:8787/openai/v1' ||
        baseUrl === '/openai/v1'
      ) {
        baseUrl = defaults.baseUrl || DEFAULT_BASE_URL;
      }
      var storedKey = normalizeApiKey(parsed.apiKey || '');
      return {
        // UI override wins; otherwise fall back to insights-config.js
        apiKey: storedKey || defaults.apiKey,
        model: parsed.model || defaults.model || DEFAULT_MODEL,
        baseUrl: baseUrl,
        fromConfig: !storedKey && !!defaults.apiKey
      };
    } catch (e) {
      return {
        apiKey: defaults.apiKey,
        model: defaults.model,
        baseUrl: defaults.baseUrl,
        fromConfig: !!defaults.apiKey
      };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        apiKey: normalizeApiKey(settings.apiKey || ''),
        model: settings.model || DEFAULT_MODEL,
        baseUrl: settings.baseUrl || DEFAULT_BASE_URL
      })
    );
  }

  function clearSettings() {
    localStorage.removeItem(SETTINGS_KEY);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(ts) {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  }

  function detectIntent(text) {
    var q = (text || '').toLowerCase();
    if (/\b(trend|trending|hot|popular|active topic|busiest thread)/.test(q)) {
      return { tool: 'trending_topics', args: { days: 30, limit: 8 } };
    }
    if (/\b(distributor|dealer|engagement|most active|who.?s posting|leaderboard)/.test(q)) {
      return { tool: 'distributor_engagement', args: { days: 90, limit: 10 } };
    }
    if (/\b(product|sku|plow|wing|hdx|xv2|spreader|skid|being talked|mentioned)/.test(q)) {
      return { tool: 'product_mentions', args: { days: 90, limit: 10 } };
    }
    if (/\b(categor|board|swap|service board|sub-?categor|activity split)/.test(q)) {
      return { tool: 'category_activity', args: { days: 90, board: 'all' } };
    }
    if (/\b(search|find|look up|anything about|mentions of)\b/.test(q)) {
      var cleaned = text
        .replace(/^(search|find|look up|show me|anything about|mentions of)\s*/i, '')
        .replace(/[?.!]+$/g, '')
        .trim();
      return { tool: 'search_topics', args: { query: cleaned || text, limit: 8 } };
    }
    return { tool: 'search_topics', args: { query: text, limit: 8 } };
  }

  function narrativeFor(toolName, result, originalQuestion) {
    if (!result || result.error) {
      return 'I could not complete that lookup' + (result && result.error ? ' (' + result.error + ')' : '') + '.';
    }

    if (toolName === 'trending_topics') {
      if (!result.topics || !result.topics.length) {
        return 'No trending topics showed engagement in the last ' + result.windowDays + ' days.';
      }
      var lines = [
        'Here are the strongest threads over the last ' + result.windowDays + ' days (scored by recent replies, subscriptions, and mentions):'
      ];
      result.topics.forEach(function (t, i) {
        lines.push(
          (i + 1) + '. **' + t.title + '** — ' + t.authorName +
          ' · ' + t.replyCount + ' replies · ' + t.subscriberCount + ' watching' +
          (t.categoryLabel ? ' · ' + t.categoryLabel : '')
        );
      });
      return lines.join('\n');
    }

    if (toolName === 'distributor_engagement') {
      if (!result.distributors || !result.distributors.length) {
        return 'No distributor activity found in the selected window.';
      }
      var dLines = [
        'Distributor engagement over the last ' + result.windowDays + ' days:'
      ];
      result.distributors.forEach(function (d, i) {
        dLines.push(
          (i + 1) + '. **' + d.name + '** (@' + d.handle + ') — ' +
          d.topicsAuthored + ' topics, ' + d.repliesAuthored + ' replies, ' +
          d.timesMentioned + ' mentions, ' + d.subscriptions + ' subscriptions'
        );
      });
      return dLines.join('\n');
    }

    if (toolName === 'product_mentions') {
      if (!result.products || !result.products.length) {
        return 'I did not find product mentions matching that question in the last ' +
          result.windowDays + ' days. Try a broader ask, or search for a specific model.';
      }
      var pLines = [
        'Products and families showing up in forum talk (last ' + result.windowDays + ' days):'
      ];
      result.products.forEach(function (p, i) {
        pLines.push(
          (i + 1) + '. **' + p.name + '** (' + p.family + ') — ' +
          p.mentionCount + ' thread' + (p.mentionCount === 1 ? '' : 's')
        );
      });
      return pLines.join('\n');
    }

    if (toolName === 'category_activity') {
      if (!result.categories || !result.categories.length) {
        return 'No category activity in that window.';
      }
      var cLines = [
        'Board / category activity (last ' + result.windowDays + ' days):'
      ];
      result.categories.forEach(function (c, i) {
        var boardLabel = c.board === 'swap' ? 'Swap shop' : 'Service board';
        cLines.push(
          (i + 1) + '. **' + boardLabel + ' → ' + c.categoryLabel + '** — ' +
          c.topicCount + ' topics, ' + c.replyCount + ' replies'
        );
      });
      return cLines.join('\n');
    }

    if (toolName === 'search_topics') {
      if (!result.topics || !result.topics.length) {
        return 'No topics matched “' + (result.query || originalQuestion) + '”.';
      }
      var sLines = [
        'Found ' + result.topics.length + ' topic' + (result.topics.length === 1 ? '' : 's') +
        ' for “' + result.query + '”:'
      ];
      result.topics.forEach(function (t, i) {
        sLines.push(
          (i + 1) + '. **' + t.title + '** — ' + t.authorName +
          (t.categoryLabel ? ' · ' + t.categoryLabel : '') +
          ' · ' + formatDate(t.lastActivityAt)
        );
      });
      return sLines.join('\n');
    }

    return 'Here is what I found.';
  }

  function citationsFrom(toolName, result) {
    if (!result) return [];
    var topics = [];
    if (result.topics) topics = result.topics;
    if (result.products) {
      result.products.forEach(function (p) {
        (p.topics || []).forEach(function (t) { topics.push(t); });
      });
    }
    var seen = {};
    return topics.filter(function (t) {
      if (!t || !t.id || seen[t.id]) return false;
      seen[t.id] = true;
      return true;
    }).slice(0, 8);
  }

  function mergeCitations(list) {
    var seen = {};
    var out = [];
    (list || []).forEach(function (c) {
      if (!c || !c.id || seen[c.id]) return;
      seen[c.id] = true;
      out.push(c);
    });
    return out.slice(0, 8);
  }

  function toOpenAiTools(toolRuntime) {
    return toolRuntime.listTools().map(function (schema) {
      return {
        type: 'function',
        function: {
          name: schema.name,
          description: schema.description,
          parameters: schema.parameters || { type: 'object', properties: {} }
        }
      };
    });
  }

  function parseToolArgs(raw) {
    if (!raw) return {};
    var args = raw;
    if (typeof raw !== 'object') {
      try {
        args = JSON.parse(raw);
      } catch (e) {
        return {};
      }
    }
    // Coerce numeric fields models often emit as strings.
    ['days', 'limit'].forEach(function (key) {
      if (args[key] != null && typeof args[key] === 'string' && args[key] !== '') {
        var n = Number(args[key]);
        if (!isNaN(n)) args[key] = n;
      }
    });
    return args;
  }

  function createDemoAdapter(toolRuntime) {
    return {
      id: 'demo',
      label: 'Local analytics (demo)',
      ask: function (messages) {
        var lastUser = '';
        for (var i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') {
            lastUser = messages[i].content;
            break;
          }
        }
        var intent = detectIntent(lastUser);
        var result = toolRuntime.execute(intent.tool, intent.args);
        return Promise.resolve({
          reply: narrativeFor(intent.tool, result, lastUser),
          toolCalls: [{ name: intent.tool, arguments: intent.args, result: result }],
          citations: citationsFrom(intent.tool, result)
        });
      }
    };
  }

  function createApiAdapter(toolRuntime, config) {
    return {
      id: 'api',
      label: 'Connected AI',
      ask: function (messages) {
        return fetch(config.apiUrl, {
          method: 'POST',
          headers: Object.assign(
            { 'Content-Type': 'application/json', Accept: 'application/json' },
            config.apiHeaders
          ),
          body: JSON.stringify({
            messages: messages,
            tools: toolRuntime.listTools()
          })
        }).then(function (res) {
          if (!res.ok) {
            return res.text().then(function (body) {
              throw new Error('Insights API ' + res.status + (body ? ': ' + body.slice(0, 200) : ''));
            });
          }
          return res.json();
        }).then(function (data) {
          return {
            reply: data.reply || data.message || 'No reply returned from the insights API.',
            toolCalls: data.toolCalls || [],
            citations: data.citations || []
          };
        });
      }
    };
  }

  function keyHint(apiKey) {
    var key = normalizeApiKey(apiKey);
    if (!key) return '(empty)';
    if (key.length < 12) return '(too short — ' + key.length + ' chars)';
    return key.slice(0, 7) + '…' + key.slice(-4) + ' (' + key.length + ' chars)';
  }

  function formatGroqError(status, data, text, apiKey) {
    var msg =
      (data && data.error && (data.error.message || data.error)) ||
      text.slice(0, 240) ||
      ('HTTP ' + status);
    msg = String(msg);
    if (status === 401) {
      return (
        'Groq rejected the API key (401). Using ' + keyHint(apiKey) + '. ' +
        'Create a new key at console.groq.com/keys, paste it (no autofill), then Test connection.'
      );
    }
    return msg;
  }

  function testGroqConnection(settings) {
    var baseUrl = (settings.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    var apiKey = normalizeApiKey(settings.apiKey);
    if (!apiKey) {
      return Promise.reject(new Error('Enter an API key first.'));
    }
    return fetch(baseUrl + '/models', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + apiKey
      }
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          data = null;
        }
        if (!res.ok) {
          throw new Error(formatGroqError(res.status, data, text, apiKey));
        }
        var count = data && data.data ? data.data.length : 0;
        return {
          ok: true,
          message: 'Connected. Key ' + keyHint(apiKey) + ' works (' + count + ' models visible).'
        };
      });
    });
  }

  function createGroqAdapter(toolRuntime, settings) {
    var baseUrl = (settings.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    var model = settings.model || DEFAULT_MODEL;
    var apiKey = normalizeApiKey(settings.apiKey);
    var label =
      'Groq · ' + model + (settings.fromConfig ? ' (config)' : '');

    function chatCompletions(payload) {
      return fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + apiKey
        },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (e) {
            data = null;
          }
          if (!res.ok) {
            var errMsg = formatGroqError(res.status, data, text, apiKey);
            if (res.status === 0 || /Failed to fetch|NetworkError|CORS/i.test(String(errMsg))) {
              throw new Error(
                'Could not reach Groq at ' + baseUrl + '. Check your network connection.'
              );
            }
            throw new Error(String(errMsg));
          }
          return data;
        });
      }).catch(function (err) {
        if (err && /Failed to fetch|NetworkError/i.test(err.message || '')) {
          throw new Error(
            'Could not reach Groq at ' + baseUrl + '. Check your network connection.'
          );
        }
        throw err;
      });
    }

    return {
      id: 'groq',
      label: label,
      ask: function (uiMessages) {
        var openaiMessages = [{ role: 'system', content: SYSTEM_PROMPT }];
        uiMessages.forEach(function (m) {
          if (m.role === 'user' || m.role === 'assistant') {
            openaiMessages.push({ role: m.role, content: m.content });
          }
        });

        var tools = toOpenAiTools(toolRuntime);
        var recordedCalls = [];
        var allCitations = [];
        var round = 0;

        function next() {
          round += 1;
          if (round > MAX_TOOL_ROUNDS) {
            return Promise.resolve({
              reply: 'Stopped after too many tool rounds. Try a narrower question.',
              toolCalls: recordedCalls,
              citations: mergeCitations(allCitations)
            });
          }

          return chatCompletions({
            model: model,
            messages: openaiMessages,
            tools: tools,
            tool_choice: 'auto',
            temperature: 0.2,
            // Models often pass numeric tool args as strings; don't fail the whole turn.
            disable_tool_validation: true
          }).then(function (data) {
            var choice = data && data.choices && data.choices[0];
            var msg = choice && choice.message;
            if (!msg) {
              throw new Error('Empty response from Groq');
            }

            var toolCalls = msg.tool_calls || [];
            if (!toolCalls.length) {
              return {
                reply: msg.content || 'No reply returned.',
                toolCalls: recordedCalls,
                citations: mergeCitations(allCitations)
              };
            }

            openaiMessages.push({
              role: 'assistant',
              content: msg.content || null,
              tool_calls: toolCalls
            });

            toolCalls.forEach(function (tc) {
              var name = tc.function && tc.function.name;
              var args = parseToolArgs(tc.function && tc.function.arguments);
              var result = toolRuntime.execute(name, args);
              recordedCalls.push({ name: name, arguments: args, result: result });
              allCitations = allCitations.concat(citationsFrom(name, result));
              openaiMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(result)
              });
            });

            return next();
          });
        }

        return next();
      }
    };
  }

  function resolveAdapter(toolRuntime) {
    var config = getConfig();
    var settings = loadSettings();

    if (config.mode === 'api') {
      return createApiAdapter(toolRuntime, config);
    }
    if (config.mode === 'demo') {
      return createDemoAdapter(toolRuntime);
    }
    if (config.mode === 'groq' || (settings.apiKey && settings.apiKey.trim())) {
      if (!settings.apiKey || !settings.apiKey.trim()) {
        return createDemoAdapter(toolRuntime);
      }
      return createGroqAdapter(toolRuntime, settings);
    }
    return createDemoAdapter(toolRuntime);
  }

  function markdownLiteToHtml(text) {
    var escaped = escapeHtml(text);
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function createChatController(options) {
    var toolRuntime = options.toolRuntime;
    var onOpenTopic = options.onOpenTopic || function () {};
    var adapter = resolveAdapter(toolRuntime);

    var messages = [];
    var $root = options.$root;
    var $log = $root.find('[data-insights-log]');
    var $form = $root.find('[data-insights-form]');
    var $input = $root.find('[data-insights-input]');
    var $status = $root.find('[data-insights-status]');
    var $suggestions = $root.find('[data-insights-suggestions]');
    var $settingsPanel = $root.find('[data-insights-settings-panel]');
    var busy = false;

    function setBusy(isBusy) {
      busy = isBusy;
      $root.toggleClass('is-busy', isBusy);
      $input.prop('disabled', isBusy);
      $form.find('button[type="submit"]').prop('disabled', isBusy);
    }

    function refreshAdapter() {
      adapter = resolveAdapter(toolRuntime);
      $status.text(adapter.label);
    }

    function fillSettingsForm() {
      var s = loadSettings();
      $root.find('[data-insights-api-key]').val(s.apiKey || '');
      $root.find('[data-insights-base-url]').val(s.baseUrl || DEFAULT_BASE_URL);
      var $model = $root.find('[data-insights-model]');
      if (s.model && !$model.find('option[value="' + s.model + '"]').length) {
        $model.append($('<option/>').val(s.model).text(s.model));
      }
      $model.val(s.model || DEFAULT_MODEL);
    }

    function openSettings() {
      fillSettingsForm();
      $settingsPanel.prop('hidden', false);
    }

    function closeSettings() {
      $settingsPanel.prop('hidden', true);
    }

    function renderSuggestions() {
      $suggestions.empty();
      SUGGESTED_PROMPTS.forEach(function (prompt) {
        var $btn = $('<button type="button" class="insights-chip"/>')
          .text(prompt)
          .attr('data-prompt', prompt);
        $suggestions.append($btn);
      });
    }

    function appendBubble(role, html, meta) {
      var $row = $('<div class="insights-msg"/>').addClass('insights-msg--' + role);
      var $bubble = $('<div class="insights-bubble"/>').html(html);
      $row.append($bubble);

      if (meta && meta.toolCalls && meta.toolCalls.length) {
        var names = meta.toolCalls.map(function (t) { return t.name; }).join(', ');
        $row.append(
          $('<div class="insights-meta"/>').text('Used tool: ' + names)
        );
      }

      if (meta && meta.citations && meta.citations.length) {
        var $cites = $('<ul class="insights-citations"/>');
        meta.citations.forEach(function (c) {
          var $li = $('<li/>');
          var $a = $('<a href="#" class="insights-topic-link"/>')
            .attr('data-topic-id', c.id)
            .text(c.title || c.id);
          $li.append($a);
          if (c.authorName) {
            $li.append($('<span class="insights-cite-meta"/>').text(' · ' + c.authorName));
          }
          $cites.append($li);
        });
        $row.append($cites);
      }

      $log.append($row);
      $log.scrollTop($log[0].scrollHeight);
    }

    function showWelcome() {
      $log.empty();
      messages = [];
      refreshAdapter();
      var settings = loadSettings();
      var connected = adapter.id === 'groq';
      appendBubble(
        'assistant',
        connected
          ? 'Connected to Groq' +
            (settings.fromConfig ? ' (demo key from insights-config.js)' : '') +
            '. Ask about forum trends, distributor engagement, product talk, or category activity — answers use live analytics tools.'
          : 'Ask about forum trends, distributor engagement, product talk, or category activity. ' +
            'Running in local demo mode. Add a key in <code>js/insights-config.js</code> or open <strong>API key</strong> to connect Groq.'
      );
      renderSuggestions();
    }

    function send(text) {
      var content = (text || '').trim();
      if (!content || busy) return;

      refreshAdapter();
      $suggestions.empty();
      messages.push({ role: 'user', content: content });
      appendBubble('user', escapeHtml(content));
      setBusy(true);
      appendBubble('assistant', '<span class="insights-typing">Thinking…</span>');

      adapter.ask(messages.slice())
        .then(function (response) {
          $log.find('.insights-msg--assistant').last().remove();
          messages.push({ role: 'assistant', content: response.reply });
          appendBubble('assistant', markdownLiteToHtml(response.reply), response);
        })
        .catch(function (err) {
          $log.find('.insights-msg--assistant').last().remove();
          var msg =
            'Something went wrong. ' +
            (err && err.message ? err.message : 'Please try again.');
          appendBubble('assistant', escapeHtml(msg));
        })
        .then(function () {
          setBusy(false);
          $input.focus();
        });
    }

    $form.on('submit', function (e) {
      e.preventDefault();
      var val = $input.val();
      $input.val('');
      send(val);
    });

    $suggestions.on('click', '.insights-chip', function () {
      send($(this).attr('data-prompt'));
    });

    $log.on('click', '.insights-topic-link', function (e) {
      e.preventDefault();
      var id = $(this).attr('data-topic-id');
      if (id) onOpenTopic(id);
    });

    $root.find('[data-insights-reset]').on('click', function () {
      showWelcome();
      $input.focus();
    });

    $root.find('[data-insights-settings]').on('click', function () {
      if ($settingsPanel.prop('hidden')) openSettings();
      else closeSettings();
    });

    $root.find('[data-insights-close-settings]').on('click', closeSettings);

    function readSettingsFromForm() {
      return {
        apiKey: normalizeApiKey($root.find('[data-insights-api-key]').val() || ''),
        model: $root.find('[data-insights-model]').val() || DEFAULT_MODEL,
        baseUrl: ($root.find('[data-insights-base-url]').val() || DEFAULT_BASE_URL).trim()
      };
    }

    function setTestStatus(ok, message) {
      var $st = $root.find('[data-insights-test-status]');
      $st
        .prop('hidden', false)
        .toggleClass('is-ok', !!ok)
        .toggleClass('is-err', !ok)
        .text(message);
    }

    $root.find('[data-insights-settings-form]').on('submit', function (e) {
      e.preventDefault();
      var next = readSettingsFromForm();
      if (!next.apiKey) {
        setTestStatus(false, 'Enter a Groq API key before saving, or use Clear key for demo mode.');
        return;
      }
      if (!/^gsk_/i.test(next.apiKey)) {
        setTestStatus(
          false,
          'That does not look like a Groq key (usually starts with gsk_). Paste only the key — no quotes or Bearer.'
        );
        return;
      }
      saveSettings(next);
      $root.find('[data-insights-api-key]').val(next.apiKey);
      refreshAdapter();
      setTestStatus(true, 'Saved key ' + keyHint(next.apiKey) + '. Click Test connection to verify.');
      $status.text(adapter.label);
    });

    $root.find('[data-insights-test-settings]').on('click', function () {
      var next = readSettingsFromForm();
      setTestStatus(true, 'Testing ' + keyHint(next.apiKey) + '…');
      testGroqConnection(next)
        .then(function (result) {
          saveSettings(next);
          refreshAdapter();
          $status.text(adapter.label);
          setTestStatus(true, result.message);
        })
        .catch(function (err) {
          setTestStatus(false, err && err.message ? err.message : 'Connection failed.');
        });
    });

    $root.find('[data-insights-clear-settings]').on('click', function () {
      clearSettings();
      fillSettingsForm();
      $root.find('[data-insights-test-status]').prop('hidden', true).text('');
      closeSettings();
      showWelcome();
      appendBubble('assistant', 'API key cleared. Back to local demo mode.');
    });

    showWelcome();

    return {
      send: send,
      reset: showWelcome,
      getAdapterId: function () { return adapter.id; },
      openSettings: openSettings
    };
  }

  function initAdminInsights(opts) {
    opts = opts || {};
    var Insights = global.DealerForumInsights;
    if (!Insights || !Insights.createLocalToolRuntime) {
      console.warn('Admin Insights tools not loaded');
      return null;
    }

    var toolRuntime = Insights.createLocalToolRuntime({
      getTopics: opts.getTopics,
      getUsers: opts.getUsers,
      getCategoryLabel: opts.getCategoryLabel
    });

    var $panel = $('#admin-insights-panel');
    var $backdrop = $('#admin-insights-backdrop');

    function openPanel() {
      $panel.addClass('is-open').attr('aria-hidden', 'false');
      $backdrop.addClass('is-open').attr('aria-hidden', 'false');
      $('body').addClass('insights-open');
      setTimeout(function () {
        $panel.find('[data-insights-input]').focus();
      }, 50);
    }

    function closePanel() {
      $panel.removeClass('is-open').attr('aria-hidden', 'true');
      $backdrop.removeClass('is-open').attr('aria-hidden', 'true');
      $('body').removeClass('insights-open');
    }

    var controller = createChatController({
      $root: $panel,
      toolRuntime: toolRuntime,
      onOpenTopic: function (topicId) {
        closePanel();
        if (opts.onOpenTopic) opts.onOpenTopic(topicId);
      }
    });

    $(document).on('click', '[data-open-insights]', function (e) {
      e.preventDefault();
      openPanel();
    });
    $panel.find('[data-close-insights]').on('click', closePanel);
    $backdrop.on('click', closePanel);
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape' && $panel.hasClass('is-open')) closePanel();
    });

    Insights.runtime = toolRuntime;
    Insights.chat = controller;
    Insights.open = openPanel;
    Insights.close = closePanel;

    return controller;
  }

  global.DealerForumInsights = global.DealerForumInsights || {};
  global.DealerForumInsights.initAdminInsights = initAdminInsights;
  global.DealerForumInsights.SUGGESTED_PROMPTS = SUGGESTED_PROMPTS;
  global.DealerForumInsights.loadSettings = loadSettings;
})(jQuery, window);

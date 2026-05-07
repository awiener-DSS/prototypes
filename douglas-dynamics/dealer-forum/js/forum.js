(function ($) {
  'use strict';

  var STORAGE_KEY = 'dealerForum.v1';
  var LIGHTBOX_PLACEHOLDER_SRC =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  var categoryFilterByBoard = { swap: null, service: null };
  var pendingTopicAttachments = [];
  var pendingReplyAttachments = [];

  var MOCK_USERS = [
    { id: 'u1', name: 'North Ridge Truck', handle: 'northridge' },
    { id: 'u2', name: 'Lake Effect Fleet', handle: 'lakeeffect' },
    { id: 'u3', name: 'Metro Snow Pros', handle: 'metrosnow' },
    { id: 'u4', name: 'High Country Service', handle: 'highcountry' }
  ];

  var BOARD_CATEGORIES = {
    swap: [
      { id: 'parts-wear', label: 'Parts & wear' },
      { id: 'blades-wings', label: 'Blades & wings' },
      { id: 'hydraulics', label: 'Hydraulics & fittings' },
      { id: 'mounts-trucks', label: 'Mounts & vehicle fit' },
      { id: 'spreaders', label: 'Spreaders & ice control' },
      { id: 'misc-general', label: 'General & misc' }
    ],
    service: [
      { id: 'inspection', label: 'Inspection & trip-edge' },
      { id: 'hydraulics-service', label: 'Hydraulics service' },
      { id: 'electrical', label: 'Electrical & controls' },
      { id: 'shop-operations', label: 'Shop operations & training' },
      { id: 'seasonal', label: 'Storage & seasonal PM' },
      { id: 'fleet-admin', label: 'Fleet, warranty & admin' }
    ]
  };

  function getCategoryLabel(board, categoryId) {
    var list = BOARD_CATEGORIES[board];
    if (!list) return '';
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === categoryId) return list[i].label;
    }
    return '';
  }

  function ensureTopicCategory(t) {
    var list = BOARD_CATEGORIES[t.board];
    if (!list || !list.length) return;
    var valid = {};
    for (var i = 0; i < list.length; i++) valid[list[i].id] = true;
    if (!t.categoryId || !valid[t.categoryId]) {
      t.categoryId = list[0].id;
    }
  }

  function demoImageAttachment() {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect fill="#F9DD4A" width="320" height="200"/><text x="160" y="105" text-anchor="middle" fill="#1b1b1b" font-family="system-ui,sans-serif" font-size="18" font-weight="600">Demo — click to enlarge</text></svg>';
    return {
      type: 'image/svg+xml',
      name: 'demo-forum-image.svg',
      dataUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    };
  }

  function populateFormCategories(board) {
    var $sel = $('#form-category');
    $sel.empty();
    var list = BOARD_CATEGORIES[board] || [];
    for (var j = 0; j < list.length; j++) {
      $sel.append($('<option/>').val(list[j].id).text(list[j].label));
    }
  }

  function defaultTopics() {
    var now = Date.now();
    return [
      {
        id: 't1',
        board: 'swap',
        categoryId: 'blades-wings',
        title: 'Used XV2 wing — Western NY',
        body: '2019 wing assembly, good hydraulics. @metrosnow you had asked about spare wings last season — ping me if still interested.',
        authorId: 'u1',
        createdAt: now - 86400000 * 3,
        taggedUserIds: ['u3'],
        attachments: [],
        subscriberIds: [],
        replies: [
          {
            id: 'r1',
            authorId: 'u3',
            body: 'Thanks @northridge — still interested. Can you ship or pickup only?',
            createdAt: now - 86400000 * 2,
            taggedUserIds: ['u1']
          }
        ]
      },
      {
        id: 't2',
        board: 'swap',
        categoryId: 'blades-wings',
        title: 'Trade: poly moldboard for steel',
        body: 'Looking to swap poly for steel HDX moldboard. Prefer local pickup within 100 mi.',
        authorId: 'u2',
        createdAt: now - 86400000,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: ['u1'],
        replies: []
      },
      {
        id: 't3',
        board: 'service',
        categoryId: 'inspection',
        title: 'Trip-edge service bulletin recap',
        body: 'Sharing our shop checklist after the latest trip-edge inspection guide. Torque specs in the dealer portal — link your photos when posting wear patterns.\n\nTagging @highcountry for the western region notes.',
        authorId: 'u4',
        createdAt: now - 86400000 * 2,
        taggedUserIds: ['u4'],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't4',
        board: 'swap',
        categoryId: 'parts-wear',
        title: 'FISHER skid shoes — new old stock',
        body: 'Four pairs carbide skid shoes, part numbers in photo. Pickup near Buffalo. @lakeeffect call dibs if you need a set.',
        authorId: 'u3',
        createdAt: now - 86400000 * 4,
        taggedUserIds: ['u2'],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't5',
        board: 'swap',
        categoryId: 'blades-wings',
        title: 'Western wide-out wings — needs paint',
        body: 'Pair of wings off a 2017. Straight but cosmetically rough. Make an offer.',
        authorId: 'u2',
        createdAt: now - 86400000 * 5,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't6',
        board: 'swap',
        categoryId: 'misc-general',
        title: 'ISO: used controller for fleet flex',
        body: 'Looking for a working module for older fleet install — DM @metrosnow if you parted a truck.',
        authorId: 'u1',
        createdAt: now - 86400000 * 6,
        taggedUserIds: ['u3'],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't7',
        board: 'swap',
        categoryId: 'blades-wings',
        title: 'Trade: straight blade for V plow',
        body: 'HDX straight 8 ft, want comparable V in similar condition. Colorado front range.',
        authorId: 'u4',
        createdAt: now - 86400000 * 7,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't8',
        board: 'swap',
        categoryId: 'hydraulics',
        title: 'Shop cleanup — hoses, fittings, misc',
        body: 'Bin of hydraulic fittings and hoses from closed bay. Free to dealer who can use them; first come.',
        authorId: 'u2',
        createdAt: now - 86400000 * 8,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't9',
        board: 'swap',
        categoryId: 'spreaders',
        title: 'Snowcaster spreader — motor weak',
        body: 'POLY-CASTER™ style unit, motor spins slow. Good for parts or rebuild. $400 OBO.',
        authorId: 'u3',
        createdAt: now - 86400000 * 9,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't10',
        board: 'swap',
        categoryId: 'parts-wear',
        title: 'WTB: trip springs (heavy duty)',
        body: 'Need four heavy trip springs for fleet refresh. Prefer OEM or known aftermarket.',
        authorId: 'u1',
        createdAt: now - 86400000 * 10,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't11',
        board: 'swap',
        categoryId: 'mounts-trucks',
        title: 'Mount kit — Ford F250 2015–2019',
        body: 'Complete mount pulled from trade-in. All hardware bagged and labeled.',
        authorId: 'u4',
        createdAt: now - 86400000 * 11,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't12',
        board: 'swap',
        categoryId: 'misc-general',
        title: 'Lighting package — LED strobes',
        body: 'Used LED bar and corner strobes, all working. Upgraded our fleet to new spec.',
        authorId: 'u2',
        createdAt: now - 86400000 * 12,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't13',
        board: 'swap',
        categoryId: 'parts-wear',
        title: 'Back drag edge — 7.5 ft rubber',
        body: 'Good rubber, mounting holes clean. Too narrow for our new blades.',
        authorId: 'u3',
        createdAt: now - 86400000 * 13,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't14',
        board: 'swap',
        categoryId: 'misc-general',
        title: 'Dealer transfer: excess inventory list (Q2)',
        body: 'Spreadsheet link internally — excess cutting edges and shoes. @northridge coordinating regional swaps.',
        authorId: 'u1',
        createdAt: now - 86400000 * 14,
        taggedUserIds: ['u1'],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't15',
        board: 'service',
        categoryId: 'hydraulics-service',
        title: 'Hydraulic fluid spec — cold climate',
        body: 'What are you running below −20°F? We switched to a lighter ISO and saw better cycle times. Share batch numbers if you have them.',
        authorId: 'u2',
        createdAt: now - 86400000 * 3,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't16',
        board: 'service',
        categoryId: 'inspection',
        title: 'Lift arm bushing wear — inspection tips',
        body: 'Photos of typical wear patterns attached in thread. Check torque after first storm of season.',
        authorId: 'u3',
        createdAt: now - 86400000 * 4,
        taggedUserIds: ['u4'],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't17',
        board: 'service',
        categoryId: 'electrical',
        title: 'Electrical gremlins after salt season',
        body: 'Ground strap corrosion on older installs — we added a maintenance step mid-season. Worth a look on fleet PMs.',
        authorId: 'u1',
        createdAt: now - 86400000 * 5,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't18',
        board: 'service',
        categoryId: 'seasonal',
        title: 'Plow storage — off-truck checklist',
        body: 'Our shop checklist: relieve pressure, grease zerks, paint touch, cover rams. Anything you add?',
        authorId: 'u4',
        createdAt: now - 86400000 * 6,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't19',
        board: 'service',
        categoryId: 'inspection',
        title: 'Welding cracked moldboard — procedures',
        body: 'Pre-heat and rod type discussion. Post your before/after if you have them.',
        authorId: 'u2',
        createdAt: now - 86400000 * 7,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't20',
        board: 'service',
        categoryId: 'electrical',
        title: 'Fleet telematics integration lessons',
        body: 'What worked for hour meters and fault codes on mixed-vintage trucks?',
        authorId: 'u3',
        createdAt: now - 86400000 * 8,
        taggedUserIds: ['u2'],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't21',
        board: 'service',
        categoryId: 'shop-operations',
        title: 'Paint and corrosion — shop standards',
        body: 'Epoxy primer sequence we use before topcoat. Open to better ideas from coastal dealers.',
        authorId: 'u1',
        createdAt: now - 86400000 * 9,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't22',
        board: 'service',
        categoryId: 'shop-operations',
        title: 'New hire training — one-week outline',
        body: 'Sharing our shadowing schedule for green techs. @highcountry added a half day on trip-edge theory.',
        authorId: 'u4',
        createdAt: now - 86400000 * 10,
        taggedUserIds: ['u4'],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't23',
        board: 'service',
        categoryId: 'fleet-admin',
        title: 'Recall tracking spreadsheet template',
        body: 'Simple Google Sheet template for VIN + completion date. Request access via DM.',
        authorId: 'u2',
        createdAt: now - 86400000 * 11,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't24',
        board: 'service',
        categoryId: 'hydraulics-service',
        title: 'Noise in lift cylinder — diagnosis tree',
        body: 'Flowchart we use: cavitation vs internal leak vs relief valve. Happy to refine with your notes.',
        authorId: 'u3',
        createdAt: now - 86400000 * 12,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't25',
        board: 'service',
        categoryId: 'seasonal',
        title: 'Seasonal PM pricing — dealer poll',
        body: 'Ballpark labor hours for full preseason PM on HDX vs XV2? Trying to normalize quotes.',
        authorId: 'u1',
        createdAt: now - 86400000 * 13,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't26',
        board: 'service',
        categoryId: 'shop-operations',
        title: 'Customer handoff documentation',
        body: 'What do you leave in the glove box besides manual? Our one-pager template attached internally.',
        authorId: 'u4',
        createdAt: now - 86400000 * 14,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't27',
        board: 'service',
        categoryId: 'shop-operations',
        title: 'Tooling list for mobile service van',
        body: 'Updated inventory for 2026 — torque wrench ranges, spare pins, portable press.',
        authorId: 'u2',
        createdAt: now - 86400000 * 15,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't28',
        board: 'service',
        categoryId: 'fleet-admin',
        title: 'Warranty photo standards',
        body: 'Minimum angles we require before submitting — saves back-and-forth with the factory.',
        authorId: 'u3',
        createdAt: now - 86400000 * 16,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't29',
        board: 'swap',
        categoryId: 'parts-wear',
        title: 'Cutting edges — 9 ft, half life left',
        body: 'Pulled from fleet upgrade. Four bolt holes need reamed. @lakeeffect might want for backup pair.',
        authorId: 'u2',
        createdAt: now - 86400000 * 17,
        taggedUserIds: ['u2'],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't30',
        board: 'swap',
        categoryId: 'blades-wings',
        title: 'XLS wing cylinder — one side',
        body: 'Good rod, no pitting. Other side failed inspection — selling as-is for parts.',
        authorId: 'u4',
        createdAt: now - 86400000 * 17 - 3600000,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't31',
        board: 'swap',
        categoryId: 'hydraulics',
        title: 'Quick-coupler set + dust caps',
        body: 'Ag ISO couplers, bag of caps. Switched fleet to different style.',
        authorId: 'u1',
        createdAt: now - 86400000 * 18,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't32',
        board: 'swap',
        categoryId: 'mounts-trucks',
        title: 'Ram 2500 mount — 2020–2023',
        body: 'Customer traded before install. Brackets still in wrap.',
        authorId: 'u3',
        createdAt: now - 86400000 * 18 - 7200000,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't33',
        board: 'swap',
        categoryId: 'spreaders',
        title: 'Spreader controller harness — long lead',
        body: 'Extension harness for bed retrofit project we never did. Part numbers in internal catalog.',
        authorId: 'u2',
        createdAt: now - 86400000 * 19,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't34',
        board: 'swap',
        categoryId: 'misc-general',
        title: 'Shop radio / comms charger bank',
        body: 'Six-bay charger for Motorola-style portables. Works; we moved to different radios.',
        authorId: 'u4',
        createdAt: now - 86400000 * 19 - 3600000,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't35',
        board: 'service',
        categoryId: 'inspection',
        title: 'Moldboard hinge pin wear — go / no-go',
        body: 'Photos of acceptable vs replace-now wear. Pin gauge step we use inlane shared in portal.',
        authorId: 'u1',
        createdAt: now - 86400000 * 17,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't36',
        board: 'service',
        categoryId: 'hydraulics-service',
        title: 'Reservoir venting — foaming after long cycles',
        body: 'Anyone else see foam on all-day municipal routes? We drilled a secondary vent and it calmed down.',
        authorId: 'u2',
        createdAt: now - 86400000 * 18,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't37',
        board: 'service',
        categoryId: 'electrical',
        title: 'Joystick calibration — cold start drift',
        body: 'Reset procedure that worked for us after firmware update last fall.',
        authorId: 'u3',
        createdAt: now - 86400000 * 18 - 5400000,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't38',
        board: 'service',
        categoryId: 'shop-operations',
        title: 'Lift table staging — plow handling tips',
        body: 'How we stage HDX vs XV2 on two-post without scratching paint. Foam blocks SKU in comments.',
        authorId: 'u4',
        createdAt: now - 86400000 * 19,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't39',
        board: 'service',
        categoryId: 'seasonal',
        title: 'Post-season ram treatment — what we spray',
        body: 'Silicone-free protectant list and what to avoid around seal kits.',
        authorId: 'u1',
        createdAt: now - 86400000 * 19 - 7200000,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't40',
        board: 'service',
        categoryId: 'fleet-admin',
        title: 'Courtesy truck loan documentation',
        body: 'Liability waiver + photo log we use when customer truck is down during service.',
        authorId: 'u2',
        createdAt: now - 86400000 * 20,
        taggedUserIds: [],
        attachments: [],
        subscriberIds: [],
        replies: []
      },
      {
        id: 't41',
        board: 'swap',
        categoryId: 'blades-wings',
        title: 'Demo: attachment + lightbox (click thumbnail)',
        body:
          'This topic includes a small demo image. Click the thumbnail to open the lightbox. Drag images onto New topic or Reply to attach your own.',
        authorId: 'u1',
        createdAt: now - 3600000,
        taggedUserIds: [],
        attachments: [demoImageAttachment()],
        subscriberIds: [],
        replies: []
      }
    ];
  }

  function ensureTopicShape(t) {
    if (!t.replies || !Array.isArray(t.replies)) t.replies = [];
    for (var ri = 0; ri < t.replies.length; ri++) {
      if (!t.replies[ri].attachments || !Array.isArray(t.replies[ri].attachments)) {
        t.replies[ri].attachments = [];
      }
    }
    ensureTopicCategory(t);
    return t;
  }

  function appendAttachmentThumbnails($parent, attachments) {
    if (!attachments || !attachments.length) return;
    attachments.forEach(function (a) {
      if ((a.type || '').indexOf('image') === 0) {
        var $th = $('<div class="thumbnail topic-attachment-thumb"/>');
        var $img = $('<img class="img-responsive js-lightbox-img"/>')
          .attr('src', a.dataUrl)
          .attr('alt', a.name || 'Attached image')
          .attr('role', 'button')
          .attr('tabindex', 0);
        $th.append($img);
        $parent.append($th);
      } else if ((a.type || '').indexOf('video') === 0) {
        var $v = $('<video controls class="img-responsive topic-attachment-video"/>').css(
          'max-width',
          '400px'
        );
        $v.append($('<source/>').attr('src', a.dataUrl).attr('type', a.type));
        $parent.append($v);
      }
    });
  }

  function mimeFromFileName(name) {
    var ext = (name && name.split('.').pop()) || '';
    ext = ext.toLowerCase();
    var map = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      heic: 'image/heic',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      m4v: 'video/x-m4v'
    };
    return map[ext] || '';
  }

  function isImageOrVideoFile(f) {
    var t = (f.type || '').toLowerCase();
    if (t.indexOf('image/') === 0 || t.indexOf('video/') === 0) return true;
    var inferred = mimeFromFileName(f.name);
    return inferred.indexOf('image/') === 0 || inferred.indexOf('video/') === 0;
  }

  function renderMediaPreviewTiles($preview, arr) {
    $preview.empty();
    arr.forEach(function (att) {
      var $tile = $('<div class="media-preview-tile"/>');
      if ((att.type || '').indexOf('image') === 0) {
        $tile.append(
          $('<img class="img-thumbnail js-lightbox-img"/>')
            .attr('src', att.dataUrl)
            .attr('alt', att.name || '')
            .attr('role', 'button')
            .attr('tabindex', 0)
            .css({ maxHeight: '96px', verticalAlign: 'top', marginRight: '8px' })
        );
      } else {
        $tile.append(
          $('<span class="small text-muted"/>').text(att.name || 'Video')
        );
      }
      var $rm = $('<button type="button" class="btn btn-link btn-sm media-preview-remove"/>').text(
        'Remove'
      );
      (function (attachmentRef) {
        $rm.on('click', function () {
          var i = arr.indexOf(attachmentRef);
          if (i !== -1) arr.splice(i, 1);
          renderMediaPreviewTiles($preview, arr);
        });
      })(att);
      $tile.append($rm);
      $preview.append($tile);
    });
  }

  function addFilesToAttachmentArray(files, arr, $preview) {
    var list = Array.prototype.slice.call(files || []).filter(isImageOrVideoFile);
    if (!list.length) return;
    var pending = list.length;
    list.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var mime = file.type || mimeFromFileName(file.name) || 'application/octet-stream';
        arr.push({ type: mime, name: file.name, dataUrl: ev.target.result });
        pending -= 1;
        if (pending === 0) renderMediaPreviewTiles($preview, arr);
      };
      reader.readAsDataURL(file);
    });
  }

  function bindMediaDropZone($zone, onFilesDropped) {
    $zone.on('dragover dragenter', function (e) {
      e.preventDefault();
      e.stopPropagation();
      $zone.addClass('is-dragover');
    });
    $zone.on('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var rel = e.relatedTarget;
      if (!rel || !$zone[0].contains(rel)) $zone.removeClass('is-dragover');
    });
    $zone.on('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      $zone.removeClass('is-dragover');
      var dt = e.originalEvent.dataTransfer;
      if (dt && dt.files && dt.files.length) onFilesDropped(dt.files);
    });
  }

  function mergeMissingSeedTopics(stored) {
    var seeds = defaultTopics();
    var ids = {};
    for (var i = 0; i < stored.topics.length; i++) {
      ids[stored.topics[i].id] = true;
    }
    var added = false;
    for (var j = 0; j < seeds.length; j++) {
      if (!ids[seeds[j].id]) {
        var copy = JSON.parse(JSON.stringify(seeds[j]));
        ensureTopicShape(copy);
        stored.topics.push(copy);
        ids[copy.id] = true;
        added = true;
      }
    }
    return added;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.topics) {
          parsed.topics.forEach(ensureTopicShape);
          if (mergeMissingSeedTopics(parsed)) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            } catch (e) { /* quota */ }
          }
          return parsed;
        }
      }
    } catch (e) { /* ignore */ }
    return { topics: defaultTopics(), currentUserId: 'u1' };
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota */ }
  }

  function userById(id) {
    for (var i = 0; i < MOCK_USERS.length; i++) {
      if (MOCK_USERS[i].id === id) return MOCK_USERS[i];
    }
    return { id: id, name: 'Unknown', handle: 'unknown' };
  }

  function formatDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function activeBoard() {
    var $active = $('.board-tabs .nav-tabs li.active a[data-board]');
    var b = $active.attr('data-board');
    return b === 'service' ? 'service' : 'swap';
  }

  function topicSearchHay(t) {
    var parts = [t.title || '', t.body || ''];
    ensureTopicCategory(t);
    parts.push(getCategoryLabel(t.board, t.categoryId).toLowerCase());
    var author = userById(t.authorId);
    parts.push(author.name || '', author.handle || '');
    (t.taggedUserIds || []).forEach(function (id) {
      var u = userById(id);
      parts.push(u.name, '@' + u.handle);
    });
    (t.replies || []).forEach(function (r) {
      parts.push(r.body || '');
      var ra = userById(r.authorId);
      parts.push(ra.name, ra.handle);
      (r.taggedUserIds || []).forEach(function (rid) {
        var uu = userById(rid);
        parts.push(uu.name, '@' + uu.handle);
      });
    });
    return parts.join('\n').toLowerCase();
  }

  function filterTopics(topics, board, q) {
    q = (q || '').trim().toLowerCase();
    var terms = q ? q.split(/\s+/).filter(function (w) { return w.length > 0; }) : [];
    return topics.filter(function (t) {
      if (t.board !== board) return false;
      if (!terms.length) return true;
      var hay = topicSearchHay(t);
      for (var i = 0; i < terms.length; i++) {
        if (hay.indexOf(terms[i]) === -1) return false;
      }
      return true;
    });
  }

  function appendTopicRow($ul, state, t, showCategoryLabel) {
    ensureTopicCategory(t);
    var author = userById(t.authorId);
    var subbed = t.subscriberIds.indexOf(state.currentUserId) !== -1;
    var catLabel = getCategoryLabel(t.board, t.categoryId);
    var nReply = (t.replies || []).length;
    var replyPhrase = nReply === 1 ? '1 reply' : nReply + ' replies';
    var $h3 = $('<h3 class="topic-title"/>').text(t.title);
    if (catLabel && showCategoryLabel !== false) {
      $h3.append(
        $('<span class="label label-default topic-category-pill"/>').text(catLabel)
      );
    }
    var $li = $('<li class="topic-row" role="button" tabindex="0"/>')
      .attr('data-topic-id', t.id)
      .append($h3)
      .append(
        $('<div class="topic-meta"/>').html(
          '<span class="glyphicon glyphicon-user"></span> ' + author.name +
          ' · <span class="glyphicon glyphicon-calendar"></span> ' + formatDate(t.createdAt) +
          ' · <span class="glyphicon glyphicon-comment"></span> ' + replyPhrase +
          (subbed ? ' · <span class="glyphicon glyphicon-star text-warning"></span> Subscribed' : '')
        )
      );
    $ul.append($li);
  }

  function renderTopicBoard(state, board, searchQuery) {
    var list = filterTopics(state.topics, board, searchQuery);
    var $container = $('#topic-board-' + board);
    $container.empty();
    if (!list.length) {
      categoryFilterByBoard[board] = null;
      $container.append(
        '<p class="text-muted topic-category-empty" style="padding:16px 18px;margin:0">No topics match your search.</p>'
      );
      return;
    }
    if (categoryFilterByBoard[board]) {
      var sel = categoryFilterByBoard[board];
      var stillHas = false;
      for (var x = 0; x < list.length; x++) {
        ensureTopicCategory(list[x]);
        if (list[x].categoryId === sel) {
          stillHas = true;
          break;
        }
      }
      if (!stillHas) categoryFilterByBoard[board] = null;
    }
    var byCat = {};
    for (var i = 0; i < list.length; i++) {
      ensureTopicCategory(list[i]);
      var cid = list[i].categoryId;
      if (!byCat[cid]) byCat[cid] = [];
      byCat[cid].push(list[i]);
    }
    var $toolbar = $('<div class="topic-category-pills-toolbar"/>');
    var $allBtn = $('<button type="button" class="btn btn-default btn-sm topic-filter-pill"/>')
      .text('All')
      .attr('aria-pressed', categoryFilterByBoard[board] === null ? 'true' : 'false');
    if (categoryFilterByBoard[board] === null) {
      $allBtn.addClass('active topic-filter-pill--active');
    }
    $allBtn.on('click', function () {
      categoryFilterByBoard[board] = null;
      renderTopicBoard(state, board, searchQuery);
    });
    $toolbar.append($allBtn);
    var catOrder = BOARD_CATEGORIES[board] || [];
    for (var c = 0; c < catOrder.length; c++) {
      var catDef = catOrder[c];
      var topicsInCat = byCat[catDef.id];
      if (!topicsInCat || !topicsInCat.length) continue;
      var n = topicsInCat.length;
      var $pill = $('<button type="button" class="btn btn-default btn-sm topic-filter-pill"/>')
        .attr('data-category-id', catDef.id)
        .attr('aria-pressed', categoryFilterByBoard[board] === catDef.id ? 'true' : 'false');
      if (categoryFilterByBoard[board] === catDef.id) {
        $pill.addClass('active topic-filter-pill--active');
      }
      $pill.append(document.createTextNode(catDef.label + ' '));
      $pill.append($('<span class="badge"/>').text(n));
      (function (catId) {
        $pill.on('click', function () {
          categoryFilterByBoard[board] = catId;
          renderTopicBoard(state, board, searchQuery);
        });
      })(catDef.id);
      $toolbar.append($pill);
    }
    var displayList = list.filter(function (t) {
      return (
        categoryFilterByBoard[board] === null ||
        t.categoryId === categoryFilterByBoard[board]
      );
    });
    displayList.sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });
    var $ul = $('<ul class="topic-list topic-list-filtered"/>');
    var showCatLabel = categoryFilterByBoard[board] === null;
    for (var k = 0; k < displayList.length; k++) {
      appendTopicRow($ul, state, displayList[k], showCatLabel);
    }
    $container.append($toolbar).append($ul);
  }

  function refreshAllTopicLists(state, searchQuery) {
    renderTopicBoard(state, 'swap', searchQuery);
    renderTopicBoard(state, 'service', searchQuery);
  }

  function renderSubscriptions(state) {
    var $ul = $('#subscription-list');
    $ul.empty();
    var subs = state.topics.filter(function (t) {
      return t.subscriberIds.indexOf(state.currentUserId) !== -1;
    });
    if (!subs.length) {
      $ul.append('<li class="text-muted">No subscriptions yet.</li>');
      return;
    }
    subs.sort(function (a, b) { return b.createdAt - a.createdAt; });
    subs.forEach(function (t) {
      var $a = $('<a href="#"/>').text(t.title).on('click', function (e) {
        e.preventDefault();
        showTopic(state, t.id);
      });
      $ul.append($('<li/>').append($a));
    });
  }

  function setForumMainLayout(showBoardChrome) {
    var $main = $('#forum-main-col');
    var $side = $('#forum-sidebar-col');
    if (!$main.length) return;
    if (showBoardChrome) {
      $main.removeClass('col-sm-12').addClass('col-sm-8');
      if ($side.length) $side.show();
    } else {
      $main.removeClass('col-sm-8').addClass('col-sm-12');
      if ($side.length) $side.hide();
    }
  }

  function showList(state, searchQuery) {
    $('#topic-detail').hide();
    setForumMainLayout(true);
    $('.tab-content').show();
    $('.board-tabs').show();
    refreshAllTopicLists(state, searchQuery);
    renderSubscriptions(state);
  }

  function formatTaggedUsersHtml(ids, marginClass) {
    if (!ids || !ids.length) return '';
    marginClass = marginClass || 'margin-top:12px';
    var tags = ids.map(function (id) {
      var u = userById(id);
      return '<span class="label label-info" style="margin-right:4px">@' + u.handle + '</span>';
    }).join(' ');
    return '<p class="small" style="' + marginClass + '"><strong>Tagged:</strong> ' + tags + '</p>';
  }

  function showTopic(state, topicId) {
    var topic = null;
    for (var i = 0; i < state.topics.length; i++) {
      if (state.topics[i].id === topicId) {
        topic = state.topics[i];
        break;
      }
    }
    if (!topic) return;

    $('.tab-content').hide();
    $('.board-tabs').hide();
    setForumMainLayout(false);
    $('#topic-detail').show();

    var author = userById(topic.authorId);
    var boardLabel = topic.board === 'swap' ? 'Swap shop' : 'Service board';
    var pillClass = topic.board === 'swap' ? 'topic-pill-swap' : 'topic-pill-service';
    ensureTopicCategory(topic);
    var catLbl = getCategoryLabel(topic.board, topic.categoryId);
    $('#detail-board-badge').html(
      '<span class="label ' + pillClass + '">' + boardLabel + '</span>' +
        (catLbl
          ? ' <span class="label label-default topic-detail-category">' +
            $('<span/>').text(catLbl).html() +
            '</span>'
          : '')
    );
    $('#detail-title').text(topic.title);
    $('#detail-meta').html(
      '<span class="glyphicon glyphicon-user"></span> ' + author.name +
      ' · <span class="glyphicon glyphicon-calendar"></span> ' + formatDate(topic.createdAt)
    );
    $('#detail-body').text(topic.body);
    $('#detail-tagged').html(formatTaggedUsersHtml(topic.taggedUserIds) || '');

    var $att = $('#detail-attachments').empty();
    appendAttachmentThumbnails($att, topic.attachments);

    ensureTopicShape(topic);
    var replies = topic.replies;
    var $rlist = $('#detail-replies-list').empty();
    if (!replies.length) {
      $rlist.append(
        '<li class="text-muted small reply-empty">No replies yet. Be the first to respond.</li>'
      );
    } else {
      replies
        .slice()
        .sort(function (a, b) {
          return a.createdAt - b.createdAt;
        })
        .forEach(function (r) {
          var ra = userById(r.authorId);
          var $inner = $('<div class="media-body"/>').append(
            $('<h5 class="media-heading reply-author"/>').html(
              '<span class="glyphicon glyphicon-user"></span> ' +
                ra.name +
                ' <span class="text-muted small">' +
                formatDate(r.createdAt) +
                '</span>'
            )
          );
          $inner.append($('<div class="post-body reply-body-text"/>').text(r.body));
          var taggedHtml = formatTaggedUsersHtml(r.taggedUserIds, 'margin-top:8px');
          if (taggedHtml) $inner.append(taggedHtml);
          var $rAtt = $('<div class="reply-attachments"/>');
          appendAttachmentThumbnails($rAtt, r.attachments);
          if ($rAtt.children().length) $inner.append($rAtt);
          $rlist.append($('<li class="media reply-item"/>').append($inner));
        });
    }
    $('#reply-body').val('');
    pendingReplyAttachments.length = 0;
    $('#reply-media-preview').empty();
    $('#reply-media').val('');
    $('#mention-dropdown-reply').hide().empty();

    var subbed = topic.subscriberIds.indexOf(state.currentUserId) !== -1;
    $('#btn-subscribe-detail').toggleClass('active', subbed);
    $('#subscribe-label').text(subbed ? 'Subscribed' : 'Subscribe');
    $('#btn-subscribe-detail').data('topic-id', topic.id);

    $('#btn-back-list').off('click').on('click', function () {
      showList(state, $('#forum-search').val());
    });

    $('#btn-subscribe-detail').off('click').on('click', function () {
      var tid = $(this).data('topic-id');
      for (var j = 0; j < state.topics.length; j++) {
        if (state.topics[j].id === tid) {
          var idx = state.topics[j].subscriberIds.indexOf(state.currentUserId);
          if (idx === -1) state.topics[j].subscriberIds.push(state.currentUserId);
          else state.topics[j].subscriberIds.splice(idx, 1);
          break;
        }
      }
      saveState(state);
      showTopic(state, tid);
      renderSubscriptions(state);
    });
  }

  function parseTaggedHandles(body) {
    var re = /@([a-zA-Z0-9_]+)/g;
    var m;
    var handles = [];
    while ((m = re.exec(body)) !== null) {
      if (handles.indexOf(m[1].toLowerCase()) === -1) handles.push(m[1].toLowerCase());
    }
    var ids = [];
    handles.forEach(function (h) {
      for (var i = 0; i < MOCK_USERS.length; i++) {
        if (MOCK_USERS[i].handle.toLowerCase() === h) {
          ids.push(MOCK_USERS[i].id);
          break;
        }
      }
    });
    return ids;
  }

  function newId() {
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function newReplyId() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function attachMentionComposer($ta, $dd) {
    var mentionState = { start: null, filter: '', activeIndex: 0 };

    function mentionFiltered() {
      var f = mentionState.filter.toLowerCase();
      return MOCK_USERS.filter(function (u) {
        return (
          !f ||
          u.handle.toLowerCase().indexOf(f) === 0 ||
          u.name.toLowerCase().indexOf(f) !== -1
        );
      });
    }

    function positionMentionDropdown() {
      var pos = $ta.position();
      $dd.css({
        top: pos.top + $ta.outerHeight(),
        left: pos.left,
        width: $ta.outerWidth()
      });
    }

    function renderMentionDropdown() {
      var list = mentionFiltered();
      $dd.empty();
      if (!list.length) {
        $dd.hide();
        return;
      }
      list.forEach(function (u, i) {
        $('<div class="mention-item" role="option"/>')
          .attr('data-index', i)
          .text('@' + u.handle + ' — ' + u.name)
          .appendTo($dd);
      });
      $dd.show();
      $dd.find('.mention-item').removeClass('active').first().addClass('active');
      mentionState.activeIndex = 0;
    }

    function insertMention(handle) {
      var val = $ta.val();
      var start = mentionState.start;
      if (start == null) return;
      var before = val.slice(0, start);
      var after = val.slice($ta[0].selectionStart);
      var insert = '@' + handle + ' ';
      $ta.val(before + insert + after);
      var caret = before.length + insert.length;
      $ta[0].setSelectionRange(caret, caret);
      $dd.hide().empty();
      mentionState.start = null;
    }

    $ta.on('keyup click', function () {
      var val = $ta.val();
      var pos = this.selectionStart;
      var slice = val.slice(0, pos);
      var at = slice.lastIndexOf('@');
      if (at === -1 || (at > 0 && !/\s/.test(slice.charAt(at - 1)))) {
        $dd.hide().empty();
        mentionState.start = null;
        return;
      }
      var afterAt = slice.slice(at + 1);
      if (/\s/.test(afterAt)) {
        $dd.hide().empty();
        mentionState.start = null;
        return;
      }
      mentionState.start = at;
      mentionState.filter = afterAt;
      positionMentionDropdown();
      renderMentionDropdown();
    });

    $dd.on('click', '.mention-item', function () {
      var idx = parseInt($(this).attr('data-index'), 10);
      var list = mentionFiltered();
      var h = list[idx];
      if (h) insertMention(h.handle);
    });

    $ta.on('keydown', function (e) {
      if (!$dd.is(':visible')) return;
      var list = mentionFiltered();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        mentionState.activeIndex = Math.min(mentionState.activeIndex + 1, list.length - 1);
        $dd.find('.mention-item').removeClass('active').eq(mentionState.activeIndex).addClass('active');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        mentionState.activeIndex = Math.max(mentionState.activeIndex - 1, 0);
        $dd.find('.mention-item').removeClass('active').eq(mentionState.activeIndex).addClass('active');
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        var $active = $dd.find('.mention-item.active');
        if ($active.length && list.length) {
          e.preventDefault();
          var idx = parseInt($active.attr('data-index'), 10);
          var h = list[idx];
          if (h) insertMention(h.handle);
        }
      } else if (e.key === 'Escape') {
        $dd.hide().empty();
        mentionState.start = null;
      }
    });
  }

  $(function () {
    $(document).on('dragover dragenter', function (e) {
      e.preventDefault();
      e.stopPropagation();
    });
    $(document).on('drop', function (e) {
      if (!$(e.target).closest('.media-dropzone').length) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    var state = loadState();
    var searchQuery = '';

    function fullRefresh() {
      refreshAllTopicLists(state, searchQuery);
      renderSubscriptions(state);
    }

    fullRefresh();

    $('a[data-toggle="tab"]').on('shown.bs.tab', function () {
      fullRefresh();
    });

    function applySearchFromInput() {
      categoryFilterByBoard.swap = null;
      categoryFilterByBoard.service = null;
      searchQuery = $('#forum-search').val();
      if ($('#topic-detail').is(':visible')) {
        showList(state, searchQuery);
      } else {
        fullRefresh();
      }
    }

    $('#forum-search').on('input', applySearchFromInput);

    $('#btn-clear-search').on('click', function () {
      categoryFilterByBoard.swap = null;
      categoryFilterByBoard.service = null;
      $('#forum-search').val('');
      searchQuery = '';
      if ($('#topic-detail').is(':visible')) {
        showList(state, '');
      } else {
        fullRefresh();
      }
    });

    $(document).on('click', '.topic-row[data-topic-id]', function () {
      var id = $(this).data('topic-id');
      showTopic(state, id);
    });

    $('[id^=btn-new-topic-]').on('click', function () {
      var board = $(this).data('board');
      $('#form-board').val(board);
      populateFormCategories(board);
      $('#form-title').val('');
      $('#form-body').val('');
      pendingTopicAttachments.length = 0;
      $('#media-preview').empty();
      $('#form-media').val('');
      $('#modal-new-topic').modal('show');
    });

    $('#form-media').on('change', function () {
      var files = this.files;
      if (!files || !files.length) return;
      addFilesToAttachmentArray(files, pendingTopicAttachments, $('#media-preview'));
      $(this).val('');
    });
    bindMediaDropZone($('#form-media-dropzone'), function (files) {
      addFilesToAttachmentArray(files, pendingTopicAttachments, $('#media-preview'));
    });

    $('#reply-media').on('change', function () {
      var files = this.files;
      if (!files || !files.length) return;
      addFilesToAttachmentArray(files, pendingReplyAttachments, $('#reply-media-preview'));
      $(this).val('');
    });
    bindMediaDropZone($('#reply-media-dropzone'), function (files) {
      addFilesToAttachmentArray(files, pendingReplyAttachments, $('#reply-media-preview'));
    });

    $(document).on('click keydown', '.js-lightbox-img', function (e) {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      var src = this.getAttribute('src');
      if (!src || src === LIGHTBOX_PLACEHOLDER_SRC) return;
      $('#lightbox-image')
        .attr('src', src)
        .attr('alt', this.getAttribute('alt') || '');
      $('#modal-image-lightbox').modal('show');
    });
    $('#modal-image-lightbox').on('hidden.bs.modal', function () {
      $('#lightbox-image').attr({ src: LIGHTBOX_PLACEHOLDER_SRC, alt: '' });
    });

    $('#btn-submit-topic').on('click', function () {
      var board = $('#form-board').val();
      var title = $('#form-title').val().trim();
      var body = $('#form-body').val().trim();
      if (!title || (!body && !pendingTopicAttachments.length)) return;

      var topic = {
        id: newId(),
        board: board,
        categoryId: $('#form-category').val(),
        title: title,
        body: body,
        authorId: state.currentUserId,
        createdAt: Date.now(),
        taggedUserIds: parseTaggedHandles(body),
        attachments: pendingTopicAttachments.map(function (a) {
          return { type: a.type, name: a.name, dataUrl: a.dataUrl };
        }),
        subscriberIds: [],
        replies: []
      };
      state.topics.push(topic);
      saveState(state);
      $('#modal-new-topic').modal('hide');
      pendingTopicAttachments.length = 0;
      $('#form-media').val('');
      $('#media-preview').empty();

      if (activeBoard() !== board) {
        $('a[data-board="' + board + '"]').tab('show');
      }
      fullRefresh();
      showTopic(state, topic.id);
    });

    attachMentionComposer($('#form-body'), $('#mention-dropdown'));
    attachMentionComposer($('#reply-body'), $('#mention-dropdown-reply'));

    $('#btn-post-reply').on('click', function () {
      var tid = $('#btn-subscribe-detail').data('topic-id');
      if (!tid) return;
      var body = $('#reply-body').val().trim();
      if (!body && !pendingReplyAttachments.length) return;
      for (var ri = 0; ri < state.topics.length; ri++) {
        if (state.topics[ri].id === tid) {
          ensureTopicShape(state.topics[ri]);
          state.topics[ri].replies.push({
            id: newReplyId(),
            authorId: state.currentUserId,
            body: body,
            createdAt: Date.now(),
            taggedUserIds: parseTaggedHandles(body),
            attachments: pendingReplyAttachments.map(function (a) {
              return { type: a.type, name: a.name, dataUrl: a.dataUrl };
            })
          });
          break;
        }
      }
      saveState(state);
      $('#reply-body').val('');
      pendingReplyAttachments.length = 0;
      $('#reply-media-preview').empty();
      $('#reply-media').val('');
      showTopic(state, tid);
      fullRefresh();
    });

    $(document).on('click', function (e) {
      if (!$(e.target).closest('.mention-composer').length) {
        $('.mention-dropdown').hide().empty();
      }
    });
  });
})(jQuery);

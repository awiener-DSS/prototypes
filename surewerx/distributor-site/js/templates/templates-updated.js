// HTML Template Functions

var Templates = {
  // Header template
  header: function() {
    var user = AppState.currentUser;
    var isDistributor = user && user.role === 'Distributor';
    var distributorName = AppState.distributorName || 'Premier Distributor Co';
    var distributorLogo = AppState.distributorLogo;
    
    // Logo display logic
    var logoHtml = '';
    if (distributorLogo) {
      logoHtml = '<img src="' + distributorLogo + '" alt="' + Helpers.escapeHtml(distributorName) + '" style="max-height: 50px; max-width: 150px; object-fit: contain;">';
    } else {
      // Default VP badge if no logo
      logoHtml = '<div class="header-logo-badge">VP</div>';
    }
    
    return '<div class="app-header">' +
      '<div class="container">' +
      '<div class="header-brand" id="header-logo" style="cursor: ' + (isDistributor ? 'pointer' : 'default') + ';">' +
      // Logo or badge
      logoHtml +
      // Brand text
      '<div class="header-brand-text">' +
      '<h1 class="header-title">Voucher Portal</h1>' +
      '<p class="header-subtitle">' + Helpers.escapeHtml(distributorName) + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="header-account dropdown">' +
      '<a href="#" class="dropdown-toggle" data-toggle="dropdown">' +
      '<span class="glyphicon glyphicon-user"></span>' +
      ' <span class="caret"></span>' +
      '</a>' +
      '<ul class="dropdown-menu dropdown-menu-right">' +
      '<li class="dropdown-header">My Account</li>' +
      '<li class="divider"></li>' +
      (isDistributor ? '<li><a href="products.html"><span class="glyphicon glyphicon-tag"></span> Products</a></li>' : '') +
      (isDistributor ? '<li><a href="reporting.html"><span class="glyphicon glyphicon-stats"></span> Reporting</a></li>' : '') +
      (isDistributor ? '<li><a href="settings.html"><span class="glyphicon glyphicon-wrench"></span> Distributor Settings</a></li>' : '') +
      (isDistributor ? '<li class="divider"></li>' : '') +
      '<li><a href="user-management.html"><span class="glyphicon glyphicon-user"></span> User Management</a></li>' +
      '<li class="divider"></li>' +
      '<li id="logout-btn"><a href="#"><span class="glyphicon glyphicon-log-out"></span> Logout</a></li>' +
      '</ul>' +
      '</div>' +
      '</div>' +
      '</div>';
  },

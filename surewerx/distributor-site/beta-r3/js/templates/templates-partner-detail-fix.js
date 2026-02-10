// Replacement for partnerDetailPage function in templates.js

  // Partner detail page
  partnerDetailPage: function(customerId) {
    var partner = AppState.customers.find(function(p) { return p.id === customerId; });
    if (!partner) {
      return '<div class=\"container\"><div class=\"alert alert-danger\">Partner not found</div></div>';
    }
    
    // Check if current user is a distributor or partner
    var isDistributor = AppState.currentUser && AppState.currentUser.role === 'Distributor';
    
    // Format partner status info
    var statusBadge = '<span class=\"label label-' + (partner.status === 'active' ? 'success' : 'default') + '">' + 
      (partner.status || 'Active').charAt(0).toUpperCase() + (partner.status || 'active').slice(1) + 
      '</span>';
    
    // Generate full partner URL with distributor slug
    var distributorName = AppState.distributorName || 'Premier Distributor Co';
    var distributorSlug = distributorName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    var fullPartnerUrl = 'www.surewerxdistributor.com/' + distributorSlug + '/' + Helpers.escapeHtml(partner.slug);
    
    return '<div>' +
      Templates.header() +
      '<div class="container">' +
      '<div class="row mb-4">' +
      '<div class="col-md-' + (isDistributor ? '8' : '12') + '">' +
      (isDistributor ? 
        '<button class="btn btn-default mb-3" id="back-to-dashboard">' +
        '<span class="glyphicon glyphicon-chevron-left"></span> Back to Dashboard' +
        '</button>' : '') +
      '<h2>' + Helpers.escapeHtml(partner.name) + ' ' + statusBadge + '</h2>' +
      '<p class="text-muted">Partner URL: <a href="http://' + fullPartnerUrl + '" target="_blank" style="background-color: #d4edda; padding: 4px 8px; border-radius: 3px; text-decoration: none; color: #155724;">' + fullPartnerUrl + '</a></p>' +
      '</div>' +
      (isDistributor ? 
        '<div class="col-md-4 text-right">' +
        '<button class="btn btn-primary" id="edit-partner-btn" style="margin-top: 30px;">' +
        '<span class="glyphicon glyphicon-edit"></span> Edit Partner' +
        '</button>' +
        '</div>' : '') +
      '</div>' +
      
      '<div class="customer-detail-tabs">' +
      '<ul class="nav nav-tabs" role="tablist">' +
      '<li role="presentation" class="active">' +
      '<a href="#employees-tab" data-tab="employees" role="tab">Employees</a>' +
      '</li>' +
      '<li role="presentation">' +
      '<a href="#groups-tab" data-tab="groups" role="tab">User Groups</a>' +
      '</li>' +
      '<li role="presentation">' +
      '<a href="#vouchers-tab" data-tab="vouchers" role="tab">Vouchers</a>' +
      '</li>' +
      '<li role="presentation">' +
      '<a href="#pricing-tab" data-tab="pricing" role="tab">Pricing</a>' +
      '</li>' +
      '</ul>' +
      '</div>' +
      
      '<div class="tab-content" id="partner-tab-content">' +
      Templates.partnerEmployeesTab(partner) +
      '</div>' +
      '</div>' +
      '</div>';
  },

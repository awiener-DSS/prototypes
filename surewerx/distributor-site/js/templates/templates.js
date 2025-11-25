// HTML Template Functions

var Templates = {
  // Header template
  header: function() {
    var user = AppState.currentUser;
    var isDistributor = user && (user.role === 'Distributor' || (user.role === 'SureWerx' && AppState.selectedDistributorId));
    var isSureWerx = user && user.role === 'SureWerx';
    var distributorName = AppState.distributorName || 'Premier Distributor Co';
    var distributorLogo = AppState.distributorLogo;
    
    // SureWerx logo
    var surewerxLogo = '<img src="images/SureWerx-Logo.png" alt="SureWerx" style="max-height: 50px; max-width: 200px; object-fit: contain; margin-right: 20px;">';
    
    // Logo display logic - show logo if it exists and is not empty
    var logoHtml = '';
    if (distributorLogo && (typeof distributorLogo === 'string' ? distributorLogo.trim() !== '' : true)) {
      logoHtml = '<img src="' + distributorLogo + '" alt="' + Helpers.escapeHtml(distributorName) + '" style="max-height: 50px; max-width: 150px; object-fit: contain;">';
    }
    // If no logo, don't show anything (logoHtml remains empty)
    
    return '<div class="app-header">' +
      '<div class="container">' +
      '<div class="header-brand" id="header-logo" style="cursor: ' + (isDistributor ? 'pointer' : 'default') + ';">' +
      // SureWerx logo
      surewerxLogo +
      // Logo or badge
      logoHtml +
      // Brand text
      '<div class="header-brand-text">' +
      '<h1 class="header-title">Voucher Portal</h1>' +
      '<p class="header-subtitle">' + Helpers.escapeHtml(distributorName) + '</p>' +
      '</div>' +
      '</div>' +
      (isSureWerx ? (function() {
        var distributors = AppState.distributors || [];
        var selectedDistributor = distributors.find(function(d) { return d.id === AppState.selectedDistributorId; });
        var selectedName = selectedDistributor ? selectedDistributor.name : '';
        return '<div class="header-distributor-select" style="margin-right: 20px;">' +
          '<div class="distributor-typeahead-container">' +
          '<div style="position: relative;">' +
          '<input type="text" class="form-control" id="header-distributor-select" placeholder="Select or search distributor..." value="' + Helpers.escapeHtml(selectedName) + '" autocomplete="off" style="min-width: 200px; padding-right: 30px;">' +
          '<span class="distributor-dropdown-arrow" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #6b7280; font-size: 10px;">▼</span>' +
          '</div>' +
          '<div id="distributor-typeahead-results" class="distributor-typeahead-results"></div>' +
          '</div>' +
          '</div>';
      })() : '') +
      '<div class="header-account dropdown">' +
      '<a href="#" class="dropdown-toggle" data-toggle="dropdown">' +
      '<span class="glyphicon glyphicon-user"></span>' +
      ' <span class="caret"></span>' +
      '</a>' +
      '<ul class="dropdown-menu dropdown-menu-right">' +
      '<li class="dropdown-header">My Account</li>' +
      '<li class="divider"></li>' +
      (isDistributor ? '<li><a href="products.html"><span class="glyphicon glyphicon-tag"></span> Product Management</a></li>' : '') +
      (isDistributor ? '<li><a href="reporting.html"><span class="glyphicon glyphicon-stats"></span> Reporting</a></li>' : '') +
      (!isDistributor && user && user.customerId ? '<li><a href="customer-reporting.html"><span class="glyphicon glyphicon-stats"></span> Reporting</a></li>' : '') +
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
  
  // Login page template
  loginPage: function() {
    return '<div class="login-container">' +
      '<div class="login-card">' +
      '<div class="login-header">' +
      '<img src="images/SureWerx-Logo.png" alt="SureWerx Logo" class="login-logo" id="login-logo-toggle" style="cursor: pointer;" onerror="this.style.display=\'none\'" />' +
      '<h2>Distributor Portal</h2>' +
      '<p class="text-muted">Sign in to manage your customer voucher programs</p>' +
      '</div>' +
      '<form id="login-form">' +
      '<div class="form-group">' +
      '<label for="login-email">Email</label>' +
      '<input type="email" class="form-control" id="login-email" placeholder="distributor@company.com" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<div class="flex justify-between align-center">' +
      '<label for="login-password">Password</label>' +
      '<a href="#" id="forgot-password-link" class="forgot-password-link">Forgot password?</a>' +
      '</div>' +
      '<input type="password" class="form-control" id="login-password" placeholder="Enter password" required>' +
      '</div>' +
      '<button type="submit" class="btn btn-primary btn-block">Sign In</button>' +
      '<div style="margin: 20px 0; text-align: center; position: relative;">' +
      '<div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background-color: #e5e7eb;"></div>' +
      '<span style="background-color: white; padding: 0 12px; color: #6b7280; font-size: 12px;">OR</span>' +
      '</div>' +
      '<button type="button" class="btn btn-default btn-block" id="microsoft-signin-btn" style="display: flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid #d1d5db; background-color: white; color: #374151; font-weight: 500;">' +
      '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0" y="0" width="10" height="10" fill="#F25022"/>' +
      '<rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>' +
      '<rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>' +
      '<rect x="11" y="11" width="10" height="10" fill="#FFB900"/>' +
      '</svg>' +
      'SIGN IN WITH MICROSOFT' +
      '</button>' +
      '<div class="demo-credentials-section" id="demo-credentials-section" style="display: none;">' +
      '<div class="demo-credentials demo-credentials-distributor">' +
      '<p class="demo-credentials-title"><strong>Distributor Admin Login:</strong></p>' +
      '<p class="demo-credentials-text">Email: admin@distributor.com</p>' +
      '<p class="demo-credentials-text">Password: admin123</p>' +
      '</div>' +
      '<div class="demo-credentials demo-credentials-customer">' +
      '<p class="demo-credentials-title"><strong>Customer Login (Customer-specific access):</strong></p>' +
      '<div class="demo-credentials-text">' +
      '<p>Email: customer@boeing.com</p>' +
      '<p>Password: customer123</p>' +
      '</div>' +
      '</div>' +
      '<div class="demo-credentials demo-credentials-surewerx">' +
      '<p class="demo-credentials-title"><strong>SureWerx Employee Login:</strong></p>' +
      '<div class="demo-credentials-text">' +
      '<p>Email: surewerx@example.com</p>' +
      '<p>Password: surewerx123</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>';
  },
  
  // Forgot password modal
  forgotPasswordModal: function() {
    return '<div class="modal fade" id="forgot-password-modal" tabindex="-1" role="dialog">' +
      '<div class="modal-dialog" role="document">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span>' +
      '</button>' +
      '<h4 class="modal-title">Reset Password</h4>' +
      '</div>' +
      '<form id="forgot-password-form">' +
      '<div class="modal-body">' +
      '<p class="text-muted">Enter your email address and we\'ll send you a link to reset your password.</p>' +
      '<div class="form-group">' +
      '<label for="reset-email">Email Address</label>' +
      '<input type="email" class="form-control" id="reset-email" required>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Send Reset Link</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
  },
  
  // Distributor selection modal (for SureWerx employees)
  distributorSelectionModal: function() {
    var distributors = AppState.distributors || [];
    var selectedDistributor = distributors.find(function(d) { return d.id === AppState.selectedDistributorId; });
    var selectedName = selectedDistributor ? selectedDistributor.name : '';
    
    return '<div class="modal fade" id="distributor-selection-modal" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false">' +
      '<div class="modal-dialog" role="document">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<h4 class="modal-title">Select Distributor</h4>' +
      '</div>' +
      '<form id="distributor-selection-form">' +
      '<div class="modal-body">' +
      '<p class="text-muted">Please select a distributor to view as:</p>' +
      '<div class="form-group">' +
      '<label for="selected-distributor">Distributor</label>' +
      '<div class="distributor-typeahead-container" style="position: relative;">' +
      '<div style="position: relative;">' +
      '<input type="text" class="form-control" id="selected-distributor" placeholder="Select or search distributor..." value="' + Helpers.escapeHtml(selectedName) + '" autocomplete="off" required>' +
      '<span class="distributor-dropdown-arrow" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #6b7280; font-size: 10px;">▼</span>' +
      '</div>' +
      '<div id="modal-distributor-typeahead-results" class="distributor-typeahead-results"></div>' +
      '</div>' +
      '<input type="hidden" id="selected-distributor-id" value="' + (AppState.selectedDistributorId || '') + '">' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="submit" class="btn btn-primary">Continue</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
  },
  
  // Dashboard template
  dashboardPage: function(statusFilter) {
    statusFilter = statusFilter || 'Active';
    
    return '<div>' +
      Templates.header() +
      '<div class="container">' +
      '<div class="row mb-4">' +
      '<div class="col-md-8">' +
      '<h2>Customer Overview</h2>' +
      '<p class="text-muted">Manage your customer organizations and their programs</p>' +
      '</div>' +
      '<div class="col-md-4 text-right">' +
      '<button class="btn btn-primary" id="create-customer-btn">' +
      '<span class="glyphicon glyphicon-plus"></span> Create Customer' +
      '</button>' +
      '</div>' +
      '</div>' +
      
      '<div class="row mb-4">' +
      '<div class="col-md-3">' +
      '<div class="form-group">' +
      '<label for="customer-status-filter">Status</label>' +
      '<select class="form-control" id="customer-status-filter">' +
      '<option value="Active"' + (statusFilter === 'Active' ? ' selected' : '') + '>Active</option>' +
      '<option value="Inactive"' + (statusFilter === 'Inactive' ? ' selected' : '') + '>Inactive</option>' +
      '<option value="All"' + (statusFilter === 'All' ? ' selected' : '') + '>All</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      
      '<div class="row" id="customer-grid">' +
      '</div>' +
      '</div>' +
      '</div>';
  },
  
  // Helper function to calculate unique employees who have used vouchers for a customer
  getUniqueEmployeesWithVouchers: function(customer) {
    // Get all active vouchers for this customer
    var activeVouchers = customer.vouchers ? customer.vouchers.filter(function(v) { return v.isActive; }) : [];
    
    // Get total unique employees from customer's employees array first
    var totalUniqueEmployees = new Set();
    var employeeKeysMap = new Map(); // Map of employee keys (email/name) to employee objects
    if (customer.employees && customer.employees.length > 0) {
      customer.employees.forEach(function(emp) {
        var employeeKey = (emp.email || emp.name || '').toLowerCase();
        if (employeeKey) {
          totalUniqueEmployees.add(employeeKey);
          employeeKeysMap.set(employeeKey, emp);
        }
      });
    }
    
    var totalUniqueCount = totalUniqueEmployees.size || customer.employeeCount || 0;
    
    // If no active vouchers or no employees, return 0
    if (activeVouchers.length === 0 || totalUniqueCount === 0) {
      return { uniqueWithVouchers: 0, totalUniqueEmployees: totalUniqueCount };
    }
    
    // Get active voucher names for matching
    var activeVoucherNames = activeVouchers.map(function(v) { return v.name; });
    
    // Get all transactions for this customer where:
    // 1. The transaction is against an active voucher (voucherUsed matches an active voucher name)
    // 2. Payment method is 'Voucher' or 'Mixed'
    var customerTransactions = AppState.transactions.filter(function(t) {
      return t.customerName === customer.name && 
             (t.paymentMethod === 'Voucher' || t.paymentMethod === 'Mixed') &&
             activeVoucherNames.indexOf(t.voucherUsed) > -1;
    });
    
    // Get unique employees from transactions that are ALSO in the customer's employees array
    // Only count employees that actually exist in the employees array
    var uniqueEmployeesWithVouchers = new Set();
    customerTransactions.forEach(function(t) {
      var employeeKey = (t.employeeEmail || t.employeeName || '').toLowerCase();
      // Only count if this employee exists in the customer's employees array
      if (employeeKey && employeeKeysMap.has(employeeKey)) {
        uniqueEmployeesWithVouchers.add(employeeKey);
      }
    });
    
    return {
      uniqueWithVouchers: uniqueEmployeesWithVouchers.size,
      totalUniqueEmployees: totalUniqueCount
    };
  },
  
  // Customer cards
  customerCards: function(customers) {
    var self = this;
    return customers.map(function(customer) {
      // Calculate unique employees who have used vouchers
      var voucherStats = self.getUniqueEmployeesWithVouchers(customer);
      var uniqueEmployeesWithVouchers = voucherStats.uniqueWithVouchers;
      var totalUniqueEmployees = voucherStats.totalUniqueEmployees;
      
      return '<div class="col-md-4">' +
        '<div class="customer-card" data-customer-id="' + customer.id + '">' +
        '<div class="customer-header">' +
        (customer.logoUrl ? '<img src="' + customer.logoUrl + '" alt="' + Helpers.escapeHtml(customer.name) + '">' : '') +
        '<h3>' + Helpers.escapeHtml(customer.name) + '</h3>' +
        '</div>' +
        '<div class="customer-metrics">' +
        '<div class="customer-metric" style="width: 100%; margin-bottom: 4px;">' +
        '<div class="metric-label">Active Vouchers</div>' +
        '<div class="metric-value">' + customer.activeVouchers + '</div>' +
        '</div>' +
        '<div class="customer-metric customer-metric-thermometer" style="width: 100%;">' +
        '<div class="metric-label">Employees Using Vouchers (Active Only)</div>' +
        '<div class="thermometer-container">' +
        '<div class="thermometer-wrapper">' +
        '<div class="thermometer-fill" style="width: ' + (totalUniqueEmployees > 0 ? Math.round((uniqueEmployeesWithVouchers / totalUniqueEmployees) * 100) : 0) + '%;"></div>' +
        '</div>' +
        '<div class="thermometer-value">' + uniqueEmployeesWithVouchers + ' / ' + totalUniqueEmployees + '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="customer-card-footer" style="display: flex; align-items: center; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; flex-shrink: 0;">' +
        '<span class="label label-' + (customer.status === 'active' ? 'success' : 'default') + '" style="flex-shrink: 0;">' + 
        (customer.status === 'active' ? 'Active' : 'Inactive') + '</span>' +
        '<div style="margin-left: auto; display: flex; gap: 8px;">' +
        '<button class="btn btn-default btn-sm edit-customer-card-btn" data-customer-id="' + customer.id + '" style="padding: 6px 10px;" title="Edit Customer">' +
        '<span class="glyphicon glyphicon-pencil"></span>' +
        '</button>' +
        '<button class="btn btn-primary btn-sm manage-customer-btn" data-customer-id="' + customer.id + '">Manage</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';
    }).join('');
  },
  
  // Customer detail page
  customerDetailPage: function(customerId) {
    var customer = AppState.customers.find(function(p) { return p.id === customerId; });
    if (!customer) {
      return '<div class=\"container\"><div class=\"alert alert-danger\">Customer not found</div></div>';
    }
    
    // Check if current user is a distributor or customer
    var isDistributor = AppState.currentUser && (AppState.currentUser.role === 'Distributor' || (AppState.currentUser.role === 'SureWerx' && AppState.selectedDistributorId));
    
    // Format customer status info (only for distributors)
    var statusBadge = isDistributor ? '<span class=\"label label-' + (customer.status === 'active' ? 'success' : 'default') + '\">' + 
      (customer.status || 'Active').charAt(0).toUpperCase() + (customer.status || 'active').slice(1) + 
      '</span>' : '';
    
    // Generate full customer URL with distributor slug
    var distributorName = AppState.distributorName || 'Premier Distributor Co';
    var distributorSlug = distributorName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    var fullCustomerUrl = 'www.surewerxdistributor.com/' + distributorSlug + '/' + Helpers.escapeHtml(customer.slug);
    
    // Customer logo display
    var customerLogoHtml = '';
    if (customer.logoUrl) {
      customerLogoHtml = '<div style=\"margin-bottom: 15px;\"><img src=\"' + customer.logoUrl + '\" alt=\"' + Helpers.escapeHtml(customer.name) + '\" style=\"max-height: 80px; max-width: 200px; object-fit: contain;\"></div>';
    }
    
    return '<div>' +
      Templates.header() +
      '<div class="container">' +
      '<div class="row mb-4">' +
      '<div class="col-md-' + (isDistributor ? '8' : '12') + '">' +
      (isDistributor ? 
        '<button class="btn btn-default mb-3" id="back-to-dashboard">' +
        '<span class="glyphicon glyphicon-chevron-left"></span> Back to Dashboard' +
        '</button>' : '') +
      '<div style=\"display: flex; align-items: center; gap: 20px;\">' +
      (customer.logoUrl ? '<div style=\"flex-shrink: 0;\"><img src=\"' + customer.logoUrl + '\" alt=\"' + Helpers.escapeHtml(customer.name) + '\" style=\"max-height: 80px; max-width: 200px; object-fit: contain;\"></div>' : '') +
      '<div style=\"flex: 1;\">' +
      '<h2 style=\"margin-top: 0;\">' + Helpers.escapeHtml(customer.name) + ' ' + statusBadge + '</h2>' +
      '<p class="text-muted">Customer URL: <a href="http://' + fullCustomerUrl + '" target="_blank" style="background-color: #d4edda; padding: 4px 8px; border-radius: 3px; text-decoration: none; color: #155724;">' + fullCustomerUrl + '</a></p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      (isDistributor ? 
        '<div class="col-md-4 text-right">' +
        '<button class="btn btn-primary" id="edit-customer-btn" style="margin-top: 30px;">' +
        '<span class="glyphicon glyphicon-edit"></span> Edit Customer' +
        '</button>' +
        '</div>' : '') +
      '</div>' +
      
      '<div class="customer-detail-tabs">' +
      '<ul class="nav nav-tabs" role="tablist">' +
      '<li role="presentation">' +
      '<a href="#groups-tab" data-tab="groups" role="tab">User Groups</a>' +
      '</li>' +
      '<li role="presentation" class="active">' +
      '<a href="#employees-tab" data-tab="employees" role="tab">Employees</a>' +
      '</li>' +
      '<li role="presentation">' +
      '<a href="#vouchers-tab" data-tab="vouchers" role="tab">Vouchers</a>' +
      '</li>' +
      '</ul>' +
      '</div>' +
      
      '<div class=\"tab-content\" id=\"customer-tab-content\">' +
      '</div>' +
      '</div>' +
      '</div>';
  },
  
  // Customer employees tab
  customerEmployeesTab: function(customer) {
    return '<div class="row">' +
      '<div class="col-md-12">' +
      '<div class="well">' +
      '<h4>Employees & Groups</h4>' +
      '<p class="text-muted">Manage employees and user groups for this customer</p>' +
      '<button class="btn btn-primary">' +
      '<span class="glyphicon glyphicon-plus"></span> Add Employee' +
      '</button>' +
      '<button class="btn btn-default">' +
      '<span class="glyphicon glyphicon-plus"></span> Create Group' +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  },
  
  // Show Edit Customer Modal
  showEditCustomerModal: function(customer, customerId) {
    // Generate full customer URL with distributor slug
    var distributorName = AppState.distributorName || 'Premier Distributor Co';
    var distributorSlug = distributorName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    var fullCustomerUrl = 'www.surewerxdistributor.com/' + distributorSlug + '/' + Helpers.escapeHtml(customer.slug);
    
    var modalHtml = '<div class="modal fade" id="edit-customer-modal" tabindex="-1">' +
      '<div class="modal-dialog modal-lg">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Edit Customer</h4>' +
      '</div>' +
      '<form id="edit-customer-form">' +
      '<div class="modal-body">' +
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Customer Name *</label>' +
      '<input type="text" class="form-control" id="edit-customer-name" value="' + Helpers.escapeHtml(customer.name) + '" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Industry *</label>' +
      '<select class="form-control" id="edit-customer-industry" required>' +
      '<option value="Technology" ' + (customer.industry === 'Technology' ? 'selected' : '') + '>Technology</option>' +
      '<option value="Manufacturing" ' + (customer.industry === 'Manufacturing' ? 'selected' : '') + '>Manufacturing</option>' +
      '<option value="Construction" ' + (customer.industry === 'Construction' ? 'selected' : '') + '>Construction</option>' +
      '<option value="Healthcare" ' + (customer.industry === 'Healthcare' ? 'selected' : '') + '>Healthcare</option>' +
      '<option value="Other" ' + (customer.industry === 'Other' ? 'selected' : '') + '>Other</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Contact Email *</label>' +
      '<input type="email" class="form-control" id="edit-customer-email" value="' + Helpers.escapeHtml(customer.contactEmail) + '" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Contact Phone</label>' +
      '<input type="tel" class="form-control" id="edit-customer-phone" value="' + Helpers.escapeHtml(customer.contactPhone || '') + '">' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="row">' +
      '<div class="col-md-12">' +
      '<div class="alert alert-info" style="margin-top: 15px;">' +
      '<p class="mb-0"><strong>Customer URL:</strong></p>' +
      '<p class="mb-0" style="font-size: 14px; margin-top: 5px;">' + fullCustomerUrl + '</p>' +
      '<p class="mb-0 mt-2"><small><strong>Note:</strong> The customer URL cannot be changed after creation.</small></p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Save Changes</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#edit-customer-modal').modal('show');
    
    $(document).off('submit', '#edit-customer-form').on('submit', '#edit-customer-form', function(e) {
      e.preventDefault();
      
      var updates = {
        name: $('#edit-customer-name').val(),
        industry: $('#edit-customer-industry').val(),
        contactEmail: $('#edit-customer-email').val(),
        contactPhone: $('#edit-customer-phone').val()
      };
      
      AppState.updateCustomer(customerId, updates);
      $('#edit-customer-modal').modal('hide');
      CustomerDetailComponent.render();
      Helpers.showAlert('Customer updated successfully', 'success');
    });
    
    $('#edit-customer-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  // Show Add Employee Modal
  showAddEmployeeModal: function(customer, customerId) {
    var modalHtml = '<div class="modal fade" id="add-employee-modal" tabindex="-1">' +
      '<div class="modal-dialog">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Add Employee</h4>' +
      '</div>' +
      '<form id="add-employee-form">' +
      '<div class="modal-body">' +
      '<div class="form-group">' +
      '<label>First Name *</label>' +
      '<input type="text" class="form-control" id="employee-firstname" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Last Name *</label>' +
      '<input type="text" class="form-control" id="employee-lastname" required>' +
      '</div>' +
      // Employee ID - always show, required if configured
      '<div class="form-group">' +
      '<label>Employee ID' + (customer.employeeFieldConfig.requireEmployeeId ? ' *' : '') + '</label>' +
      '<input type="text" class="form-control" id="employee-id"' + (customer.employeeFieldConfig.requireEmployeeId ? ' required' : '') + ' placeholder="Optional">' +
      '</div>' +
      // Username - always show, required if configured
      '<div class="form-group">' +
      '<label>Username' + (customer.employeeFieldConfig.requireUsername ? ' *' : '') + '</label>' +
      '<input type="text" class="form-control" id="employee-username"' + (customer.employeeFieldConfig.requireUsername ? ' required' : '') + ' placeholder="Optional">' +
      '</div>' +
      // Date of Birth - always show, required if configured
      '<div class="form-group">' +
      '<label>Date of Birth' + (customer.employeeFieldConfig.requireDateOfBirth ? ' *' : '') + '</label>' +
      '<input type="date" class="form-control" id="employee-dob"' + (customer.employeeFieldConfig.requireDateOfBirth ? ' required' : '') + '>' +
      '</div>' +
      // Start Date - always show, required if configured
      '<div class="form-group">' +
      '<label>Start Date' + (customer.employeeFieldConfig.requireStartDate ? ' *' : '') + '</label>' +
      '<input type="date" class="form-control" id="employee-startdate"' + (customer.employeeFieldConfig.requireStartDate ? ' required' : '') + '>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>User Group *</label>' +
      '<select class="form-control" id="employee-group" required>' +
      customer.groups.map(function(g) {
        return '<option value="' + g.id + '">' + Helpers.escapeHtml(g.name) + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Notes</label>' +
      '<textarea class="form-control" id="employee-notes" rows="3" placeholder="Optional notes about this employee..."></textarea>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Add Employee</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#add-employee-modal').modal('show');
    
    $(document).off('submit', '#add-employee-form').on('submit', '#add-employee-form', function(e) {
      e.preventDefault();
      
      var groupId = $('#employee-group').val();
      var firstName = $('#employee-firstname').val();
      var lastName = $('#employee-lastname').val();
      var notes = $('#employee-notes').val();
      // Get all identifier fields (both required and optional)
      var employeeId = $('#employee-id').val().trim() || undefined;
      var username = $('#employee-username').val().trim() || undefined;
      var dateOfBirth = $('#employee-dob').val() || undefined;
      var startDate = $('#employee-startdate').val() || undefined;
      
      var newEmployee = {
        id: Helpers.generateId(),
        firstName: firstName,
        lastName: lastName,
        name: firstName + ' ' + lastName,
        employeeId: employeeId,
        username: username,
        dateOfBirth: dateOfBirth,
        startDate: startDate,
        groupId: groupId,
        voucherExpiry: '2024-12-31',
        voucherStatus: 'active',
        remainingBalance: 0,
        voucherBalances: [],
        notes: notes
      };
      
      var updatedEmployees = customer.employees.concat([newEmployee]);
      
      // Update group employee count
      var updatedGroups = customer.groups.map(function(g) {
        if (g.id === groupId) {
          return Object.assign({}, g, { employeeCount: g.employeeCount + 1 });
        }
        return g;
      });
      
      AppState.updateCustomer(customerId, { 
        employees: updatedEmployees,
        groups: updatedGroups,
        employeeCount: updatedEmployees.length
      });
      
      $('#add-employee-modal').modal('hide');
      CustomerDetailComponent.renderTabContent('employees');
      Helpers.showAlert('Employee added successfully', 'success');
    });
    
    $('#add-employee-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  // Show Create Group Modal (simple version - replaced with full page form)
  showCreateGroupModal: function(customer, customerId) {
    // Navigate to full-page user group form instead
    App.navigate('customer-group-form', { customerId: customerId });
  },
  
  // Render full-page User Group Form
  renderUserGroupForm: function(customer, customerId, groupId) {
    var group = groupId ? customer.groups.find(function(g) { return g.id === groupId; }) : null;
    var isEdit = !!group;
    
    var html = '<div>' +
      Templates.header() +
      '<div class="container-fluid" style="padding: 20px;">' +
      // Back button
      '<button class="btn btn-default mb-3" id="back-to-customer">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to Customer Detail' +
      '</button>' +
      
      // Page Title
      '<div style="margin-bottom: 30px;">' +
      '<h2>' + (isEdit ? 'Edit User Group' : 'Create User Group') + '</h2>' +
      '<p class="text-muted">' + 
      (isEdit ? 'Update group information and product visibility' : 'Create a new user group and assign product visibility') +
      '</p>' +
      '</div>' +
      
      // Form Card
      '<div class="panel panel-default">' +
      '<div class="panel-body" style="padding: 30px;">' +
      '<form id="user-group-form">' +
      
      // Basic Information Section
      '<div style="margin-bottom: 30px;">' +
      '<h4 style="margin-bottom: 20px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">Basic Information</h4>' +
      
      '<div class="form-group">' +
      '<label for="group-name">Group Name <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="group-name" ' +
      'placeholder="e.g., Engineering Team, Sales Department" ' +
      'value="' + (group ? Helpers.escapeHtml(group.name) : '') + '" required>' +
      '</div>' +
      
      '<div class="form-group">' +
      '<label for="group-department">Department (Optional)</label>' +
      '<input type="text" class="form-control" id="group-department" ' +
      'placeholder="e.g., Engineering, Sales, Operations" ' +
      'value="' + (group ? Helpers.escapeHtml(group.department || '') : '') + '">' +
      '</div>' +
      
      '<div class="form-group">' +
      '<label for="group-location">Location (Optional)</label>' +
      '<input type="text" class="form-control" id="group-location" ' +
      'placeholder="e.g., New York Office, Warehouse A, Remote" ' +
      'value="' + (group ? Helpers.escapeHtml(group.location || '') : '') + '">' +
      '</div>' +
      '</div>' +
      
      // Product Visibility Section
      '<div style="margin-bottom: 30px; padding-top: 30px; border-top: 1px solid #e0e0e0;">' +
      '<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">' +
      '<div>' +
      '<h4 style="margin: 0 0 5px 0;">Product Visibility</h4>' +
      '<p class="text-muted" style="margin: 0; font-size: 13px;">Select which products this user group can access</p>' +
      '</div>' +
      '<button type="button" class="btn btn-default btn-sm" id="toggle-all-products">Select All</button>' +
      '</div>' +
      
      // Selected Products Display
      '<div id="selected-products-display" style="display: none; margin-bottom: 15px; padding: 15px; background-color: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px;">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">' +
      '<p style="margin: 0; font-size: 12px; color: #666;">Selected Products (<span id="selected-count">0</span>)</p>' +
      '</div>' +
      '<div id="selected-products-badges" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>' +
      '</div>' +
      
      // Search and Filter
      '<div style="margin-bottom: 15px;">' +
      '<div style="position: relative; margin-bottom: 15px;">' +
      '<span class="glyphicon glyphicon-search" style="position: absolute; left: 10px; top: 10px; color: #999;"></span>' +
      '<input type="text" class="form-control" id="product-search" ' +
      'placeholder="Search products by name, category, or SKU..." ' +
      'style="padding-left: 35px;">' +
      '</div>' +
      
      // Category Filter Badges
      '<div id="category-filters" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>' +
      '</div>' +
      
      // Product List (scrollable)
      '<div style="border: 1px solid #ddd; border-radius: 4px; max-height: 500px; overflow-y: auto;">' +
      '<div id="product-list" style="padding: 15px;"></div>' +
      '</div>' +
      '</div>' +
      
      // Form Actions
      '<div style="display: flex; gap: 10px; padding-top: 20px;">' +
      '<button type="button" class="btn btn-default" id="cancel-group-form">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Save Changes' : 'Create Group') + '</button>' +
      '</div>' +
      
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    return html;
  },
  
  // Show Edit Group Modal
  showEditGroupModal: function(customer, group, customerId) {
    var modalHtml = '<div class="modal fade" id="edit-group-modal" tabindex="-1">' +
      '<div class="modal-dialog">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Edit User Group</h4>' +
      '</div>' +
      '<form id="edit-group-form">' +
      '<div class="modal-body">' +
      '<div class="form-group">' +
      '<label>Group Name *</label>' +
      '<input type="text" class="form-control" id="edit-group-name" value="' + Helpers.escapeHtml(group.name) + '" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Department</label>' +
      '<input type="text" class="form-control" id="edit-group-department" value="' + Helpers.escapeHtml(group.department || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Location</label>' +
      '<input type="text" class="form-control" id="edit-group-location" value="' + Helpers.escapeHtml(group.location || '') + '">' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Save Changes</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#edit-group-modal').modal('show');
    
    $(document).off('submit', '#edit-group-form').on('submit', '#edit-group-form', function(e) {
      e.preventDefault();
      
      var updatedGroups = customer.groups.map(function(g) {
        if (g.id === group.id) {
          return Object.assign({}, g, {
            name: $('#edit-group-name').val(),
            department: $('#edit-group-department').val() || '',
            location: $('#edit-group-location').val() || ''
          });
        }
        return g;
      });
      
      AppState.updateCustomer(customerId, { groups: updatedGroups });
      
      $('#edit-group-modal').modal('hide');
      CustomerDetailComponent.renderTabContent('employees');
      Helpers.showAlert('Group updated successfully', 'success');
    });
    
    $('#edit-group-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  // Show Create Voucher Modal
  showCreateVoucherModal: function(customer, customerId) {
    // Get user groups with products
    var eligibleGroups = customer.groups.filter(function(g) {
      return (g.productIds || []).length > 0;
    });
    
    var modalHtml = '<div class="modal fade" id="create-voucher-modal" tabindex="-1">' +
      '<div class="modal-dialog modal-lg">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Create Voucher Program</h4>' +
      '</div>' +
      '<form id="create-voucher-form">' +
      '<div class="modal-body">' +
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Voucher Name *</label>' +
      '<input type="text" class="form-control" id="voucher-name" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Default Amount *</label>' +
      '<input type="number" class="form-control" id="voucher-amount" step="0.01" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Description</label>' +
      '<textarea class="form-control" id="voucher-description" rows="2"></textarea>' +
      '</div>' +
      
      // User Group Assignment Section
      '<div class="form-group">' +
      '<label>Assign to User Group *</label>' +
      '<p class="help-block">Select which user group can use this voucher</p>';
    
    if (eligibleGroups.length === 0) {
      modalHtml += '<div class="alert alert-warning">' +
        'No user groups with product visibility available. Create a user group and assign products first.' +
        '</div>';
    } else {
      modalHtml += '<select class="form-control" id="voucher-usergroup" required>' +
        '<option value="">-- Select User Group --</option>';
      eligibleGroups.forEach(function(group) {
        modalHtml += '<option value="' + group.id + '">' + 
          Helpers.escapeHtml(group.name) + ' (' + group.employeeCount + ' employees, ' + 
          (group.productIds || []).length + ' products)' +
          '</option>';
      });
      modalHtml += '</select>';
    }
    
    modalHtml += '</div>' +
      
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Start Date *</label>' +
      '<input type="date" class="form-control" id="voucher-startdate" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>End Date *</label>' +
      '<input type="date" class="form-control" id="voucher-enddate" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="row">' +
      '<div class="col-md-4">' +
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" id="voucher-active" checked> Active' +
      '</label>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4">' +
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" id="voucher-autorenewal"> Auto-renewal' +
      '</label>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4">' +
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" id="voucher-rollover"> Rollover Enabled' +
      '</label>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary" ' + (eligibleGroups.length === 0 ? 'disabled' : '') + '>Create Voucher</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#create-voucher-modal').modal('show');
    
    $(document).off('submit', '#create-voucher-form').on('submit', '#create-voucher-form', function(e) {
      e.preventDefault();
      
      var userGroupId = $('#voucher-usergroup').val();
      if (!userGroupId) {
        Helpers.showAlert('Please select a user group', 'warning');
        return;
      }
      
      // Get products from selected user group
      var selectedGroup = customer.groups.find(function(g) { return g.id === userGroupId; });
      var productIds = selectedGroup ? (selectedGroup.productIds || []) : [];
      
      var newVoucher = {
        id: Helpers.generateId(),
        name: $('#voucher-name').val(),
        description: $('#voucher-description').val(),
        defaultAmount: parseFloat($('#voucher-amount').val()),
        startDate: $('#voucher-startdate').val(),
        endDate: $('#voucher-enddate').val(),
        isActive: $('#voucher-active').prop('checked'),
        autoRenewal: $('#voucher-autorenewal').prop('checked'),
        rolloverEnabled: $('#voucher-rollover').prop('checked'),
        productIds: productIds,
        userGroupIds: [userGroupId]
      };
      
      var updatedVouchers = customer.vouchers.concat([newVoucher]);
      var activeCount = updatedVouchers.filter(function(v) { return v.isActive; }).length;
      
      AppState.updateCustomer(customerId, { 
        vouchers: updatedVouchers,
        activeVouchers: activeCount
      });
      
      $('#create-voucher-modal').modal('hide');
      CustomerDetailComponent.renderTabContent('vouchers');
      Helpers.showAlert('Voucher created successfully', 'success');
    });
    
    $('#create-voucher-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  // Show Edit Voucher Modal
  showEditVoucherModal: function(customer, voucher, customerId) {
    // Get user groups with products
    var eligibleGroups = customer.groups.filter(function(g) {
      return (g.productIds || []).length > 0;
    });
    
    // Get current user group assignment
    var currentUserGroupId = (voucher.userGroupIds && voucher.userGroupIds.length > 0) ? voucher.userGroupIds[0] : '';
    
    var modalHtml = '<div class="modal fade" id="edit-voucher-modal" tabindex="-1">' +
      '<div class="modal-dialog modal-lg">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Edit Voucher Program</h4>' +
      '</div>' +
      '<form id="edit-voucher-form">' +
      '<div class="modal-body">' +
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Voucher Name *</label>' +
      '<input type="text" class="form-control" id="edit-voucher-name" value="' + Helpers.escapeHtml(voucher.name) + '" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Default Amount *</label>' +
      '<input type="number" class="form-control" id="edit-voucher-amount" value="' + voucher.defaultAmount + '" step="0.01" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Description</label>' +
      '<textarea class="form-control" id="edit-voucher-description" rows="2">' + Helpers.escapeHtml(voucher.description) + '</textarea>' +
      '</div>' +
      
      // User Group Assignment Section
      '<div class="form-group">' +
      '<label>Assign to User Group *</label>' +
      '<p class="help-block">Select which user group can use this voucher</p>';
    
    if (eligibleGroups.length === 0) {
      modalHtml += '<div class="alert alert-warning">' +
        'No user groups with product visibility available. Create a user group and assign products first.' +
        '</div>';
    } else {
      modalHtml += '<select class="form-control" id="edit-voucher-usergroup" required>' +
        '<option value="">-- Select User Group --</option>';
      eligibleGroups.forEach(function(group) {
        var selected = group.id === currentUserGroupId ? 'selected' : '';
        modalHtml += '<option value="' + group.id + '" ' + selected + '>' + 
          Helpers.escapeHtml(group.name) + ' (' + group.employeeCount + ' employees, ' + 
          (group.productIds || []).length + ' products)' +
          '</option>';
      });
      modalHtml += '</select>';
    }
    
    modalHtml += '</div>' +
      
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>Start Date *</label>' +
      '<input type="date" class="form-control" id="edit-voucher-startdate" value="' + voucher.startDate + '" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label>End Date *</label>' +
      '<input type="date" class="form-control" id="edit-voucher-enddate" value="' + voucher.endDate + '" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="row">' +
      '<div class="col-md-4">' +
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" id="edit-voucher-active" ' + (voucher.isActive ? 'checked' : '') + '> Active' +
      '</label>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4">' +
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" id="edit-voucher-autorenewal" ' + (voucher.autoRenewal ? 'checked' : '') + '> Auto-renewal' +
      '</label>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4">' +
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" id="edit-voucher-rollover" ' + (voucher.rolloverEnabled ? 'checked' : '') + '> Rollover Enabled' +
      '</label>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary" ' + (eligibleGroups.length === 0 ? 'disabled' : '') + '>Save Changes</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#edit-voucher-modal').modal('show');
    
    $(document).off('submit', '#edit-voucher-form').on('submit', '#edit-voucher-form', function(e) {
      e.preventDefault();
      
      var userGroupId = $('#edit-voucher-usergroup').val();
      if (!userGroupId) {
        Helpers.showAlert('Please select a user group', 'warning');
        return;
      }
      
      // Get products from selected user group
      var selectedGroup = customer.groups.find(function(g) { return g.id === userGroupId; });
      var productIds = selectedGroup ? (selectedGroup.productIds || []) : [];
      
      var updatedVouchers = customer.vouchers.map(function(v) {
        if (v.id === voucher.id) {
          return Object.assign({}, v, {
            name: $('#edit-voucher-name').val(),
            description: $('#edit-voucher-description').val(),
            defaultAmount: parseFloat($('#edit-voucher-amount').val()),
            startDate: $('#edit-voucher-startdate').val(),
            endDate: $('#edit-voucher-enddate').val(),
            isActive: $('#edit-voucher-active').prop('checked'),
            autoRenewal: $('#edit-voucher-autorenewal').prop('checked'),
            rolloverEnabled: $('#edit-voucher-rollover').prop('checked'),
            productIds: productIds,
            userGroupIds: [userGroupId]
          });
        }
        return v;
      });
      
      var activeCount = updatedVouchers.filter(function(v) { return v.isActive; }).length;
      
      AppState.updateCustomer(customerId, { 
        vouchers: updatedVouchers,
        activeVouchers: activeCount
      });
      
      $('#edit-voucher-modal').modal('hide');
      CustomerDetailComponent.renderTabContent('vouchers');
      Helpers.showAlert('Voucher updated successfully', 'success');
    });
    
    $('#edit-voucher-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  // Customer Form Wizard
  customerFormWizard: function(currentStep, formData, isEditMode) {
    var steps = [
      { id: 1, title: 'Basic Information', description: 'Customer name and URL' },
      { id: 2, title: 'Branding', description: 'Upload customer logo' },
      { id: 3, title: 'Employee Fields', description: 'Configure required fields' },
      { id: 4, title: 'Payment Methods', description: 'Select payment options' },
      { id: 5, title: 'Terms & Conditions', description: 'Set payment terms' },
      { id: 6, title: 'Review', description: 'Review and confirm' }
    ];
    
    var html = '<div>' +
      Templates.header() +
      '<div class="container-fluid" style="padding: 20px;">' +
      '<div class="row">' +
      '<div class="col-md-10 col-md-offset-1">' +
      '<div class="mb-4">' +
      '<button class="btn btn-default mb-3" id="cancel-customer-form">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to Dashboard' +
      '</button>' +
      '<h2 class="mt-2">' + (isEditMode ? 'Edit Customer' : 'Create New Customer') + '</h2>' +
      '<p class="text-muted">' +
      (isEditMode ? 'Update customer information and configuration' : 'Follow the steps to set up a new customer') +
      '</p>' +
      '</div>' +
      '<div class="panel panel-default">' +
      '<div class="panel-body" style="background-color: #f9f9f9; padding: 30px;">' +
      this.renderStepIndicator(steps, currentStep, isEditMode) +
      '</div>' +
      '<div class="panel-body" style="min-height: 500px; padding: 40px;">' +
      this.renderStepContent(currentStep, formData, isEditMode) +
      '</div>' +
      '<div class="panel-footer" style="padding: 20px;">' +
      this.renderStepButtons(currentStep, steps.length, isEditMode) +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    return html;
  },
  
  renderStepIndicator: function(steps, currentStep, isEditMode) {
    var html = '<div class="row" style="display: flex; flex-wrap: nowrap; align-items: center;">';
    
    steps.forEach(function(step, index) {
      var isCompleted = currentStep > step.id;
      var isCurrent = currentStep === step.id;
      var statusClass = isCompleted ? 'success' : (isCurrent ? 'primary' : 'default');
      
      // Make steps clickable in edit mode
      var clickableClass = isEditMode ? 'wizard-step-clickable' : '';
      var cursorStyle = isEditMode ? 'cursor: pointer;' : '';
      var stepClickAttr = isEditMode ? ' data-step-id="' + step.id + '"' : '';
      
      html += '<div class="text-center ' + clickableClass + '" style="flex: 1; min-width: 0; ' + cursorStyle + '"' + stepClickAttr + '>' +
        '<div class="step-indicator">' +
        '<div class="step-number step-' + statusClass + '">' +
        (isCompleted ? '<span class="glyphicon glyphicon-ok"></span>' : step.id) +
        '</div>' +
        '<div class="step-title ' + (isCurrent || isCompleted ? 'text-primary' : 'text-muted') + '" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' +
        '<strong>' + step.title + '</strong>' +
        '</div>' +
        '<div class="step-description text-muted hidden-xs" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><small>' + step.description + '</small></div>' +
        '</div>' +
        '</div>';
      
      if (index < steps.length - 1) {
        html += '<div class="hidden-xs" style="width: 40px; padding-top: 20px; flex-shrink: 0;">' +
          '<div class="step-connector ' + (isCompleted ? 'step-connector-completed' : '') + '"></div>' +
          '</div>';
      }
    });
    
    html += '</div>';
    return html;
  },
  
  renderStepContent: function(currentStep, formData, isEditMode) {
    switch(currentStep) {
      case 1:
        return this.renderStep1(formData, isEditMode);
      case 2:
        return this.renderStep2(formData);
      case 3:
        return this.renderStep3(formData, isEditMode);
      case 4:
        return this.renderStep4(formData);
      case 5:
        return this.renderStep5(formData, isEditMode);
      case 6:
        return this.renderStep6(formData);
      default:
        return '';
    }
  },
  
  renderStep1: function(formData, isEditMode) {
    // Generate full customer URL with distributor slug for edit mode
    var urlNote = '';
    if (isEditMode) {
      var distributorName = AppState.distributorName || 'Premier Distributor Co';
      var distributorSlug = distributorName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      var fullCustomerUrl = 'www.surewerxdistributor.com/' + distributorSlug + '/' + Helpers.escapeHtml(formData.slug);
      urlNote = '<p class=\"mb-0 mt-2\"><small><strong>Note:</strong> The customer URL cannot be changed after creation.</small></p>';
    }
    
    return '<h3>Customer Details</h3>' +
      '<p class=\"text-muted mb-4\">Enter the basic information for the customer</p>' +
      '<div class=\"row\">' +
      '<div class=\"col-md-8\">' +
      '<div class=\"form-group\">' +
      '<label>Customer Name *</label>' +
      '<input type=\"text\" class=\"form-control\" id=\"customer-name\" value=\"' + Helpers.escapeHtml(formData.name) + '\" placeholder=\"e.g., ABC Construction Company\">' +
      '<small class=\"text-muted\">This name will appear throughout the portal</small>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class=\"row\">' +
      '<div class=\"col-md-8\">' +
      '<div class=\"alert alert-info\">' +
      '<p class=\"mb-0\"><strong>Customer URL Preview:</strong></p>' +
      '<p id=\"slug-preview\" class=\"mb-0\" style=\"font-size: 14px; margin-top: 5px;\"></p>' +
      (!isEditMode ? '<p class=\"mb-0 mt-2\"><small><strong>Note:</strong> The URL slug is automatically generated from the customer name. This will be the URL employees use to access the portal.</small></p>' : urlNote) +
      '</div>' +
      '</div>' +
      '</div>';
  },
  
  renderStep2: function(formData) {
    if (formData.logo) {
      return '<h3>Customer Branding</h3>' +
        '<p class="text-muted mb-4">Upload a logo to personalize the customer\'s experience (optional)</p>' +
        '<div class="text-center">' +
        '<div class="panel panel-default" style="display: inline-block; position: relative;">' +
        '<div class="panel-body" style="padding: 20px;">' +
        '<img src="' + formData.logo + '" alt="Customer logo" style="max-height: 200px; max-width: 100%;">' +
        '</div>' +
        '<button type="button" class="btn btn-danger btn-sm" id="remove-logo-btn" style="position: absolute; top: -10px; right: -10px; border-radius: 50%;">' +
        '<span class="glyphicon glyphicon-remove"></span>' +
        '</button>' +
        '</div>' +
        '<div class="mt-3">' +
        '<label for="customer-logo-upload" class="btn btn-default">' +
        '<span class="glyphicon glyphicon-upload"></span> Change Logo' +
        '</label>' +
        '<input type="file" id="customer-logo-upload" accept="image/*" style="display: none;">' +
        '</div>' +
        '</div>';
    } else {
      return '<h3>Customer Branding</h3>' +
        '<p class="text-muted mb-4">Upload a logo to personalize the customer\'s experience (optional)</p>' +
        '<div class="text-center">' +
        '<div class="panel panel-default" id="upload-logo-area" style="display: inline-block; cursor: pointer; min-width: 400px;">' +
        '<div class="panel-body" style="padding: 60px 40px;">' +
        '<span class="glyphicon glyphicon-upload" style="font-size: 48px; color: #ccc; display: block; margin-bottom: 20px;"></span>' +
        '<p>Click to upload logo</p>' +
        '<p class="text-muted"><small>PNG, JPG up to 5MB</small></p>' +
        '</div>' +
        '</div>' +
        '<input type="file" id="customer-logo-upload" accept="image/*" style="display: none;">' +
        '</div>' +
        '<div class="alert alert-info mt-4">' +
        '<strong>Tip:</strong> Use a high-quality logo with a transparent background for the best results.' +
        '</div>';
    }
  },
  
  renderStep3: function(formData, isEditMode) {
    var fieldsDisabled = isEditMode ? 'disabled' : '';
    var fieldsNote = isEditMode ? '<div class="alert alert-warning" style="margin-top: 10px; margin-bottom: 15px;"><strong>Note:</strong> Employee field configuration cannot be changed after customer creation.</div>' : '';
    
    return '<h3>Employee Information Requirements</h3>' +
      '<p class="text-muted mb-4">Select which information will be required when adding employees</p>' +
      '<div class="alert alert-info">' +
      '<strong>Important:</strong> The fields you select here will be:<br>' +
      '<ul class="mb-0 mt-2">' +
      '<li>Required when adding employees to this customer</li>' +
      '<li>Required for employees to sign into the portal</li>' +
      '</ul>' +
      '<p class="mt-2 mb-0">You must select at least one identifier field (Employee ID or Username) and one date field (Date of Birth or Start Date).</p>' +
      '</div>' +
      '<div class="panel panel-default">' +
      '<div class="panel-body" style="background-color: #f9f9f9;">' +
      fieldsNote +
      '<h4>Identifier Fields</h4>' +
      '<p class="text-muted">Select one method to uniquely identify employees (required)</p>' +
      '<div class="radio">' +
      '<label' + (isEditMode ? ' style="opacity: 0.6; cursor: not-allowed;"' : '') + '>' +
      '<input type="radio" name="identifier-field" id="require-employee-id" value="employeeId" ' + (formData.employeeFieldConfig.requireEmployeeId ? 'checked' : '') + ' ' + fieldsDisabled + '> ' +
      '<strong>Employee ID</strong> - Company-assigned employee identification number' +
      '</label>' +
      '</div>' +
      '<div class="radio">' +
      '<label' + (isEditMode ? ' style="opacity: 0.6; cursor: not-allowed;"' : '') + '>' +
      '<input type="radio" name="identifier-field" id="require-username" value="username" ' + (formData.employeeFieldConfig.requireUsername ? 'checked' : '') + ' ' + fieldsDisabled + '> ' +
      '<strong>Username</strong> - Unique username for system access' +
      '</label>' +
      '</div>' +
      '<hr>' +
      '<h4>Date Fields</h4>' +
      '<p class="text-muted">Select one date field for employee records (required)</p>' +
      '<div class="radio">' +
      '<label' + (isEditMode ? ' style="opacity: 0.6; cursor: not-allowed;"' : '') + '>' +
      '<input type="radio" name="date-field" id="require-dob" value="dob" ' + (formData.employeeFieldConfig.requireDateOfBirth ? 'checked' : '') + ' ' + fieldsDisabled + '> ' +
      '<strong>Date of Birth</strong> - Employee\'s date of birth for verification' +
      '</label>' +
      '</div>' +
      '<div class="radio">' +
      '<label' + (isEditMode ? ' style="opacity: 0.6; cursor: not-allowed;"' : '') + '>' +
      '<input type="radio" name="date-field" id="require-start-date" value="startDate" ' + (formData.employeeFieldConfig.requireStartDate ? 'checked' : '') + ' ' + fieldsDisabled + '> ' +
      '<strong>Start Date</strong> - Employee\'s start date with the company' +
      '</label>' +
      '</div>' +
      '</div>' +
      '</div>';
  },
  
  renderStep4: function(formData) {
    // Get the selected payment methods (ensure it's an array)
    var selectedMethods = Array.isArray(formData.paymentMethods) ? formData.paymentMethods : 
      (formData.paymentMethods ? [formData.paymentMethods] : ['Credit Card']);
    var hasCreditCard = selectedMethods.indexOf('Credit Card') !== -1;
    var hasPayroll = selectedMethods.indexOf('Payroll Deduction') !== -1;
    
    return '<h3>Payment Methods</h3>' +
      '<p class="text-muted mb-4">Select the payment methods available to this customer (at least one required)</p>' +
      '<div class="alert alert-info">' +
      '<strong>Important:</strong> The payment methods you select here will be available for employees to use when redeeming vouchers.' +
      '</div>' +
      '<div class="panel panel-default">' +
      '<div class="panel-body" style="background-color: #f9f9f9;">' +
      '<h4>Payment Methods</h4>' +
      '<p class="text-muted">Select one or more payment methods</p>' +
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" name="payment-method" id="payment-credit-card" value="Credit Card" ' + (hasCreditCard ? 'checked' : '') + '> ' +
      '<strong>Credit Card</strong> - Allow employees to pay with a credit card' +
      '</label>' +
      '</div>' +
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" name="payment-method" id="payment-payroll" value="Payroll Deduction" ' + (hasPayroll ? 'checked' : '') + '> ' +
      '<strong>Payroll Deduction</strong> - Allow employees to have vouchers deducted from their payroll' +
      '</label>' +
      '</div>' +
      '</div>' +
      '</div>';
  },
  
  renderStep5: function(formData, isEditMode) {
    // Get default terms from CustomerFormComponent
    var defaultTerms = 'Net 30 payment terms. Payment is due within 30 days of invoice date. Late payments may be subject to a 1.5% monthly interest charge. All sales are final unless otherwise specified in writing.';
    var currentTerms = formData.termsAndConditions || '';
    var displayTerms = currentTerms || defaultTerms;
    
    return '<h3>Terms & Conditions</h3>' +
      '<p class="text-muted mb-4">Set the default terms and conditions for this customer. You can use the default terms or customize them.</p>' +
      '<div class="panel panel-default">' +
      '<div class="panel-heading">' +
      '<h4 class="panel-title">Default Terms & Conditions</h4>' +
      '</div>' +
      '<div class="panel-body" style="background-color: #f9f9f9;">' +
      '<p style="white-space: pre-wrap; line-height: 1.6;">' + Helpers.escapeHtml(defaultTerms) + '</p>' +
      '<button type="button" class="btn btn-default btn-sm" id="use-default-terms-btn">' +
      '<span class="glyphicon glyphicon-arrow-down"></span> Use Default Terms' +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="terms-and-conditions">Custom Terms & Conditions (Optional)</label>' +
      '<textarea class="form-control" id="terms-and-conditions" rows="8" placeholder="Enter custom terms and conditions, or leave blank to use default terms...">' + Helpers.escapeHtml(currentTerms) + '</textarea>' +
      '<small class="text-muted">If you enter custom terms, they will override the default terms. Leave blank to use the default terms.</small>' +
      '</div>' +
      '<div class="alert alert-info">' +
      '<strong>Note:</strong> These terms and conditions will be used for invoices and transactions for this customer.' +
      '</div>';
  },
  
  renderStep6: function(formData) {
    var requiredFields = [];
    if (formData.employeeFieldConfig.requireEmployeeId) requiredFields.push('Employee ID');
    if (formData.employeeFieldConfig.requireUsername) requiredFields.push('Username');
    if (formData.employeeFieldConfig.requireDateOfBirth) requiredFields.push('Date of Birth');
    if (formData.employeeFieldConfig.requireStartDate) requiredFields.push('Start Date');
    
    // Get default terms
    var defaultTerms = 'Net 30 payment terms. Payment is due within 30 days of invoice date. Late payments may be subject to a 1.5% monthly interest charge. All sales are final unless otherwise specified in writing.';
    var displayTerms = formData.termsAndConditions || defaultTerms;
    
    return '<h3>Review & Confirm</h3>' +
      '<p class="text-muted mb-4">Please review the customer information before saving</p>' +
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><strong>Basic Information</strong></div>' +
      '<div class="panel-body">' +
      '<p><strong>Name:</strong> ' + Helpers.escapeHtml(formData.name) + '</p>' +
      '<p><strong>Slug:</strong> ' + Helpers.escapeHtml(formData.slug) + '</p>' +
      '<div class="form-group">' +
      '<label><strong>Status:</strong></label>' +
      '<select class="form-control" id="customer-status" style="max-width: 200px;">' +
      '<option value="active"' + (formData.status === 'active' ? ' selected' : '') + '>Active</option>' +
      '<option value="inactive"' + (formData.status === 'inactive' ? ' selected' : '') + '>Inactive</option>' +
      '</select>' +
      '<small class="text-muted">Inactive customers cannot be accessed by their employees</small>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><strong>Payment Methods</strong></div>' +
      '<div class="panel-body">' +
      (formData.paymentMethods.length > 0 ? 
        formData.paymentMethods.map(function(m) {
          return '<p><span class="glyphicon glyphicon-ok text-success"></span> ' + m + '</p>';
        }).join('') : 
        '<p class="text-muted">None selected</p>') +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-6">' +
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><strong>Logo</strong></div>' +
      '<div class="panel-body text-center">' +
      (formData.logo ? 
        '<img src="' + formData.logo + '" alt="Customer logo" style="max-height: 100px; max-width: 100%;">' : 
        '<p class="text-muted">No logo uploaded</p>') +
      '</div>' +
      '</div>' +
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><strong>Required Employee Fields</strong></div>' +
      '<div class="panel-body">' +
      (requiredFields.length > 0 ? 
        requiredFields.map(function(f) {
          return '<p><span class="glyphicon glyphicon-ok text-success"></span> ' + f + '</p>';
        }).join('') : 
        '<p class="text-muted">None selected</p>') +
      '</div>' +
      '</div>' +
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><strong>Terms & Conditions</strong></div>' +
      '<div class="panel-body">' +
      '<p style="white-space: pre-wrap; line-height: 1.6; margin-bottom: 0;">' + Helpers.escapeHtml(displayTerms) + '</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
  },
  
  renderStepButtons: function(currentStep, totalSteps, isEditMode) {
    isEditMode = isEditMode || false;
    var html = '<div class="row">' +
      '<div class="col-sm-6">';
    
    if (currentStep > 1) {
      html += '<button type="button" class="btn btn-default" id="back-step-btn">' +
        '<span class="glyphicon glyphicon-chevron-left"></span> Back' +
        '</button>';
    }
    
    html += '</div>' +
      '<div class="col-sm-6 text-right">';
    
    if (currentStep < totalSteps) {
      html += '<button type="button" class="btn btn-primary" id="next-step-btn">' +
        'Next <span class="glyphicon glyphicon-chevron-right"></span>' +
        '</button>';
      // In edit mode, also show Save button on all steps
      if (isEditMode) {
        html += ' <button type="button" class="btn btn-success" id="save-customer-btn">' +
          '<span class="glyphicon glyphicon-ok"></span> Save Customer' +
          '</button>';
      }
    } else {
      html += '<button type="button" class="btn btn-success" id="save-customer-btn">' +
        '<span class="glyphicon glyphicon-ok"></span> Save Customer' +
        '</button>';
    }
    
    html += '</div>' +
      '</div>';
    
    return html;
  }
};
// Customer Detail Component

var CustomerDetailComponent = {
  customerId: null,
  currentTab: 'groups',
  selectedGroupId: null,
  voucherStatusFilter: 'all',
  
  init: function(customerId, tab) {
    // Validate customerId
    if (!customerId || customerId === 'undefined' || customerId === 'null') {
      // If user is a customer, redirect to their customer detail page
      if (AppState.currentUser && AppState.currentUser.role === 'Customer' && AppState.currentUser.customerId) {
        App.navigate('customer-detail', { customerId: AppState.currentUser.customerId });
        return;
      }
      // Otherwise redirect to dashboard or login
      if (AppState.isLoggedIn) {
        App.navigate('dashboard');
      } else {
        App.navigate('login');
      }
      return;
    }
    
    // Check if customer exists
    var customer = AppState.getCustomerById(customerId);
    if (!customer) {
      // Customer not found - check if session is still valid
      if (!AppState.isLoggedIn) {
        // Session expired, redirect to login
        App.navigate('login');
        return;
      }
      // Session valid but customer doesn't exist - redirect to dashboard
      App.navigate('dashboard');
      return;
    }
    
    this.customerId = customerId;
    this.currentTab = tab || 'employees'; // Default to employees tab per FRD
    this.selectedGroupId = null;
    EmployeeTableEnhanced.init(); // Initialize enhanced table features
    this.render();
    this.attachEvents();
  },
  
  render: function() {
    // Double-check customer exists before rendering
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) {
      if (!AppState.isLoggedIn) {
        App.navigate('login');
        return;
      }
      App.navigate('dashboard');
      return;
    }
    
    $('#app-container').html(Templates.customerDetailPage(this.customerId));
    this.updateActiveNav('dashboard');
    this.renderTabContent(this.currentTab);
  },
  
  attachEvents: function() {
    var self = this;
    
    // Back button
    $(document).on('click', '#back-to-dashboard', function() {
      App.navigate('dashboard');
    });
    
    // Tab switching
    $(document).on('click', '.nav-tabs a[data-tab]', function(e) {
      e.preventDefault();
      var tab = $(this).data('tab');
      self.switchTab(tab);
    });
    
    // Edit customer button
    $(document).on('click', '#edit-customer-btn', function() {
      self.showEditCustomerModal();
    });
    
    // Add employee button
    $(document).on('click', '#add-employee-btn', function() {
      self.showAddEmployeeModal();
    });
    
    // Create group button
    $(document).on('click', '#create-group-btn', function() {
      self.showCreateGroupModal();
    });
    
    // Edit group button
    $(document).on('click', '.edit-group-btn', function(e) {
      e.stopPropagation(); // Prevent triggering the group card click
      var groupId = $(this).data('group-id');
      // Navigate to full-page user group form
      App.navigate('customer-group-form', { customerId: self.customerId, groupId: groupId });
    });
    
    // Delete group button
    $(document).on('click', '.delete-group-btn', function(e) {
      e.stopPropagation(); // Prevent triggering the group card click
      var groupId = $(this).data('group-id');
      self.deleteGroup(groupId);
    });
    
    // Select group (only for groups, not vouchers)
    $(document).on('click', '.user-group-card', function(e) {
      // Don't trigger if clicking on action buttons
      if ($(e.target).is('button, .btn, .btn-group, .btn-group *')) {
        return;
      }
      // Handle voucher cards separately (only for distributors)
      if ($(this).data('voucher-id')) {
        var isDistributor = AppState.currentUser && (AppState.currentUser.role === 'Distributor' || (AppState.currentUser.role === 'SureWerx' && AppState.selectedDistributorId));
        if (isDistributor) {
          var voucherId = $(this).data('voucher-id');
          self.showEditVoucherModal(voucherId);
        }
        return;
      }
      var groupId = $(this).data('group-id');
      if (groupId) {
        // Navigate to edit user group page
        App.navigate('customer-group-form', { customerId: self.customerId, groupId: groupId });
      }
    });
    
    // Create voucher button
    $(document).on('click', '#create-voucher-btn', function() {
      self.showCreateVoucherModal();
    });
    
    // Edit voucher button
    $(document).on('click', '.edit-voucher-btn', function() {
      var voucherId = $(this).data('voucher-id');
      self.showEditVoucherModal(voucherId);
    });
    
    // Voucher status filter
    $(document).on('change', '#voucher-status-filter', function() {
      self.voucherStatusFilter = $(this).val();
      self.renderTabContent('vouchers');
    });
    
    // User group filter typeaheads will be initialized after render
    
    // Delete employee button
    $(document).on('click', '.delete-employee-btn', function(e) {
      e.stopPropagation(); // Prevent row click from triggering
      var employeeId = $(this).data('employee-id');
      self.deleteEmployee(employeeId);
    });
    
    // Toggle employee status button
    $(document).on('click', '.toggle-employee-status-btn', function() {
      var employeeId = $(this).data('employee-id');
      self.toggleEmployeeStatus(employeeId);
    });
    
    // Edit employee button
    $(document).on('click', '.edit-employee-btn', function(e) {
      e.stopPropagation(); // Prevent row click from triggering
      var employeeId = $(this).data('employee-id');
      self.showEditEmployeeModal(employeeId);
    });
    
    // Delete employee button
    $(document).on('click', '.delete-employee-btn', function(e) {
      e.stopPropagation(); // Prevent row click from triggering
    });
    
    // Bulk import button
    $(document).on('click', '#bulk-import-btn', function() {
      EmployeeBulkImport.show(self.customerId);
    });
    
    // Toggle product visibility
    $(document).on('change', '.product-visibility-toggle', function() {
      var productId = $(this).data('product-id');
      var visible = $(this).prop('checked');
      self.updateProductVisibility(productId, visible);
    });
  },
  
  updateActiveNav: function(view) {
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="' + view + '"]').addClass('active');
  },
  
  switchTab: function(tabName) {
    this.currentTab = tabName;
    
    // Update active tab
    $('.nav-tabs li').removeClass('active');
    $('.nav-tabs a[data-tab="' + tabName + '"]').parent().addClass('active');
    
    // Render tab content
    this.renderTabContent(tabName);
  },
  
  renderTabContent: function(tabName) {
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) {
      // Customer not found - check if session is still valid
      if (!AppState.isLoggedIn) {
        App.navigate('login');
        return;
      }
      App.navigate('dashboard');
      return;
    }
    
    // Update current tab and tab highlighting
    this.currentTab = tabName;
    $('.nav-tabs li').removeClass('active');
    $('.nav-tabs a[data-tab="' + tabName + '"]').parent().addClass('active');
    
    var isDistributor = AppState.currentUser && (AppState.currentUser.role === 'Distributor' || (AppState.currentUser.role === 'SureWerx' && AppState.selectedDistributorId));
    var content = '';
    
    switch(tabName) {
      case 'groups':
        content = this.renderGroupsTab(customer);
        break;
      case 'employees':
        content = this.renderEmployeesTab(customer);
        break;
      case 'vouchers':
        content = this.renderVouchersTab(customer);
        break;
    }
    
    $('#customer-tab-content').html(content);
    
    // Initialize filter dropdowns after content is inserted into DOM
    if (tabName === 'groups') {
      var self = this;
      setTimeout(function() {
        self.initializeGroupFilters();
      }, 50);
    }
  },
  
  renderEmployeesTab: function(customer) {
    // Use enhanced template if available
    if (typeof Templates.renderEmployeesTabEnhanced === 'function') {
      return Templates.renderEmployeesTabEnhanced(customer);
    }
    
    // Fallback to basic template
    var self = this;
    var html = '<div class="row">';
    
    // Full width - Employees only
    html += '<div class="col-md-12">' +
      '<div class="mb-4">' +
      '<button class="btn btn-primary" id="add-employee-btn">' +
      '<span class="glyphicon glyphicon-plus"></span> Add Employee' +
      '</button> ' +
      '<button class="btn btn-primary" id="bulk-import-btn">' +
      '<span class="glyphicon glyphicon-import"></span> Import Employees' +
      '</button>' +
      '</div>';
    
    if (customer.employees.length > 0) {
      html += '<div class="table-responsive">' +
        '<table class="table table-hover">' +
        '<thead>' +
        '<tr>' +
        '<th>Name</th>' +
        (customer.employeeFieldConfig.requireEmployeeId ? '<th>Employee ID</th>' : '') +
        '<th>Group</th>' +
        '<th>Status</th>' +
        '<th>Notes</th>' +
        '<th>Actions</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>';
      
      customer.employees.forEach(function(emp) {
        var group = customer.groups.find(function(g) { return g.id === emp.groupId; });
        var isActive = emp.status !== 'inactive';
        html += '<tr' + (!isActive ? ' class="text-muted"' : '') + '>' +
          '<td>' + Helpers.escapeHtml(emp.name) + '</td>' +
          (customer.employeeFieldConfig.requireEmployeeId ? '<td>' + Helpers.escapeHtml(emp.employeeId || '') + '</td>' : '') +
          '<td>' + (group ? Helpers.escapeHtml(group.name) : '-') + '</td>' +
          '<td><span class="label label-' + (isActive ? 'success' : 'default') + '">' + (isActive ? 'Active' : 'Inactive') + '</span></td>' +
          '<td>' + (emp.notes ? Helpers.escapeHtml(emp.notes) : '-') + '</td>' +
          '<td>' +
          '<button class="btn btn-xs btn-default edit-employee-btn" data-employee-id="' + emp.id + '">' +
          '<span class="glyphicon glyphicon-pencil"></span>' +
          '</button> ' +
          '<button class="btn btn-xs btn-' + (isActive ? 'warning' : 'success') + ' toggle-employee-status-btn" data-employee-id="' + emp.id + '">' +
          '<span class="glyphicon glyphicon-' + (isActive ? 'ban-circle' : 'ok-circle') + '"></span> ' +
          (isActive ? 'Deactivate' : 'Activate') +
          '</button>' +
          '</td>' +
          '</tr>';
      });
      
      html += '</tbody></table></div>';
    } else {
      html += '<div class="alert alert-info">No employees added yet. Click "Add Employee" to get started.</div>';
    }
    
    html += '</div></div>';
    
    return html;
  },
  
  renderGroupsTab: function(customer) {
    var self = this;
    var isDistributor = AppState.currentUser && (AppState.currentUser.role === 'Distributor' || (AppState.currentUser.role === 'SureWerx' && AppState.selectedDistributorId));
    
    // Get unique values for filters
    var locationIds = [];
    var cities = [];
    var states = [];
    
    customer.groups.forEach(function(group) {
      if (group.locationId && locationIds.indexOf(group.locationId) === -1) {
        locationIds.push(group.locationId);
      }
      if (group.addressCity && cities.indexOf(group.addressCity) === -1) {
        cities.push(group.addressCity);
      }
      if (group.addressState && states.indexOf(group.addressState) === -1) {
        states.push(group.addressState);
      }
    });
    
    locationIds.sort();
    cities.sort();
    states.sort();
    
    var html = '<div class="row">' +
      '<div class="col-md-12">';
    
    // Help Section - Always show the same message about creating groups first
    html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
      '<div style="display: flex; align-items: start; gap: 15px;">' +
      '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
      '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
      '</div>' +
      '<div style="flex: 1;">' +
      '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">How User Groups Work</h4>' +
      '<p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
      'User groups allow you to organize employees and configure settings for multiple employees at once. ' +
      'Each group can have its own product visibility, vouchers, and payment options. ' +
      '<strong>You must create at least one user group before you can add employees.</strong> ' +
      'Create groups based on department, location, or any other criteria, then assign employees to those groups.' +
      '</p>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    html += '<div class="mb-4" style="display: flex; justify-content: space-between; align-items: center;">' +
      '<button class="btn btn-primary" id="create-group-btn">' +
      '<span class="glyphicon glyphicon-plus"></span> Create Group' +
      '</button>' +
      '</div>';
    
    // Filters
    html += '<div class="panel panel-default" style="margin-bottom: 20px;">' +
      '<div class="panel-heading">' +
      '<h4 class="panel-title">Filters</h4>' +
      '</div>' +
      '<div class="panel-body">' +
      '<div class="row">' +
      '<div class="col-md-4">' +
      '<div class="form-group">' +
      '<label>Location ID</label>' +
      '<select class="form-control" id="filter-group-location-id">' +
      '<option value="">All Location IDs</option>';
    locationIds.forEach(function(locationId) {
      html += '<option value="' + Helpers.escapeHtml(locationId) + '">' + Helpers.escapeHtml(locationId) + '</option>';
    });
    html += '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4">' +
      '<div class="form-group">' +
      '<label>Location City</label>' +
      '<select class="form-control" id="filter-group-location-city">' +
      '<option value="">All Cities</option>';
    cities.forEach(function(city) {
      html += '<option value="' + Helpers.escapeHtml(city) + '">' + Helpers.escapeHtml(city) + '</option>';
    });
    html += '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4">' +
      '<div class="form-group">' +
      '<label>Location State</label>' +
      '<select class="form-control" id="filter-group-location-state">' +
      '<option value="">All States</option>';
    states.forEach(function(state) {
      html += '<option value="' + Helpers.escapeHtml(state) + '">' + Helpers.escapeHtml(state) + '</option>';
    });
    html += '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="row" style="margin-top: 15px;">' +
      '<div class="col-md-12">' +
      '<button class="btn btn-primary" id="apply-group-filters-btn" style="margin-right: 10px;">' +
      '<span class="glyphicon glyphicon-filter"></span> Filter' +
      '</button>' +
      '<button class="btn btn-default" id="clear-group-filters-btn">' +
      '<span class="glyphicon glyphicon-remove"></span> Clear Filters' +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    html += '<div id="groups-list">';
    
    customer.groups.forEach(function(group) {
      var isSelected = self.selectedGroupId === group.id;
      
      // Build address string from new fields or use old locationAddress
      var addressStr = '';
      if (group.addressLine1) {
        addressStr = group.addressLine1;
        if (group.addressCity) addressStr += ', ' + group.addressCity;
        if (group.addressState) addressStr += ', ' + group.addressState;
        if (group.addressZip) addressStr += ' ' + group.addressZip;
      } else if (group.locationAddress) {
        addressStr = group.locationAddress;
      }
      
      html += '<div class="user-group-card ' + (isSelected ? 'selected' : '') + '" data-group-id="' + group.id + '" ' +
        'data-department="' + Helpers.escapeHtml(group.department || '') + '" ' +
        'data-location="' + Helpers.escapeHtml(group.location || '') + '" ' +
        'data-location-id="' + Helpers.escapeHtml(group.locationId || '') + '" ' +
        'data-location-city="' + Helpers.escapeHtml(group.addressCity || '') + '" ' +
        'data-location-state="' + Helpers.escapeHtml(group.addressState || '') + '" ' +
        'data-location-address="' + Helpers.escapeHtml(addressStr) + '" ' +
        'style="padding: 12px;">' +
        '<div class="group-header" style="margin-bottom: 8px;">' +
        '<h4 style="margin: 0; font-size: 15px; font-weight: 600;">' + Helpers.escapeHtml(group.name) + '</h4>' +
        '<div class="btn-group btn-group-xs">' +
        '<button class="btn btn-default edit-group-btn" data-group-id="' + group.id + '" style="padding: 3px 8px; background-color: transparent; border-color: transparent; color: #6b7280;" title="Edit Group">' +
        '<span class="glyphicon glyphicon-pencil"></span>' +
        '</button>' +
        '<button class="btn btn-default delete-group-btn" data-group-id="' + group.id + '" style="padding: 3px 8px; background-color: transparent; border-color: transparent; color: #dc2626;" title="Delete Group">' +
        '<span class="glyphicon glyphicon-trash"></span>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #6b7280;">' +
        (group.locationId ? '<div><strong>Location ID:</strong> ' + Helpers.escapeHtml(group.locationId) + '</div>' : '') +
        '<div><strong>Employees:</strong> ' + group.employeeCount + '</div>' +
        (group.location ? '<div><strong>Location:</strong> ' + Helpers.escapeHtml(group.location) + '</div>' : '') +
        (group.department ? '<div><strong>Department:</strong> ' + Helpers.escapeHtml(group.department) + '</div>' : '') +
        (group.addressLine1 ? '<div><strong>Address:</strong> ' + Helpers.escapeHtml(group.addressLine1) + 
          (group.addressCity ? ', ' + Helpers.escapeHtml(group.addressCity) : '') +
          (group.addressState ? ', ' + Helpers.escapeHtml(group.addressState) : '') +
          (group.addressZip ? ' ' + Helpers.escapeHtml(group.addressZip) : '') + '</div>' : 
          (group.locationAddress ? '<div><strong>Address:</strong> ' + Helpers.escapeHtml(group.locationAddress) + '</div>' : '')) +
        '</div>' +
        '</div>';
    });
    
    html += '</div></div>';
    
    return html;
  },
  
  filterUserGroups: function() {
    var locationId = $('#filter-group-location-id').val();
    var locationCity = $('#filter-group-location-city').val();
    var locationState = $('#filter-group-location-state').val();
    
    $('.user-group-card').each(function() {
      var $card = $(this);
      var cardLocationId = $card.data('location-id') || '';
      var cardLocationCity = $card.data('location-city') || '';
      var cardLocationState = $card.data('location-state') || '';
      
      var show = true;
      
      if (locationId && cardLocationId !== locationId) {
        show = false;
      }
      if (locationCity && cardLocationCity !== locationCity) {
        show = false;
      }
      if (locationState && cardLocationState !== locationState) {
        show = false;
      }
      
      if (show) {
        $card.show();
      } else {
        $card.hide();
      }
    });
  },
  
  initializeGroupFilters: function() {
    var self = this;
    
    // Handle filter button click
    $(document).on('click', '#apply-group-filters-btn', function() {
      self.filterUserGroups();
    });
    
    // Handle clear filters button click
    $(document).on('click', '#clear-group-filters-btn', function() {
      $('#filter-group-location-id').val('');
      $('#filter-group-location-city').val('');
      $('#filter-group-location-state').val('');
      self.filterUserGroups();
    });
  },
  
  renderVouchersTab: function(customer) {
    var self = this;
    var isDistributor = AppState.currentUser && (AppState.currentUser.role === 'Distributor' || (AppState.currentUser.role === 'SureWerx' && AppState.selectedDistributorId));
    var hasGroupsWithProducts = customer.groups.some(function(g) {
      return (g.productIds || []).length > 0;
    });
    var hasEmployees = customer.groups.some(function(g) {
      return g.employeeCount > 0;
    });
    
    var html = '<div class="row">' +
      '<div class="col-md-12">';
    
    // Help Section - Only visible for distributors
    if (isDistributor) {
      if (!hasEmployees) {
        // No employees
        html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
          '<div style="display: flex; align-items: start; gap: 15px;">' +
          '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
          '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
          '</div>' +
          '<div style="flex: 1;">' +
          '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">Create User Groups First</h4>' +
          '<p style="margin: 0 0 12px 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
          'Before creating vouchers, you need to create user groups in the User Groups tab. Once user groups are created, you can add employees to those groups and assign product visibility to enable voucher creation.' +
          '</p>' +
          '<button class="btn btn-sm btn-primary" onclick="CustomerDetailComponent.switchTab(\'groups\')">' +
          'Go to User Groups' +
          '</button>' +
          '</div>' +
          '</div>' +
          '</div>';
      } else if (!hasGroupsWithProducts) {
        // Has employees but no groups with products
        html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
          '<div style="display: flex; align-items: start; gap: 15px;">' +
          '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
          '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
          '</div>' +
          '<div style="flex: 1;">' +
          '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">Assign Products to User Groups</h4>' +
          '<p style="margin: 0 0 12px 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
          'Before creating vouchers, you need to assign product visibility to at least one user group. Go to the Employees & Groups section, edit a user group, and configure which products that group can access.' +
          '</p>' +
          '<button class="btn btn-sm btn-primary" onclick="CustomerDetailComponent.switchTab(\'groups\')">' +
          'Go to User Groups' +
          '</button>' +
          '</div>' +
          '</div>' +
          '</div>';
      } else {
        // Ready to create vouchers
        html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
          '<div style="display: flex; align-items: start; gap: 15px;">' +
          '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
          '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
          '</div>' +
          '<div style="flex: 1;">' +
          '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">Create Vouchers for User Groups</h4>' +
          '<p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
          'Vouchers define the allowance amounts, validity periods, and qualified products that user groups can access. Each voucher is assigned to a single user group and can be configured with auto-renewal and rollover settings.' +
          '</p>' +
          '</div>' +
          '</div>' +
          '</div>';
      }
    }
    
    html += '<div class="mb-4" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">' +
      (isDistributor ? 
        '<button class="btn btn-primary" id="create-voucher-btn"' +
        (!hasGroupsWithProducts ? ' disabled title="Add user groups with products first"' : '') + '>' +
        '<span class="glyphicon glyphicon-plus"></span> Create Voucher' +
        '</button>' : '') +
      (customer.vouchers.length > 0 ? 
        '<div style="margin-left: auto;">' +
        '<label for="voucher-status-filter" style="margin-right: 8px; font-weight: normal;">Filter by Status:</label>' +
        '<select class="form-control" id="voucher-status-filter" style="display: inline-block; width: auto; height: 32px; font-size: 13px;">' +
        '<option value="all"' + (this.voucherStatusFilter === 'all' ? ' selected' : '') + '>All Vouchers</option>' +
        '<option value="active"' + (this.voucherStatusFilter === 'active' ? ' selected' : '') + '>Active</option>' +
        '<option value="inactive"' + (this.voucherStatusFilter === 'inactive' ? ' selected' : '') + '>Inactive</option>' +
        '</select>' +
        '</div>' : '') +
      '</div>';
    
    if (customer.vouchers.length > 0) {
      // Filter vouchers by status
      var filteredVouchers = customer.vouchers.filter(function(voucher) {
        if (self.voucherStatusFilter === 'all') return true;
        if (self.voucherStatusFilter === 'active') return voucher.isActive;
        if (self.voucherStatusFilter === 'inactive') return !voucher.isActive;
        return true;
      });
      
      if (filteredVouchers.length === 0) {
        html += '<div class="alert alert-info">No vouchers found matching the selected filter.</div>';
      } else {
        html += '<div id="vouchers-list">';
        
        filteredVouchers.forEach(function(voucher) {
        // Get assigned user group
        var assignedGroup = null;
        if (voucher.userGroupIds && voucher.userGroupIds.length > 0) {
          assignedGroup = customer.groups.find(function(g) {
            return g.id === voucher.userGroupIds[0];
          });
        }
        
        html += '<div class="user-group-card" data-voucher-id="' + voucher.id + '" data-voucher-status="' + (voucher.isActive ? 'active' : 'inactive') + '" style="padding: 12px;' + (isDistributor ? '' : ' cursor: default;') + '">' +
          '<div class="group-header" style="margin-bottom: 8px;">' +
          '<h4 style="margin: 0; font-size: 15px; font-weight: 600;">' + Helpers.escapeHtml(voucher.name) + '</h4>' +
          (isDistributor ? 
            '<div class="btn-group btn-group-xs">' +
            '<button class="btn btn-default edit-voucher-btn" data-voucher-id="' + voucher.id + '" style="padding: 3px 8px; background-color: transparent; border-color: transparent; color: #6b7280;" title="Edit Voucher">' +
            '<span class="glyphicon glyphicon-pencil"></span>' +
            '</button>' +
            '</div>' : '') +
          '</div>' +
          '<div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #6b7280;">' +
          '<div>' +
          '<span class="label ' + (voucher.isActive ? 'label-success' : 'label-default') + '" style="font-size: 11px; padding: 2px 6px;">' +
          (voucher.isActive ? 'Active' : 'Inactive') +
          '</span>' +
          '</div>' +
          (assignedGroup ? 
            '<div><strong>Group:</strong> ' + Helpers.escapeHtml(assignedGroup.name) + ' (' + assignedGroup.employeeCount + ')</div>' : '') +
          '<div><strong>Amount:</strong> <span class="text-primary" style="font-weight: 600;">' + Helpers.formatCurrency(voucher.defaultAmount) + '</span></div>' +
          '<div><strong>Period:</strong> ' + Helpers.formatDate(voucher.startDate) + ' - ' + Helpers.formatDate(voucher.endDate) + '</div>' +
          '</div>' +
          (voucher.description ? '<div class="text-muted" style="margin-top: 6px; font-size: 12px; line-height: 1.4;">' + Helpers.escapeHtml(voucher.description) + '</div>' : '') +
          '</div>';
        });
        
        html += '</div>';
      }
    } else {
      html += '<div class="alert alert-info">No voucher programs configured yet.</div>';
    }
    
    html += '</div></div>';
    
    return html;
  },
  
  selectGroup: function(groupId) {
    this.selectedGroupId = groupId;
    $('.user-group-card').removeClass('selected');
    $('.user-group-card[data-group-id="' + groupId + '"]').addClass('selected');
  },
  
  showEditCustomerModal: function() {
    var customer = AppState.getCustomerById(this.customerId);
    // Navigate to customer form wizard in edit mode
    App.navigate('customer-form', { customerId: this.customerId });
  },
  
  showAddEmployeeModal: function() {
    var customer = AppState.getCustomerById(this.customerId);
    
    // Check if customer has any user groups
    if (!customer.groups || customer.groups.length === 0) {
      Helpers.showAlert('Please create at least one User Group before adding employees.', 'warning');
      // Switch to groups tab
      this.switchTab('groups');
      return;
    }
    
    Templates.showAddEmployeeModal(customer, this.customerId);
  },
  
  showCreateGroupModal: function() {
    var customer = AppState.getCustomerById(this.customerId);
    Templates.showCreateGroupModal(customer, this.customerId);
  },
  
  showEditGroupModal: function(groupId) {
    var customer = AppState.getCustomerById(this.customerId);
    var group = customer.groups.find(function(g) { return g.id === groupId; });
    if (group) {
      Templates.showEditGroupModal(customer, group, this.customerId);
    }
  },
  
  deleteGroup: function(groupId) {
    var self = this;
    var customer = AppState.getCustomerById(this.customerId);
    var group = customer.groups.find(function(g) { return g.id === groupId; });
    
    // Check if group has employees
    var employeeCount = customer.employees.filter(function(e) { return e.groupId === groupId; }).length;
    var message = 'Are you sure you want to delete "' + group.name + '"?';
    
    if (employeeCount > 0) {
      message += '\n\nWarning: This group currently has ' + employeeCount + ' employee(s). Deleting the group will remove group assignment from these employees.';
    }
    
    UIHelpers.showConfirmDialog({
      title: 'Delete User Group',
      message: message,
      confirmText: 'Delete Group',
      confirmClass: 'btn-danger',
      onConfirm: function() {
        UIHelpers.showLoadingSpinner('Deleting group...');
        
        setTimeout(function() {
          var updatedGroups = customer.groups.filter(function(g) { return g.id !== groupId; });
          
          // Remove group assignment from employees
          var updatedEmployees = customer.employees.map(function(e) {
            if (e.groupId === groupId) {
              return Object.assign({}, e, { groupId: null });
            }
            return e;
          });
          
          AppState.updateCustomer(self.customerId, { 
            groups: updatedGroups,
            employees: updatedEmployees
          });
          
          UIHelpers.hideLoadingSpinner();
          self.renderTabContent('employees');
          Helpers.showAlert('Group "' + group.name + '" deleted successfully', 'success');
        }, 500);
      }
    });
  },
  
  showCreateVoucherModal: function() {
    var customer = AppState.getCustomerById(this.customerId);
    
    // Check if customer has any user groups
    if (!customer.groups || customer.groups.length === 0) {
      Helpers.showAlert('Please create at least one User Group before creating vouchers.', 'warning');
      // Switch to groups tab
      this.switchTab('groups');
      return;
    }
    
    App.navigate('voucher-form', { customerId: this.customerId });
  },
  
  showEditVoucherModal: function(voucherId) {
    App.navigate('voucher-form', { customerId: this.customerId, voucherId: voucherId });
  },
  
  toggleVoucherStatus: function(voucherId, currentStatus) {
    var self = this;
    var customer = AppState.getCustomerById(this.customerId);
    var voucher = customer.vouchers.find(function(v) { return v.id === voucherId; });
    
    if (!voucher) return;
    
    var newStatus = !currentStatus;
    var statusText = newStatus ? 'activate' : 'deactivate';
    
    UIHelpers.showConfirmDialog({
      title: (newStatus ? 'Activate' : 'Deactivate') + ' Voucher',
      message: 'Are you sure you want to ' + statusText + ' the voucher "' + voucher.name + '"?',
      confirmText: (newStatus ? 'Activate' : 'Deactivate'),
      confirmClass: newStatus ? 'btn-success' : 'btn-warning',
      onConfirm: function() {
        // Update voucher status
        var updatedVouchers = customer.vouchers.map(function(v) {
          if (v.id === voucherId) {
            return Object.assign({}, v, { isActive: newStatus });
          }
          return v;
        });
        
        AppState.updateCustomer(self.customerId, {
          vouchers: updatedVouchers,
          activeVouchers: updatedVouchers.filter(function(v) { return v.isActive; }).length
        });
        
        // Re-render vouchers tab
        self.renderTabContent('vouchers');
        Helpers.showAlert('Voucher ' + statusText + 'd successfully', 'success');
      }
    });
  },
  
  deleteVoucher: function(voucherId) {
    var self = this;
    var customer = AppState.getCustomerById(this.customerId);
    var voucher = customer.vouchers.find(function(v) { return v.id === voucherId; });
    
    if (!voucher) return;
    
    // Check if voucher is assigned to any employees
    var affectedEmployees = customer.employees.filter(function(e) {
      return e.voucherBalances && e.voucherBalances.some(function(vb) {
        return vb.voucherId === voucherId;
      });
    }).length;
    
    var message = 'Are you sure you want to delete the voucher "' + voucher.name + '"?';
    
    if (affectedEmployees > 0) {
      message += '\n\nWarning: This voucher is currently assigned to ' + affectedEmployees + ' employee(s). Their voucher balances will be updated.';
    }
    
    UIHelpers.showConfirmDialog({
      title: 'Delete Voucher',
      message: message,
      confirmText: 'Delete Voucher',
      confirmClass: 'btn-danger',
      onConfirm: function() {
        UIHelpers.showLoadingSpinner('Deleting voucher...');
        
        setTimeout(function() {
          var updatedVouchers = customer.vouchers.filter(function(v) { return v.id !== voucherId; });
          
          // Update employee voucher balances
          var updatedEmployees = customer.employees.map(function(e) {
            if (e.voucherBalances) {
              var newBalances = e.voucherBalances.filter(function(vb) {
                return vb.voucherId !== voucherId;
              });
              var newTotal = newBalances.reduce(function(sum, vb) {
                return sum + vb.remainingAmount;
              }, 0);
              
              return Object.assign({}, e, {
                voucherBalances: newBalances,
                remainingBalance: newTotal
              });
            }
            return e;
          });
          
          AppState.updateCustomer(self.customerId, { 
            vouchers: updatedVouchers,
            employees: updatedEmployees,
            activeVouchers: updatedVouchers.filter(function(v) { return v.isActive; }).length
          });
          
          UIHelpers.hideLoadingSpinner();
          self.renderTabContent('vouchers');
          Helpers.showAlert('Voucher "' + voucher.name + '" deleted successfully', 'success');
        }, 500);
      }
    });
  },
  
  deleteEmployee: function(employeeId) {
    var self = this;
    var customer = AppState.getCustomerById(this.customerId);
    var employee = customer.employees.find(function(e) { return e.id === employeeId; });
    
    if (!employee) return;
    
    var employeeName = employee.firstName && employee.lastName 
      ? employee.firstName + ' ' + employee.lastName 
      : employee.name;
    
    UIHelpers.showConfirmDialog({
      title: 'Delete Employee',
      message: 'Are you sure you want to delete employee "' + employeeName + '"?\n\nThis action cannot be undone.',
      confirmText: 'Delete Employee',
      confirmClass: 'btn-danger',
      onConfirm: function() {
        UIHelpers.showLoadingSpinner('Deleting employee...');
        
        setTimeout(function() {
          var updatedEmployees = customer.employees.filter(function(e) { return e.id !== employeeId; });
          
          // Update employee counts in groups
          var updatedGroups = customer.groups.map(function(group) {
            var count = updatedEmployees.filter(function(e) { return e.groupId === group.id; }).length;
            return Object.assign({}, group, { employeeCount: count });
          });
          
          AppState.updateCustomer(self.customerId, { 
            employees: updatedEmployees,
            groups: updatedGroups,
            employeeCount: updatedEmployees.length
          });
          
          UIHelpers.hideLoadingSpinner();
          self.renderTabContent('employees');
          Helpers.showAlert('Employee "' + employeeName + '" deleted successfully', 'success');
        }, 500);
      }
    });
  },
  
  toggleEmployeeStatus: function(employeeId) {
    var self = this;
    var customer = AppState.getCustomerById(this.customerId);
    var employee = customer.employees.find(function(e) { return e.id === employeeId; });
    
    if (!employee) return;
    
    var newStatus = employee.status === 'active' ? 'inactive' : 'active';
    var employeeName = employee.firstName && employee.lastName 
      ? employee.firstName + ' ' + employee.lastName 
      : employee.name;
    
    UIHelpers.showConfirmDialog({
      title: 'Toggle Employee Status',
      message: 'Are you sure you want to ' + (newStatus === 'active' ? 'activate' : 'deactivate') + ' employee "' + employeeName + '"?',
      confirmText: 'Confirm',
      confirmClass: 'btn-' + (newStatus === 'active' ? 'success' : 'warning'),
      onConfirm: function() {
        UIHelpers.showLoadingSpinner('Updating employee status...');
        
        setTimeout(function() {
          var updatedEmployees = customer.employees.map(function(e) {
            if (e.id === employeeId) {
              return Object.assign({}, e, { status: newStatus });
            }
            return e;
          });
          
          AppState.updateCustomer(self.customerId, { 
            employees: updatedEmployees
          });
          
          UIHelpers.hideLoadingSpinner();
          self.renderTabContent('employees');
          Helpers.showAlert('Employee "' + employeeName + '" ' + (newStatus === 'active' ? 'activated' : 'deactivated') + ' successfully', 'success');
        }, 500);
      }
    });
  },
  
  showEditEmployeeModal: function(employeeId) {
    var customer = AppState.getCustomerById(this.customerId);
    var employee = customer.employees.find(function(e) { return e.id === employeeId; });
    if (employee) {
      Templates.showEditEmployeeModal(customer, employee, this.customerId);
    }
  },
  
  updateProductVisibility: function(productId, visible) {
    var customer = AppState.getCustomerById(this.customerId);
    var updatedProducts = customer.availableProducts.map(function(p) {
      if (p.id === productId) {
        return Object.assign({}, p, { visible: visible });
      }
      return p;
    });
    
    AppState.updateCustomer(this.customerId, { availableProducts: updatedProducts });
    Helpers.showAlert('Product visibility updated', 'success');
  }
};
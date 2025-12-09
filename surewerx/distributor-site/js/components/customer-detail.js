// Customer Detail Component

var CustomerDetailComponent = {
  customerId: null,
  currentTab: 'locations',
  departmentLocationFilter: null, // Store selected location filter
  locationFilter: null, // Store location filter for locations tab
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
    this.currentTab = tab || 'locations'; // Default to locations tab
    this.selectedGroupId = null;
    this.departmentLocationFilter = null; // Reset location filter
    this.locationFilter = null; // Reset location filter
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
    
    // Create location button
    $(document).on('click', '#add-location-btn', function() {
      self.showLocationModal(null);
    });
    
    // Edit location button
    $(document).on('click', '.edit-location-btn', function() {
      var locationId = $(this).data('location-id');
      self.showLocationModal(locationId);
    });
    
    // Delete location button
    $(document).on('click', '.delete-location-btn', function() {
      var locationId = $(this).data('location-id');
      self.deleteLocation(locationId);
    });

    // Click on location row to edit location (similar UX to departments)
    $(document).on('click', '.location-row', function(e) {
      // Don't trigger when clicking on action buttons or links inside the row
      if ($(e.target).closest('button, .btn, a').length > 0) {
        return;
      }

      var locationId = $(this).data('location-id');
      if (locationId) {
        self.showLocationModal(locationId);
      }
    });
    
    // Create department button
    $(document).on('click', '#create-department-btn', function() {
      self.showDepartmentModal(null, null);
    });
    
    // Legacy support
    $(document).on('click', '#create-group-btn', function() {
      self.showDepartmentModal(null, null);
    });
    
    // Edit department name button
    $(document).on('click', '.edit-department-name-btn', function(e) {
      e.stopPropagation();
      var departmentId = $(this).data('department-id');
      var locationId = $(this).data('location-id');
      self.showDepartmentModal(locationId, departmentId);
    });
    
    // Manage product visibility button
    $(document).on('click', '.manage-product-visibility-btn', function(e) {
      e.stopPropagation();
      var departmentId = $(this).data('department-id');
      var locationId = $(this).data('location-id');
      App.navigate('group-product-visibility', { 
        customerId: self.customerId, 
        groupId: departmentId,
        locationId: locationId
      });
    });
    
    // Legacy support for old edit-department-btn class
    $(document).on('click', '.edit-department-btn', function(e) {
      e.stopPropagation();
      var departmentId = $(this).data('department-id');
      var locationId = $(this).data('location-id');
      self.showDepartmentModal(locationId, departmentId);
    });
    
    // Delete department button
    $(document).on('click', '.delete-department-btn', function(e) {
      e.stopPropagation();
      var departmentId = $(this).data('department-id');
      var locationId = $(this).data('location-id');
      self.deleteDepartment(locationId, departmentId);
    });
    
    // Click on department row to navigate to product visibility
    $(document).on('click', '.selectable-row[data-department-id]', function(e) {
      // Don't trigger if clicking on a button or action element
      if ($(e.target).closest('button, .btn, a').length > 0) {
        return;
      }
      
      var $row = $(this);
      var departmentId = $row.data('department-id');
      var locationId = $row.data('location-id');
      
      // Navigate to product visibility
      App.navigate('group-product-visibility', { 
        customerId: self.customerId, 
        groupId: departmentId,
        locationId: locationId
      });
    });
    
    // Legacy support for old group buttons
    $(document).on('click', '.edit-group-btn', function(e) {
      e.stopPropagation();
      var groupId = $(this).data('group-id');
      // Try to find department in new structure
      var department = AppState.getDepartmentById(self.customerId, groupId);
      if (department) {
        // Find which location contains this department
        var customer = AppState.getCustomerById(self.customerId);
        if (customer && customer.locations) {
          for (var i = 0; i < customer.locations.length; i++) {
            var loc = customer.locations[i];
            if (loc.departments && loc.departments.find(function(d) { return d.id === groupId; })) {
              self.showDepartmentModal(loc.id, groupId);
              return;
            }
          }
        }
      }
      // Fallback to old navigation
      App.navigate('customer-group-form', { customerId: self.customerId, groupId: groupId });
    });
    
    $(document).on('click', '.delete-group-btn', function(e) {
      e.stopPropagation();
      var groupId = $(this).data('group-id');
      // Try to find and delete in new structure
      var customer = AppState.getCustomerById(self.customerId);
      if (customer && customer.locations) {
        for (var i = 0; i < customer.locations.length; i++) {
          var loc = customer.locations[i];
          if (loc.departments && loc.departments.find(function(d) { return d.id === groupId; })) {
            self.deleteDepartment(loc.id, groupId);
            return;
          }
        }
      }
      // Fallback to old delete
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
        // Navigate to edit department page
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

    // Click on voucher row to edit voucher (similar UX to departments)
    $(document).on('click', '.voucher-row', function(e) {
      // Customers view vouchers read-only; disable row click for them
      if (AppState.currentUser && AppState.currentUser.role === 'Customer') {
        return;
      }
      // Don't trigger when clicking on action buttons or links inside the row
      if ($(e.target).closest('button, .btn, a').length > 0) {
        return;
      }

      var voucherId = $(this).data('voucher-id');
      if (voucherId) {
        self.showEditVoucherModal(voucherId);
      }
    });
    
    // Voucher status filter
    $(document).on('change', '#voucher-status-filter', function() {
      self.voucherStatusFilter = $(this).val();
      self.renderTabContent('vouchers');
    });
    
    // Department filter typeaheads will be initialized after render
    
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
    
    // Employee search
    $(document).on('click', '#search-employees-btn', function() {
      EmployeeTableEnhanced.searchTerm = $('#employee-search').val();
      self.renderTabContent('employees');
    });
    
    $(document).on('keypress', '#employee-search', function(e) {
      if (e.which === 13) {
        e.preventDefault();
        EmployeeTableEnhanced.searchTerm = $(this).val();
        self.renderTabContent('employees');
      }
    });
    
    // Department location filter - search as you type
    var locationFilterTimeout;
    $(document).on('input', '#department-location-filter', function() {
      var $input = $(this);
      var searchTerm = $input.val().trim();
      self.departmentLocationFilter = searchTerm || null;
      
      // Debounce the filter to avoid too many re-renders
      clearTimeout(locationFilterTimeout);
      locationFilterTimeout = setTimeout(function() {
        // Store cursor position before re-render
        var cursorPos = $input[0].selectionStart;
        self.renderTabContent('departments');
        // Restore focus and cursor position after render
        setTimeout(function() {
          var $newInput = $('#department-location-filter');
          if ($newInput.length) {
            $newInput.focus();
            if ($newInput[0].setSelectionRange) {
              $newInput[0].setSelectionRange(cursorPos, cursorPos);
            }
          }
        }, 10);
      }, 300);
    });
    
    // Clear location filter button (for departments)
    $(document).on('click', '#clear-location-filter-btn', function() {
      if ($(this).closest('#departments-tab-content').length > 0 || $(this).closest('[data-tab="departments"]').length > 0) {
        // This is the departments filter clear button
        $('#department-location-filter').val('');
        self.departmentLocationFilter = null;
        self.renderTabContent('departments');
      } else {
        // This is the locations filter clear button
        $('#location-filter').val('');
        self.locationFilter = null;
        self.renderTabContent('locations');
      }
    });
    
    // Location filter - search as you type (for locations tab)
    var locationFilterTimeout;
    $(document).on('input', '#location-filter', function() {
      var $input = $(this);
      var searchTerm = $input.val().trim();
      self.locationFilter = searchTerm || null;
      
      // Debounce the filter to avoid too many re-renders
      clearTimeout(locationFilterTimeout);
      locationFilterTimeout = setTimeout(function() {
        // Store cursor position before re-render
        var cursorPos = $input[0].selectionStart;
        self.renderTabContent('locations');
        // Restore focus and cursor position after render
        setTimeout(function() {
          var $newInput = $('#location-filter');
          if ($newInput.length) {
            $newInput.focus();
            if ($newInput[0].setSelectionRange) {
              $newInput[0].setSelectionRange(cursorPos, cursorPos);
            }
          }
        }, 50);
      }, 300);
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
      case 'locations':
        content = this.renderLocationsTab(customer);
        break;
      case 'departments':
        content = this.renderDepartmentsTab(customer);
        break;
      case 'groups':
        content = this.renderDepartmentsTab(customer); // Legacy support
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
        '<th>Department</th>' +
        '<th>Status</th>' +
        '<th>Notes</th>' +
        '<th>Actions</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>';
      
      customer.employees.forEach(function(emp) {
        // Try to find department in new structure first
        var department = null;
        var departmentName = '-';
        if (emp.departmentId && emp.locationId && customer.locations) {
          var location = customer.locations.find(function(l) { return l.id === emp.locationId; });
          if (location && location.departments) {
            department = location.departments.find(function(d) { return d.id === emp.departmentId; });
          }
        }
        // Fallback to old group structure
        if (!department && emp.groupId && customer.groups) {
        var group = customer.groups.find(function(g) { return g.id === emp.groupId; });
          if (group) {
            departmentName = Helpers.escapeHtml(group.name);
          }
        } else if (department) {
          var location = customer.locations.find(function(l) { return l.id === emp.locationId; });
          departmentName = (location ? Helpers.escapeHtml(location.locationId || 'Unnamed') + ' - ' : '') + 
            Helpers.escapeHtml(department.name);
        }
        
        var isActive = emp.status !== 'inactive';
        html += '<tr' + (!isActive ? ' class="text-muted"' : '') + '>' +
          '<td>' + Helpers.escapeHtml(emp.name) + '</td>' +
          (customer.employeeFieldConfig.requireEmployeeId ? '<td>' + Helpers.escapeHtml(emp.employeeId || '') + '</td>' : '') +
          '<td>' + departmentName + '</td>' +
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
      '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">How Departments Work</h4>' +
      '<p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
      'Departments allow you to organize employees and configure settings for multiple employees at once. ' +
      'Each department can have its own product visibility, vouchers, and payment options. ' +
      '<strong>You must create at least one department before you can add employees.</strong> ' +
      'Create departments based on organizational structure, location, or any other criteria, then assign employees to those departments.' +
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
  
  renderLocationsTab: function(customer) {
    var self = this;
    var isDistributor = AppState.currentUser && (AppState.currentUser.role === 'Distributor' || (AppState.currentUser.role === 'SureWerx' && AppState.selectedDistributorId));
    
    // Get locations from customer (initialize if not exists)
    var locations = customer.locations || [];
    
    // Get distributor branches for assignment
    var distributorBranches = AppState.branchLocations || [];
    
    var html = '<div class="row">' +
      '<div class="col-md-12">' +
      // Help / info section for locations (similar styling to departments help)
      '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
      '<div style="display: flex; align-items: start; gap: 15px;">' +
      '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
      '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
      '</div>' +
      '<div style="flex: 1;">' +
      '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">How Locations Work</h4>' +
      '<p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
      'Locations represent physical sites (branches, plants, facilities) where your employees work. ' +
      'Each location can be assigned to a distributor branch and can contain multiple departments. ' +
      'Create locations first, then add departments within each location to organize employees and configure product visibility and vouchers.' +
      '</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      // Filter and actions row
      '<div class="mb-4" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">' +
      '<div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 300px;">' +
      '<label for="location-filter" style="margin: 0; font-weight: 500; white-space: nowrap;">Filter by Location:</label>' +
      '<div style="position: relative; flex: 1; max-width: 400px;">' +
      '<input type="text" class="form-control" id="location-filter" placeholder="Search by location ID, address, city, state, or branch..." value="' + Helpers.escapeHtml(self.locationFilter || '') + '" autocomplete="off">' +
      '<span class="glyphicon glyphicon-search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; pointer-events: none;"></span>' +
      '</div>' +
      (this.locationFilter ? 
        '<button class="btn btn-xs btn-default" id="clear-location-filter-btn" title="Clear filter" style="padding: 5px 10px;">' +
        '<span class="glyphicon glyphicon-remove"></span>' +
        '</button>' : '') +
      '</div>' +
      '<button class="btn btn-primary" id="add-location-btn">' +
      '<span class="glyphicon glyphicon-plus"></span> Add Location' +
      '</button>' +
      '</div>';
    
    // Filter locations based on search term
    var filteredLocations = locations;
    if (this.locationFilter) {
      var searchTerm = this.locationFilter.toLowerCase();
      filteredLocations = locations.filter(function(loc) {
        var locationId = (loc.locationId || '').toLowerCase();
        var address = (loc.address || '').toLowerCase();
        var city = (loc.city || '').toLowerCase();
        var state = (loc.state || '').toLowerCase();
        
        // Also search by distributor branch name
        var branchName = 'Not Assigned';
        if (loc.distributorBranchId) {
          var branch = distributorBranches.find(function(b) { return b.id === loc.distributorBranchId; });
          if (branch) {
            branchName = (branch.branchId || '') + ' ' + (branch.branchAddress || '');
          }
        }
        branchName = branchName.toLowerCase();
        
        return locationId.indexOf(searchTerm) > -1 ||
               address.indexOf(searchTerm) > -1 ||
               city.indexOf(searchTerm) > -1 ||
               state.indexOf(searchTerm) > -1 ||
               branchName.indexOf(searchTerm) > -1;
      });
    }
    
    if (filteredLocations.length === 0 && locations.length > 0) {
      html += '<div class="alert alert-info">No locations found matching your search.</div>';
    } else if (locations.length === 0) {
      html += '<div class="alert alert-info">' +
        '<p>No locations have been added yet. Click "Add Location" to create the first location.</p>' +
        '</div>';
    } else {
      html += '<div class="table-responsive">' +
        '<table class="table table-striped table-bordered">' +
        '<thead>' +
        '<tr>' +
        '<th>Location ID</th>' +
        '<th>Address</th>' +
        '<th>City</th>' +
        '<th>State</th>' +
        '<th>Distributor Branch</th>' +
        '<th>Departments</th>' +
        '<th style="width: 120px;">Actions</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>';
      
      filteredLocations.forEach(function(location) {
        // Count departments in this location
        var departmentCount = (location.departments || []).length;
        
        // Get distributor branch name
        var branchName = 'Not Assigned';
        if (location.distributorBranchId) {
          var branch = distributorBranches.find(function(b) { return b.id === location.distributorBranchId; });
          if (branch) {
            branchName = branch.branchId + ' - ' + branch.branchAddress;
          }
        }
        
        html += '<tr class="location-row selectable-row" data-location-id="' + location.id + '" style="cursor: pointer;">' +
          '<td><strong>' + Helpers.escapeHtml(location.locationId || '') + '</strong></td>' +
          '<td>' + Helpers.escapeHtml(location.address || '') + '</td>' +
          '<td>' + Helpers.escapeHtml(location.city || '') + '</td>' +
          '<td>' + Helpers.escapeHtml(location.state || '') + '</td>' +
          '<td>' + Helpers.escapeHtml(branchName) + '</td>' +
          '<td>' + departmentCount + ' department' + (departmentCount !== 1 ? 's' : '') + '</td>' +
          '<td>' +
          '<button type="button" class="btn btn-xs btn-default edit-location-btn" data-location-id="' + location.id + '" title="Edit">' +
          '<span class="glyphicon glyphicon-pencil"></span>' +
          '</button> ' +
          '<button type="button" class="btn btn-xs btn-danger delete-location-btn" data-location-id="' + location.id + '" title="Delete">' +
          '<span class="glyphicon glyphicon-trash"></span>' +
          '</button>' +
          '</td>' +
          '</tr>';
      });
      
      html += '</tbody></table></div>';
    }
    
    html += '</div></div>';
    
    return html;
  },
  
  renderDepartmentsTab: function(customer) {
    var self = this;
    var isDistributor = AppState.currentUser && (AppState.currentUser.role === 'Distributor' || (AppState.currentUser.role === 'SureWerx' && AppState.selectedDistributorId));
    
    // Get locations
    var locations = customer.locations || [];
    
    var html = '<div class="row">' +
      '<div class="col-md-12">' +
      '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
      '<div style="display: flex; align-items: start; gap: 15px;">' +
      '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
      '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
      '</div>' +
      '<div style="flex: 1;">' +
      '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">How Departments Work</h4>' +
      '<p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
      'Departments are organized within Locations. Each location can have multiple departments. ' +
      'Departments allow you to organize employees and configure settings for multiple employees at once. ' +
      'Each department can have its own product visibility, vouchers, and payment options. ' +
      '<strong>You must create at least one location and one department before you can add employees.</strong> ' +
      'Create departments based on organizational structure, then assign employees to those departments.' +
      '</p>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    if (locations.length === 0) {
      html += '<div class="alert alert-warning">' +
        '<p><strong>No locations found.</strong> Please create at least one location in the Locations tab before creating departments.</p>' +
        '</div>';
    } else {
      html += '<div class="mb-4" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">' +
        '<div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 300px;">' +
        '<label for="department-location-filter" style="margin: 0; font-weight: 500; white-space: nowrap;">Filter by Location:</label>' +
        '<div style="position: relative; flex: 1; max-width: 400px;">' +
        '<input type="text" class="form-control" id="department-location-filter" placeholder="Search by location ID, address, city, or state..." value="' + Helpers.escapeHtml(self.departmentLocationFilter || '') + '" autocomplete="off">' +
        '<span class="glyphicon glyphicon-search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; pointer-events: none;"></span>' +
        '</div>' +
        (this.departmentLocationFilter ? 
          '<button class="btn btn-xs btn-default" id="clear-location-filter-btn" title="Clear filter" style="padding: 5px 10px;">' +
          '<span class="glyphicon glyphicon-remove"></span>' +
          '</button>' : '') +
        '</div>' +
        '<button class="btn btn-primary" id="create-department-btn">' +
        '<span class="glyphicon glyphicon-plus"></span> Create Department' +
        '</button>' +
        '</div>';
      
      // Filter locations based on search term
      var filteredLocations = locations;
      if (this.departmentLocationFilter) {
        var searchTerm = this.departmentLocationFilter.toLowerCase();
        filteredLocations = locations.filter(function(loc) {
          var locationId = (loc.locationId || '').toLowerCase();
          var address = (loc.address || '').toLowerCase();
          var city = (loc.city || '').toLowerCase();
          var state = (loc.state || '').toLowerCase();
          return locationId.indexOf(searchTerm) > -1 ||
                 address.indexOf(searchTerm) > -1 ||
                 city.indexOf(searchTerm) > -1 ||
                 state.indexOf(searchTerm) > -1;
        });
      }
      
      // Collect all departments from filtered locations for table display
      var allDepartments = [];
      filteredLocations.forEach(function(location) {
        var departments = location.departments || [];
        departments.forEach(function(department) {
          allDepartments.push({
            department: department,
            location: location
          });
        });
      });
      
      if (allDepartments.length === 0) {
        html += '<div class="alert alert-info">' +
          '<p>No departments found. Click "Create Department" to add departments to your locations.</p>' +
          '</div>';
      } else {
        html += '<div class="table-responsive">' +
          '<table class="table table-striped table-bordered">' +
          '<thead>' +
          '<tr>' +
          '<th>Department Name</th>' +
          '<th>Location ID</th>' +
          '<th>Location Address</th>' +
          '<th>City</th>' +
          '<th>State</th>' +
          '<th>Products</th>' +
          '<th style="width: 200px;">Actions</th>' +
          '</tr>' +
          '</thead>' +
          '<tbody>';
        
        allDepartments.forEach(function(item) {
          var department = item.department;
          var location = item.location;
          
          // Count products assigned to this department
          var productCount = (department.productIds && Array.isArray(department.productIds)) ? department.productIds.length : 0;
          
          html += '<tr class="selectable-row" data-department-id="' + department.id + '" data-location-id="' + location.id + '" style="cursor: pointer;">' +
            '<td><strong>' + Helpers.escapeHtml(department.name || 'Unnamed Department') + '</strong></td>' +
            '<td>' + Helpers.escapeHtml(location.locationId || '') + '</td>' +
            '<td>' + Helpers.escapeHtml(location.address || '') + '</td>' +
            '<td>' + Helpers.escapeHtml(location.city || '') + '</td>' +
            '<td>' + Helpers.escapeHtml(location.state || '') + '</td>' +
            '<td>' + productCount + ' product' + (productCount !== 1 ? 's' : '') + '</td>' +
            '<td>' +
            '<button type="button" class="btn btn-xs btn-default edit-department-name-btn" data-department-id="' + department.id + '" data-location-id="' + location.id + '" title="Edit Department">' +
            '<span class="glyphicon glyphicon-pencil"></span>' +
            '</button> ' +
            '<button type="button" class="btn btn-xs btn-primary manage-product-visibility-btn" data-department-id="' + department.id + '" data-location-id="' + location.id + '" title="Manage Product Visibility">' +
            'Product Visibility' +
            '</button> ' +
            '<button type="button" class="btn btn-xs btn-danger delete-department-btn" data-department-id="' + department.id + '" data-location-id="' + location.id + '" title="Delete Department">' +
            '<span class="glyphicon glyphicon-trash"></span>' +
            '</button>' +
            '</td>' +
            '</tr>';
        });
        
        html += '</tbody></table></div>';
      }
    }
    
    html += '</div></div>';
    
    return html;
  },
  
  showLocationModal: function(locationId) {
    var self = this;
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) return;
    
    var location = null;
    var isEdit = !!locationId;
    
    if (isEdit) {
      location = (customer.locations || []).find(function(l) { return l.id === locationId; });
      if (!location) {
        Helpers.showAlert('Location not found', 'danger');
        return;
      }
    }
    
    // Get distributor branches
    var distributorBranches = AppState.branchLocations || [];
    
    // Remove existing modal if present
    $('#location-modal').remove();
    
    var branchOptions = '<option value="">Not Assigned</option>';
    distributorBranches.forEach(function(branch) {
      var selected = (isEdit && location.distributorBranchId === branch.id) ? ' selected' : '';
      branchOptions += '<option value="' + branch.id + '"' + selected + '>' + 
        Helpers.escapeHtml(branch.branchId) + ' - ' + Helpers.escapeHtml(branch.branchAddress) + '</option>';
    });
    
    var modalHtml = '<div class="modal fade" id="location-modal" tabindex="-1" role="dialog">' +
      '<div class="modal-dialog" role="document">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span>' +
      '</button>' +
      '<h4 class="modal-title">' + (isEdit ? 'Edit Location' : 'Add Location') + '</h4>' +
      '</div>' +
      '<form id="location-form">' +
      '<div class="modal-body">' +
      '<div class="form-group">' +
      '<label for="modal-location-id">Location ID *</label>' +
      '<input type="text" class="form-control" id="modal-location-id" value="' + (location ? Helpers.escapeHtml(location.locationId || '') : '') + '" placeholder="Enter location ID" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="modal-location-address">Address *</label>' +
      '<input type="text" class="form-control" id="modal-location-address" value="' + (location ? Helpers.escapeHtml(location.address || '') : '') + '" placeholder="Enter address" required>' +
      '</div>' +
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label for="modal-location-city">City *</label>' +
      '<input type="text" class="form-control" id="modal-location-city" value="' + (location ? Helpers.escapeHtml(location.city || '') : '') + '" placeholder="Enter city" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label for="modal-location-state">State *</label>' +
      '<input type="text" class="form-control" id="modal-location-state" value="' + (location ? Helpers.escapeHtml(location.state || '') : '') + '" placeholder="Enter state" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="modal-distributor-branch">Distributor Branch</label>' +
      '<select class="form-control" id="modal-distributor-branch">' +
      branchOptions +
      '</select>' +
      '<p class="help-block">Assign this location to a distributor branch</p>' +
      '</div>' +
      '<hr>' +
      '<h5 style="margin-bottom: 15px;">Contact Information (Optional)</h5>' +
      '<div class="form-group">' +
      '<label for="modal-location-contact-name">Contact Name</label>' +
      '<input type="text" class="form-control" id="modal-location-contact-name" value="' + (location ? Helpers.escapeHtml(location.contactName || '') : '') + '" placeholder="Enter contact name">' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="modal-location-contact-email">Contact Email</label>' +
      '<input type="email" class="form-control" id="modal-location-contact-email" value="' + (location ? Helpers.escapeHtml(location.contactEmail || '') : '') + '" placeholder="Enter contact email">' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="modal-location-contact-phone">Contact Phone</label>' +
      '<input type="tel" class="form-control" id="modal-location-contact-phone" value="' + (location ? Helpers.escapeHtml(location.contactPhone || '') : '') + '" placeholder="Enter contact phone">' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Update Location' : 'Add Location') + '</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    
    // Handle form submit
    $(document).off('submit', '#location-form').on('submit', '#location-form', function(e) {
      e.preventDefault();
      var locationIdValue = $('#modal-location-id').val();
      var address = $('#modal-location-address').val();
      var city = $('#modal-location-city').val();
      var state = $('#modal-location-state').val();
      var distributorBranchId = $('#modal-distributor-branch').val() || null;
      var contactName = $('#modal-location-contact-name').val().trim() || null;
      var contactEmail = $('#modal-location-contact-email').val().trim() || null;
      var contactPhone = $('#modal-location-contact-phone').val().trim() || null;
      
      if (isEdit) {
        self.handleUpdateLocation(locationId, locationIdValue, address, city, state, distributorBranchId, contactName, contactEmail, contactPhone);
      } else {
        self.handleAddLocation(locationIdValue, address, city, state, distributorBranchId, contactName, contactEmail, contactPhone);
      }
      
      $('#location-modal').modal('hide');
    });
    
    // Cleanup on hide
    $('#location-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
    
    // Show modal
    $('#location-modal').modal('show');
  },
  
  handleAddLocation: function(locationId, address, city, state, distributorBranchId, contactName, contactEmail, contactPhone) {
    if (!locationId || !address || !city || !state) {
      Helpers.showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) return;
    
    var newLocation = {
      id: Helpers.generateId(),
      locationId: locationId.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      distributorBranchId: distributorBranchId || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      departments: []
    };
    
    if (!customer.locations) {
      customer.locations = [];
    }
    customer.locations.push(newLocation);
    AppState.updateCustomer(this.customerId, { locations: customer.locations });
    
    Helpers.showAlert('Location added successfully', 'success');
    this.renderTabContent('locations');
  },
  
  handleUpdateLocation: function(locationId, locationIdValue, address, city, state, distributorBranchId, contactName, contactEmail, contactPhone) {
    if (!locationIdValue || !address || !city || !state) {
      Helpers.showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) return;
    
    var location = (customer.locations || []).find(function(l) { return l.id === locationId; });
    if (location) {
      location.locationId = locationIdValue.trim();
      location.address = address.trim();
      location.city = city.trim();
      location.state = state.trim();
      location.distributorBranchId = distributorBranchId || null;
      location.contactName = contactName || null;
      location.contactEmail = contactEmail || null;
      location.contactPhone = contactPhone || null;
      
      AppState.updateCustomer(this.customerId, { locations: customer.locations });
      Helpers.showAlert('Location updated successfully', 'success');
    }
    
    this.renderTabContent('locations');
  },
  
  deleteLocation: function(locationId) {
    if (!confirm('Are you sure you want to delete this location? All departments and employees in this location will also be deleted.')) {
      return;
    }
    
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) return;
    
    customer.locations = (customer.locations || []).filter(function(l) { return l.id !== locationId; });
    AppState.updateCustomer(this.customerId, { locations: customer.locations });
    
    Helpers.showAlert('Location deleted successfully', 'success');
    this.renderTabContent('locations');
  },
  
  showDepartmentModal: function(locationId, departmentId) {
    var self = this;
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) return;
    
    var department = null;
    var isEdit = !!departmentId;
    var locations = customer.locations || [];
    
    if (isEdit && locationId) {
      var location = locations.find(function(l) { return l.id === locationId; });
      if (location && location.departments) {
        department = location.departments.find(function(d) { return d.id === departmentId; });
      }
      if (!department) {
        Helpers.showAlert('Department not found', 'danger');
        return;
      }
    }
    
    if (locations.length === 0) {
      Helpers.showAlert('Please create at least one location before creating departments', 'warning');
      return;
    }
    
    // Remove existing modal if present
    $('#department-modal').remove();
    
    var locationOptions = '';
    locations.forEach(function(loc) {
      var selected = '';
      if (isEdit && locationId === loc.id) {
        selected = ' selected';
      } else if (!isEdit && !locationId && locations.length === 1) {
        selected = ' selected';
      } else if (!isEdit && locationId === loc.id) {
        selected = ' selected';
      }
      locationOptions += '<option value="' + loc.id + '"' + selected + '>' + 
        Helpers.escapeHtml(loc.locationId || 'Unnamed') + ' - ' + 
        Helpers.escapeHtml(loc.address || '') + ', ' + 
        Helpers.escapeHtml(loc.city || '') + ', ' + 
        Helpers.escapeHtml(loc.state || '') + '</option>';
    });
    
    var modalHtml = '<div class="modal fade" id="department-modal" tabindex="-1" role="dialog">' +
      '<div class="modal-dialog modal-lg" role="document">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span>' +
      '</button>' +
      '<h4 class="modal-title">' + (isEdit ? 'Edit Department' : 'Create Department') + '</h4>' +
      '</div>' +
      '<form id="department-form">' +
      '<div class="modal-body">' +
      '<div class="form-group">' +
      '<label for="modal-department-location">Location *</label>' +
      '<select class="form-control" id="modal-department-location" required' + (isEdit ? ' disabled' : '') + '>' +
      locationOptions +
      '</select>' +
      (isEdit ? '<p class="help-block">Location cannot be changed after creation</p>' : '<p class="help-block">Select the location for this department</p>') +
      '</div>' +
      '<div class="form-group">' +
      '<label for="modal-department-name">Department Name *</label>' +
      '<input type="text" class="form-control" id="modal-department-name" value="' + (department ? Helpers.escapeHtml(department.name || '') : '') + '" placeholder="Enter department name" required>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Update Department' : 'Create Department') + '</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    
    // Handle form submit
    $(document).off('submit', '#department-form').on('submit', '#department-form', function(e) {
      e.preventDefault();
      var selectedLocationId = $('#modal-department-location').val();
      var departmentName = $('#modal-department-name').val();
      
      if (!selectedLocationId || !departmentName) {
        Helpers.showAlert('Please fill in all required fields', 'warning');
        return;
      }
      
      if (isEdit) {
        self.handleUpdateDepartment(locationId, departmentId, departmentName);
      } else {
        self.handleAddDepartment(selectedLocationId, departmentName);
      }
      
      $('#department-modal').modal('hide');
    });
    
    // Cleanup on hide
    $('#department-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
    
    // Show modal
    $('#department-modal').modal('show');
  },
  
  handleAddDepartment: function(locationId, departmentName) {
    if (!locationId || !departmentName) {
      Helpers.showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) return;
    
    var location = (customer.locations || []).find(function(l) { return l.id === locationId; });
    if (!location) {
      Helpers.showAlert('Location not found', 'danger');
      return;
    }
    
    if (!location.departments) {
      location.departments = [];
    }
    
    var newDepartment = {
      id: Helpers.generateId(),
      name: departmentName.trim(),
      employeeCount: 0,
      productIds: [],
      employees: []
    };
    
    location.departments.push(newDepartment);
    AppState.updateCustomer(this.customerId, { locations: customer.locations });
    
    Helpers.showAlert('Department created successfully', 'success');
    this.renderTabContent('departments');
  },
  
  handleUpdateDepartment: function(locationId, departmentId, departmentName) {
    if (!departmentName) {
      Helpers.showAlert('Please fill in department name', 'warning');
      return;
    }
    
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) return;
    
    var location = (customer.locations || []).find(function(l) { return l.id === locationId; });
    if (!location || !location.departments) {
      Helpers.showAlert('Location or department not found', 'danger');
      return;
    }
    
    var department = location.departments.find(function(d) { return d.id === departmentId; });
    if (department) {
      department.name = departmentName.trim();
      AppState.updateCustomer(this.customerId, { locations: customer.locations });
      Helpers.showAlert('Department updated successfully', 'success');
    }
    
    this.renderTabContent('departments');
  },
  
  deleteDepartment: function(locationId, departmentId) {
    if (!confirm('Are you sure you want to delete this department? All employees in this department will also be deleted.')) {
      return;
    }
    
    var customer = AppState.getCustomerById(this.customerId);
    if (!customer) return;
    
    var location = (customer.locations || []).find(function(l) { return l.id === locationId; });
    if (location && location.departments) {
      location.departments = location.departments.filter(function(d) { return d.id !== departmentId; });
      AppState.updateCustomer(this.customerId, { locations: customer.locations });
      Helpers.showAlert('Department deleted successfully', 'success');
    }
    
    this.renderTabContent('departments');
  },
  
  filterDepartments: function() {
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
      self.filterDepartments();
    });
    
    // Handle clear filters button click
    $(document).on('click', '#clear-group-filters-btn', function() {
      $('#filter-group-location-id').val('');
      $('#filter-group-location-city').val('');
      $('#filter-group-location-state').val('');
      self.filterDepartments();
    });
  },
  
  renderVouchersTab: function(customer) {
    var self = this;
    var isDistributor = AppState.currentUser && (AppState.currentUser.role === 'Distributor' || (AppState.currentUser.role === 'SureWerx' && AppState.selectedDistributorId));
    var isCustomerUser = AppState.currentUser && AppState.currentUser.role === 'Customer';
    
    // Check for departments with products (new structure)
    var hasDepartmentsWithProducts = false;
    if (customer.locations && customer.locations.length > 0) {
      hasDepartmentsWithProducts = customer.locations.some(function(loc) {
        return loc.departments && loc.departments.some(function(dept) {
          return (dept.productIds || []).length > 0;
        });
      });
    }
    // Fallback to old groups structure
    var hasGroupsWithProducts = customer.groups && customer.groups.some(function(g) {
      return (g.productIds || []).length > 0;
    });
    var hasAnyWithProducts = hasDepartmentsWithProducts || hasGroupsWithProducts;
    
    // Check for departments with employees
    var hasDepartmentsWithEmployees = false;
    if (customer.locations && customer.locations.length > 0) {
      hasDepartmentsWithEmployees = customer.locations.some(function(loc) {
        return loc.departments && loc.departments.some(function(dept) {
          return (dept.employeeCount || 0) > 0;
        });
      });
    }
    // Fallback to old groups structure
    var hasEmployees = customer.groups && customer.groups.some(function(g) {
      return (g.employeeCount || 0) > 0;
    });
    var hasAnyEmployees = hasDepartmentsWithEmployees || hasEmployees;
    
    var html = '<div class="row">' +
      '<div class="col-md-12">';
    
    // Help Section - Only visible for distributors
    if (isDistributor) {
      if (!hasAnyEmployees) {
        // No employees
        html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
          '<div style="display: flex; align-items: start; gap: 15px;">' +
          '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
          '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
          '</div>' +
          '<div style="flex: 1;">' +
          '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">Create Departments First</h4>' +
          '<p style="margin: 0 0 12px 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
          'Before creating vouchers, you need to create locations and departments in the Locations and Departments tabs. Once departments are created, you can add employees to those departments and assign product visibility to enable voucher creation.' +
          '</p>' +
          '<button class="btn btn-sm btn-primary" onclick="CustomerDetailComponent.switchTab(\'departments\')">' +
          'Go to Departments' +
          '</button>' +
          '</div>' +
          '</div>' +
          '</div>';
      } else if (!hasAnyWithProducts) {
        // Has employees but no departments with products
        html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
          '<div style="display: flex; align-items: start; gap: 15px;">' +
          '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
          '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
          '</div>' +
          '<div style="flex: 1;">' +
          '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">Assign Products to Departments</h4>' +
          '<p style="margin: 0 0 12px 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
          'Before creating vouchers, you need to assign product visibility to at least one department. Go to the Departments section, and use "Manage Product Visibility" to configure which products that department can access.' +
          '</p>' +
          '<button class="btn btn-sm btn-primary" onclick="CustomerDetailComponent.switchTab(\'departments\')">' +
          'Go to Departments' +
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
          '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">Create Vouchers for Departments</h4>' +
          '<p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
          'Vouchers define the allowance amounts, validity periods, and qualified products that departments can access. Each voucher is assigned to a single department and can be configured with auto-renewal and rollover settings.' +
          '</p>' +
          '</div>' +
          '</div>' +
          '</div>';
      }
    }
    
    html += '<div class="mb-4" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">' +
      (customer.vouchers.length > 0 ? 
        '<div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 300px;">' +
        '<label for="voucher-status-filter" style="margin: 0; font-weight: 500; white-space: nowrap;">Filter by Status:</label>' +
        '<select class="form-control" id="voucher-status-filter" style="display: inline-block; width: auto; height: 32px; font-size: 13px;">' +
        '<option value="all"' + (this.voucherStatusFilter === 'all' ? ' selected' : '') + '>All Vouchers</option>' +
        '<option value="active"' + (this.voucherStatusFilter === 'active' ? ' selected' : '') + '>Active</option>' +
        '<option value="inactive"' + (this.voucherStatusFilter === 'inactive' ? ' selected' : '') + '>Inactive</option>' +
        '</select>' +
        '</div>' : '<div></div>') +
      (isDistributor ? 
        '<button class="btn btn-primary" id="create-voucher-btn"' +
        (!hasAnyWithProducts ? ' disabled title="Add departments with products first"' : '') + '>' +
        '<span class="glyphicon glyphicon-plus"></span> Create Voucher' +
        '</button>' : '') +
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
        html += '<div class="table-responsive">' +
          '<table class="table table-striped table-bordered">' +
          '<thead>' +
          '<tr>' +
          '<th>Voucher Name</th>' +
          '<th>Status</th>' +
          '<th>Department</th>' +
          '<th>Amount</th>' +
          '<th>Period</th>' +
          (!isCustomerUser ? '<th style="width: 80px;">Actions</th>' : '') +
          '</tr>' +
          '</thead>' +
          '<tbody>';
        
        filteredVouchers.forEach(function(voucher) {
          // Normalize legacy voucher data: support old userGroupIds by mapping to departmentId
          var effectiveDepartmentId = voucher.departmentId;
          var effectiveLocationId = voucher.locationId;
          
          if (!effectiveDepartmentId && voucher.userGroupIds && voucher.userGroupIds.length > 0) {
            effectiveDepartmentId = voucher.userGroupIds[0];
          }
          
          // Try to infer locationId if missing by scanning locations for the department
          if ((!effectiveLocationId || !effectiveDepartmentId) && customer.locations && customer.locations.length > 0) {
            customer.locations.some(function(loc) {
              if (loc.departments && loc.departments.length > 0) {
                var dept = loc.departments.find(function(d) { return d.id === effectiveDepartmentId; });
                if (dept) {
                  effectiveLocationId = loc.id;
                  return true;
                }
              }
              return false;
            });
          }
          
          // Get assigned department (new structure)
          var assignedDepartment = null;
          var assignedLocation = null;
          
          // Prefer explicit (or inferred) location match when both IDs are present
          if (effectiveDepartmentId && effectiveLocationId && customer.locations) {
            assignedLocation = customer.locations.find(function(loc) {
              return loc.id === effectiveLocationId;
            });
            if (assignedLocation && assignedLocation.departments) {
              assignedDepartment = assignedLocation.departments.find(function(dept) {
                return dept.id === effectiveDepartmentId;
              });
            }
          }
          
          // Fallback: search all locations for the department if not found yet
          if (!assignedDepartment && effectiveDepartmentId && customer.locations && customer.locations.length > 0) {
            customer.locations.some(function(loc) {
              if (loc.departments && loc.departments.length > 0) {
                var dept = loc.departments.find(function(d) { return d.id === effectiveDepartmentId; });
                if (dept) {
                  assignedLocation = loc;
                  assignedDepartment = dept;
                  return true;
                }
              }
              return false;
            });
          }

          var departmentLabel = '';
          if (assignedDepartment) {
            if (assignedLocation) {
              departmentLabel = Helpers.escapeHtml(assignedLocation.locationId || 'Unnamed') + ' - ' + Helpers.escapeHtml(assignedDepartment.name);
            } else {
              departmentLabel = Helpers.escapeHtml(assignedDepartment.name);
            }
          } else if (effectiveDepartmentId && customer.groups && customer.groups.length > 0) {
            // Fallback to legacy groups data if locations/departments are not available
            var legacyGroup = customer.groups.find(function(g) { return g.id === effectiveDepartmentId; });
            if (legacyGroup) {
              var legacyLocationId = legacyGroup.locationId || '';
              if (legacyLocationId) {
                departmentLabel = Helpers.escapeHtml(legacyLocationId + ' - ' + legacyGroup.name);
              } else {
                departmentLabel = Helpers.escapeHtml(legacyGroup.name);
              }
            }
          }

          var rowClass = isCustomerUser ? '' : 'selectable-row voucher-row';
          var rowStyle = isCustomerUser ? '' : ' style="cursor: pointer;"';
          
          html += '<tr class="' + rowClass + '" data-voucher-id="' + voucher.id + '"' + rowStyle + '>' +
            '<td><strong>' + Helpers.escapeHtml(voucher.name) + '</strong></td>' +
            '<td>' +
          '<span class="label ' + (voucher.isActive ? 'label-success' : 'label-default') + '" style="font-size: 11px; padding: 2px 6px;">' +
          (voucher.isActive ? 'Active' : 'Inactive') +
          '</span>' +
            '</td>' +
            '<td>' + (departmentLabel || '<span class="text-muted">Unassigned</span>') + '</td>' +
            '<td><span class="text-primary" style="font-weight: 600;">' + Helpers.formatCurrency(voucher.defaultAmount) + '</span></td>' +
            '<td>' + Helpers.formatDate(voucher.startDate) + ' - ' + Helpers.formatDate(voucher.endDate) + '</td>' +
            (!isCustomerUser && isDistributor ?
              '<td>' +
              '<button class="btn btn-xs btn-default edit-voucher-btn" data-voucher-id="' + voucher.id + '" title="Edit Voucher">' +
              '<span class="glyphicon glyphicon-pencil"></span>' +
              '</button>' +
              '</td>' : (!isCustomerUser ? '<td></td>' : '')) +
            '</tr>';
        });

        html += '</tbody></table></div>';
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
    
    // Check if customer has any locations with departments
    var hasDepartments = false;
    if (customer.locations && customer.locations.length > 0) {
      hasDepartments = customer.locations.some(function(loc) {
        return loc.departments && loc.departments.length > 0;
      });
    }
    
    // Fallback to old groups structure for backward compatibility
    if (!hasDepartments && (!customer.groups || customer.groups.length === 0)) {
      Helpers.showAlert('Please create at least one Location and Department before adding employees.', 'warning');
      // Switch to departments tab
      this.switchTab('departments');
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
    
    // Check if department has employees
    var employeeCount = customer.employees.filter(function(e) { return e.departmentId === groupId && e.locationId === locationId; }).length;
    var message = 'Are you sure you want to delete "' + group.name + '"?';
    
    if (employeeCount > 0) {
      message += '\n\nWarning: This group currently has ' + employeeCount + ' employee(s). Deleting the group will remove group assignment from these employees.';
    }
    
    UIHelpers.showConfirmDialog({
      title: 'Delete Department',
      message: message,
      confirmText: 'Delete Group',
      confirmClass: 'btn-danger',
      onConfirm: function() {
        UIHelpers.showLoadingSpinner('Deleting group...');
        
        setTimeout(function() {
          var updatedGroups = customer.groups.filter(function(g) { return g.id !== groupId; });
          
          // Remove group assignment from employees
          var updatedEmployees = customer.employees.map(function(e) {
            if (e.departmentId === groupId && e.locationId === locationId) {
              return Object.assign({}, e, { departmentId: null, locationId: null });
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
    
    // Check if customer has any locations with departments
    var hasDepartments = false;
    if (customer.locations && customer.locations.length > 0) {
      hasDepartments = customer.locations.some(function(loc) {
        return loc.departments && loc.departments.length > 0;
      });
    }
    
    // Fallback to old groups structure for backward compatibility
    if (!hasDepartments && (!customer.groups || customer.groups.length === 0)) {
      Helpers.showAlert('Please create at least one Location and Department before creating vouchers.', 'warning');
      // Switch to departments tab
      this.switchTab('departments');
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
          
          // Update employee counts in departments
          var updatedLocations = null;
          var updatedGroups = null;
          
          // Use new structure (locations -> departments)
          if (customer.locations && customer.locations.length > 0) {
            updatedLocations = customer.locations.map(function(loc) {
              if (loc.departments) {
                var updatedDepartments = loc.departments.map(function(dept) {
                  var count = updatedEmployees.filter(function(e) { 
                    return e.departmentId === dept.id && e.locationId === loc.id; 
                  }).length;
                  return Object.assign({}, dept, { employeeCount: count });
                });
                return Object.assign({}, loc, { departments: updatedDepartments });
              }
              return loc;
            });
          }
          
          // Update employee counts in departments (new structure)
          if (customer.locations && customer.locations.length > 0) {
            updatedLocations = customer.locations.map(function(loc) {
              if (loc.departments) {
                var updatedDepartments = loc.departments.map(function(dept) {
                  var count = updatedEmployees.filter(function(e) { 
                    return e.departmentId === dept.id && e.locationId === loc.id; 
                  }).length;
                  return Object.assign({}, dept, { employeeCount: count });
                });
                return Object.assign({}, loc, { departments: updatedDepartments });
              }
              return loc;
            });
          }
          
          var updateData = {
            employees: updatedEmployees,
            employeeCount: updatedEmployees.length
          };
          if (updatedLocations) {
            updateData.locations = updatedLocations;
          }
          if (updatedGroups) {
            updateData.groups = updatedGroups;
          }
          
          AppState.updateCustomer(self.customerId, updateData);
          
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
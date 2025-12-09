// Reporting Component

var ReportingComponent = {
  filters: {
    partner: '',
    dateFrom: '',
    dateTo: '',
    orderNumber: '',
    invoiceNumber: '',
    locationId: 'all',
    status: [], // Array of selected statuses
    branchId: 'all' // Distributor branch filter
  },
  hasSearched: false,
  availableEmployees: [],
  
  init: function() {
    this.hasSearched = false;
    // Ensure transactions are enriched before rendering
    if (AppState.enrichTransactions) {
      AppState.enrichTransactions();
    }
    // Default to first customer if no customer is selected
    if (!this.filters.partner) {
      var customers = AppState.getFilteredCustomers();
      if (customers && customers.length > 0) {
        this.filters.partner = customers[0].id;
      }
    }
    this.render();
    this.attachEvents();
    // After rendering, update dependent filters if a customer is selected
    if (this.filters.partner) {
      this.updateLocationIdFilter();
      this.updateBranchFilter();
      this.updateFilterEnabledState();
    }
  },
  
  render: function() {
    var html = '<div>' +
      Templates.header() +
      '<div class="container">' +
      '<div class="row mb-4">' +
      '<div class="col-md-8">' +
      '<button class="btn btn-default mb-3" id="back-to-dashboard">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to Dashboard' +
      '</button>' +
      '<h2>Reporting</h2>' +
      '<p class="text-muted">Track key metrics and performance across all customers</p>' +
      '</div>' +
      '<div class="col-md-4 text-right">' +
      '<button class="btn btn-success" id="export-csv-btn">' +
      '<span class="glyphicon glyphicon-download-alt"></span> Export Report' +
      '</button>' +
      '</div>' +
      '</div>' +
      
      this.renderFilters() +
      this.renderMetrics() +
      this.renderTransactions() +
      
      '</div>' +
      '</div>';
    
    $('#app-container').html(html);
    this.updateActiveNav('reporting');
  },
  
  attachEvents: function() {
    var self = this;
    
    // Back button
    $(document).on('click', '#back-to-dashboard', function() {
      App.navigate('dashboard');
    });
    
    // Export button
    $(document).on('click', '#export-csv-btn', function() {
      self.exportToCSV();
    });
    
    // Search button
    $(document).on('click', '#search-transactions-btn', function() {
      self.performSearch();
    });
    
    // Allow Enter key to trigger search on filter inputs
    $(document).on('keypress', '#filter-partner, #filter-date-from, #filter-date-to, #filter-location-id, #filter-order-number, #filter-invoice-number', function(e) {
      if (e.which === 13) { // Enter key
        e.preventDefault();
        $('#search-transactions-btn').click();
      }
    });
    
    // Update location ID dropdown when partner changes
    $(document).on('change', '#filter-partner', function() {
      self.updateLocationIdFilter();
      self.updateBranchFilter();
      // Reset employee filter when partner changes
      self.filters.employee = '';
      self.filters.employeeName = '';
      $('#filter-employee').val('').prop('disabled', true);
      self.hideEmployeeTypeahead();
      self.updateFilterEnabledState();
    });
    
    // Branch filter
    $(document).on('change', '#filter-branch', function() {
      self.filters.branchId = $(this).val();
      // When branch changes, update available locations for that branch
      self.updateLocationIdFilter();
    });
    
    // Initialize filters (after setting default customer)
    this.updateLocationIdFilter();
    this.updateBranchFilter();
    this.updateFilterEnabledState();

    // Initialize date inputs (convert MM/DD/YYYY to YYYY-MM-DD for native date inputs)
    this.initializeDateInputs();
    
    // Clear filters
    $(document).on('click', '#clear-filters-btn', function() {
      self.clearFilters();
    });
    
    // Refund order (SureWerx only)
    $(document).on('click', '.refund-order-btn', function(e) {
      e.stopPropagation();
      var orderId = $(this).data('order-id');
      self.handleRefund(orderId);
    });
    
    // Status filter dropdown toggle
    $(document).on('click', '#status-filter-display', function(e) {
      e.stopPropagation();
      // Require a customer before allowing status selection
      if (!$('#filter-partner').val()) {
        Helpers.showAlert('Please select a customer before choosing status.', 'warning');
        return;
      }
      $('#status-filter-dropdown').toggle();
    });
    
    // Status filter option selection
    $(document).on('click', '.status-filter-option', function(e) {
      e.stopPropagation();
      e.preventDefault();
      var status = $(this).data('status');
      var index = self.filters.status.indexOf(status);
      if (index === -1) {
        self.filters.status.push(status);
      } else {
        self.filters.status.splice(index, 1);
      }
      // Update the display without closing dropdown
      self.updateStatusFilterDisplay();
      // Update the dropdown options to show selected state
      self.updateStatusFilterDropdown();
    });
    
    // Remove status badge
    $(document).on('click', '.status-remove', function(e) {
      e.stopPropagation();
      var status = $(this).data('status');
      var index = self.filters.status.indexOf(status);
      if (index !== -1) {
        self.filters.status.splice(index, 1);
      }
      self.updateStatusFilterDisplay();
      self.updateStatusFilterDropdown();
    });
    
    // Close status dropdown when clicking outside
    $(document).on('click', function(e) {
      if (!$(e.target).closest('#status-filter-container').length) {
        $('#status-filter-dropdown').hide();
      }
    });
  },
  
  updateStatusFilterDisplay: function() {
    var self = this;
    var display = $('#status-filter-display');
    if (this.filters.status.length === 0) {
      display.html('<span style="color: #9ca3af;">Select statuses...</span>');
    } else {
      display.html(this.filters.status.map(function(status) {
        return '<span class="label label-primary" style="font-size: 11px; padding: 2px 6px; display: inline-flex; align-items: center; gap: 4px;">' +
               Helpers.escapeHtml(status) +
               '<span class="status-remove" data-status="' + Helpers.escapeHtml(status) + '" style="cursor: pointer; margin-left: 4px;">×</span>' +
               '</span>';
      }).join(''));
    }
    // Re-attach remove handler
    $(document).off('click', '.status-remove').on('click', '.status-remove', function(e) {
      e.stopPropagation();
      var status = $(this).data('status');
      var index = self.filters.status.indexOf(status);
      if (index !== -1) {
        self.filters.status.splice(index, 1);
      }
      self.updateStatusFilterDisplay();
      self.updateStatusFilterDropdown();
    });
  },
  
  updateStatusFilterDropdown: function() {
    var self = this;
    var dropdown = $('#status-filter-dropdown');
    dropdown.html(['Shipped', 'Processing', 'Refunded', 'Cancelled'].map(function(status) {
      var isSelected = self.filters.status.indexOf(status) !== -1;
      return '<div class="status-filter-option" data-status="' + Helpers.escapeHtml(status) + '" style="padding: 8px 12px; cursor: pointer; ' + (isSelected ? 'background-color: #e3f2fd;' : '') + '">' +
             (isSelected ? '<span style="color: #1976d2;">✓</span> ' : '') +
             Helpers.escapeHtml(status) +
             '</div>';
    }).join(''));
  },
  
  updateBranchFilter: function() {
    var customerId = $('#filter-partner').val();
    var branchSelect = $('#filter-branch');
    
    // Reset to default "All Branches"
    branchSelect.html('<option value="all">All Branches</option>');
    branchSelect.prop('disabled', true);
    this.filters.branchId = 'all';
    
    // Branch can only be selected after a specific customer is chosen
    if (!customerId || customerId === 'all') {
      return;
    }
    
    var partner = AppState.getCustomerById(customerId);
    if (!partner || !partner.distributorId || !AppState.branchLocations || AppState.branchLocations.length === 0) {
      return;
    }
    
    var distributorId = partner.distributorId;
    
    // Populate branches for this customer's distributor
    AppState.branchLocations.forEach(function(branch) {
      var branchDistributorId = null;
      if (branch.id.indexOf('br-d1-') === 0) branchDistributorId = 'd1';
      else if (branch.id.indexOf('br-d2-') === 0) branchDistributorId = 'd2';
      else if (branch.id.indexOf('br-d3-') === 0) branchDistributorId = 'd3';
      else if (branch.id.indexOf('br-d4-') === 0) branchDistributorId = 'd4';
      
      if (branchDistributorId === distributorId) {
        var selected = this.filters.branchId === branch.id ? ' selected' : '';
        branchSelect.append(
          '<option value="' + Helpers.escapeHtml(branch.id) + '"' + selected + '>' +
          Helpers.escapeHtml(branch.branchId + ' - ' + branch.branchAddress) +
          '</option>'
        );
      }
    }.bind(this));
    
    branchSelect.prop('disabled', false);
  },
  
  updateFilterEnabledState: function() {
    // Enable/disable dependent filters based on whether a customer is selected
    var hasCustomer = !!$('#filter-partner').val();
    
    // Branch and Location depend on customer
    $('#filter-branch').prop('disabled', !hasCustomer);
    $('#filter-location-id').prop('disabled', !hasCustomer);
    
    // Date range depends on customer
    $('#filter-date-from, #filter-date-to').prop('disabled', !hasCustomer);
    
    // Status UI: visually and interactively disable when no customer
    if (!hasCustomer) {
      $('#status-filter-display')
        .css({
          'background-color': '#f9fafb',
          'cursor': 'not-allowed',
          'opacity': '0.6'
        })
        .addClass('disabled-filter');
    } else {
      $('#status-filter-display')
        .css({
          'background-color': '',
          'cursor': 'pointer',
          'opacity': ''
        })
        .removeClass('disabled-filter');
    }
  },
  
  updateLocationIdFilter: function() {
    var customerId = $('#filter-partner').val();
    var locationIdSelect = $('#filter-location-id');
    
    // Clear existing options except "All Locations"
    locationIdSelect.html('<option value="all">All Locations</option>');
    locationIdSelect.prop('disabled', true);
    this.filters.locationId = 'all';
    
    // Require a customer selection
    if (!customerId || customerId === 'all') {
      return;
    }
    
    var partner = AppState.getCustomerById(customerId);
    if (!partner || !partner.locations || partner.locations.length === 0) {
      return;
    }
    
    // Require a specific distributor branch before enabling locations
    var branchId = $('#filter-branch').val();
    if (!branchId || branchId === 'all') {
      // No branch selected yet, keep Location disabled
      return;
    }
    
    // Filter locations to only those assigned to the selected branch
    var locations = partner.locations.filter(function(loc) {
      return loc.distributorBranchId === branchId;
    });
    
    if (locations.length === 0) {
      return;
    }
    
    // Build location display strings with location ID, address, city, state
    locations.forEach(function(loc) {
      if (!loc.locationId) return;
      
      // Build display text: "Location ID - Address, City, State"
      var displayParts = [loc.locationId];
      var addressParts = [];
      if (loc.address) addressParts.push(loc.address);
      if (loc.city) addressParts.push(loc.city);
      if (loc.state) addressParts.push(loc.state);
      
      if (addressParts.length > 0) {
        displayParts.push(addressParts.join(', '));
      }
      
      var displayText = displayParts.join(' - ');
      var selected = this.filters.locationId === loc.locationId ? ' selected' : '';
      locationIdSelect.append('<option value="' + Helpers.escapeHtml(loc.locationId) + '"' + selected + '>' + Helpers.escapeHtml(displayText) + '</option>');
    }.bind(this));
    
    locationIdSelect.prop('disabled', false);
  },
  
  updateEmployeeTypeahead: function() {
    var customerId = $('#filter-partner').val();
    var locationId = $('#filter-location-id').val();
    var employeeInput = $('#filter-employee');
    
    // Clear available employees
    this.availableEmployees = [];
    
    // Enable/disable based on whether location ID is selected
    if (customerId && customerId !== 'all' && locationId && locationId !== 'all') {
      var partner = AppState.getCustomerById(customerId);
      if (partner && partner.employees && partner.employees.length > 0) {
        // Find all groups with the selected location ID
        var groupsWithLocationId = partner.groups.filter(function(g) {
          return g.locationId === locationId;
        });
        
        if (groupsWithLocationId.length > 0) {
          // Get all group IDs with this location ID
          var groupIds = groupsWithLocationId.map(function(g) { return g.id; });
          
          // Filter employees by groups with the selected location ID
          var locationEmployees = partner.employees.filter(function(emp) {
            return groupIds.indexOf(emp.groupId) !== -1;
          });
          
          // Ensure uniqueness by ID first
          var uniqueEmployeesByIdMap = new Map();
          locationEmployees.forEach(function(emp) {
            var empKey = emp.id;
            if (empKey && !uniqueEmployeesByIdMap.has(empKey)) {
              uniqueEmployeesByIdMap.set(empKey, emp);
            }
          });
          
          // Then deduplicate by name to ensure same name doesn't appear multiple times
          var uniqueEmployeesByNameMap = new Map();
          uniqueEmployeesByIdMap.forEach(function(emp) {
            var empName = (emp.firstName && emp.lastName ? emp.firstName + ' ' + emp.lastName : emp.name || 'Unknown').toLowerCase();
            if (!uniqueEmployeesByNameMap.has(empName)) {
              uniqueEmployeesByNameMap.set(empName, emp);
            }
          });
          
          // Convert map values to array and sort by name
          var uniqueEmployees = Array.from(uniqueEmployeesByNameMap.values());
          uniqueEmployees.sort(function(a, b) {
            var nameA = (a.firstName && a.lastName ? a.firstName + ' ' + a.lastName : a.name || '').toLowerCase();
            var nameB = (b.firstName && b.lastName ? b.firstName + ' ' + b.lastName : b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });
          
          // Store available employees with their keys and names
          this.availableEmployees = uniqueEmployees.map(function(emp) {
            var empName = emp.firstName && emp.lastName ? emp.firstName + ' ' + emp.lastName : emp.name || 'Unknown';
            var empKey = emp.id;
            return {
              key: empKey,
              name: empName,
              original: emp
            };
          });
        }
      }
      employeeInput.prop('disabled', false);
    } else {
      employeeInput.prop('disabled', true);
      this.filters.employee = '';
      this.filters.employeeName = '';
      employeeInput.val('');
    }
  },
  
  showEmployeeSuggestions: function(query) {
    var self = this;
    var queryLower = query.toLowerCase();
    var resultsContainer = $('#employee-typeahead-results');
    
    // Filter employees by query (name only, no email)
    var matchingEmployees = this.availableEmployees.filter(function(emp) {
      return emp.name.toLowerCase().indexOf(queryLower) > -1;
    });
    
    if (matchingEmployees.length === 0) {
      resultsContainer.html('<div class="employee-typeahead-item employee-typeahead-no-results">No employees found</div>');
      resultsContainer.show();
      return;
    }
    
    // Limit to 10 results
    matchingEmployees = matchingEmployees.slice(0, 10);
    
    // Build HTML for suggestions (name only, no email)
    var html = matchingEmployees.map(function(emp) {
      var highlightedName = self.highlightMatch(emp.name, query);
      return '<div class="employee-typeahead-item" data-employee-key="' + Helpers.escapeHtml(emp.key) + '" data-employee-name="' + Helpers.escapeHtml(emp.name) + '">' +
             highlightedName +
             '</div>';
    }).join('');
    
    resultsContainer.html(html);
    resultsContainer.show();
  },
  
  highlightMatch: function(text, query) {
    var queryLower = query.toLowerCase();
    var textLower = text.toLowerCase();
    var index = textLower.indexOf(queryLower);
    
    if (index === -1) {
      return Helpers.escapeHtml(text);
    }
    
    var before = text.substring(0, index);
    var match = text.substring(index, index + query.length);
    var after = text.substring(index + query.length);
    
    return Helpers.escapeHtml(before) + '<strong>' + Helpers.escapeHtml(match) + '</strong>' + Helpers.escapeHtml(after);
  },
  
  hideEmployeeTypeahead: function() {
    $('#employee-typeahead-results').hide();
  },
  
  updateActiveNav: function(view) {
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="' + view + '"]').addClass('active');
  },
  
  renderFilters: function() {
    var self = this;
    // Ensure a customer is selected (default to first if none selected)
    if (!this.filters.partner) {
      var customers = AppState.getFilteredCustomers();
      if (customers && customers.length > 0) {
        this.filters.partner = customers[0].id;
      }
    }
    return '<div class="filter-panel" style="padding: 12px;">' +
      '<h4 style="margin-top: 0; margin-bottom: 12px; font-size: 16px;">Filters</h4>' +
      '<form class="form-horizontal">' +
      '<div class="row" style="margin-bottom: 8px; margin-left: 0; margin-right: 0;">' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Customer</label>' +
      '<select class="form-control" id="filter-partner" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      AppState.getFilteredCustomers().map(function(p) {
        var selected = self.filters.partner === p.id ? ' selected' : '';
        return '<option value="' + p.id + '"' + selected + '>' + Helpers.escapeHtml(p.name) + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Distributor Branch</label>' +
      '<select class="form-control" id="filter-branch" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      // Options will be populated dynamically based on selected customer
      '<option value="all">All Branches</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Location</label>' +
      '<select class="form-control" id="filter-location-id" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '<option value="all">All Locations</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Status</label>' +
      '<div id="status-filter-container" style="position: relative;">' +
      '<div id="status-filter-display" class="form-control" style="height: auto; min-height: 32px; font-size: 13px; cursor: pointer; padding: 4px 8px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; width: 90%; box-sizing: border-box;">' +
      (this.filters.status.length === 0 ? '<span style="color: #9ca3af;">Select statuses...</span>' : '') +
      this.filters.status.map(function(status) {
        return '<span class="label label-primary" style="font-size: 11px; padding: 2px 6px; display: inline-flex; align-items: center; gap: 4px;">' +
               Helpers.escapeHtml(status) +
               '<span class="status-remove" data-status="' + Helpers.escapeHtml(status) + '" style="cursor: pointer; margin-left: 4px;">×</span>' +
               '</span>';
      }).join('') +
      '</div>' +
      '<div id="status-filter-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-top: none; z-index: 1000; max-height: 200px; overflow-y: auto; margin-top: -1px;">' +
      ['Shipped', 'Processing', 'Refunded', 'Cancelled'].map(function(status) {
        var isSelected = self.filters.status.indexOf(status) !== -1;
        return '<div class="status-filter-option" data-status="' + Helpers.escapeHtml(status) + '" style="padding: 8px 12px; cursor: pointer; ' + (isSelected ? 'background-color: #e3f2fd;' : '') + '">' +
               (isSelected ? '<span style="color: #1976d2;">✓</span> ' : '') +
               Helpers.escapeHtml(status) +
               '</div>';
      }).join('') +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      // Second row with remaining filters
      '<div class="row" style="margin-bottom: 8px; margin-left: 0; margin-right: 0;">' +
      '<div class="col-md-4" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Order #</label>' +
      '<input type="text" class="form-control" id="filter-order-number" placeholder="Order number" value="' + Helpers.escapeHtml(this.filters.orderNumber || '') + '" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Invoice #</label>' +
      '<input type="text" class="form-control" id="filter-invoice-number" placeholder="Invoice number" value="' + Helpers.escapeHtml(this.filters.invoiceNumber || '') + '" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Date Range</label>' +
      '<div style="display: flex; align-items: center; gap: 4px; width: 90%;">' +
      '<input type="date" class="form-control" id="filter-date-from" value="' + Helpers.escapeHtml(this.filters.dateFrom || '') + '" style="height: 32px; font-size: 13px;">' +
      '<span style="font-size: 12px; color: #6b7280;">to</span>' +
      '<input type="date" class="form-control" id="filter-date-to" value="' + Helpers.escapeHtml(this.filters.dateTo || '') + '" style="height: 32px; font-size: 13px;">' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="row" style="margin-bottom: 8px;">' +
      '<div class="col-md-12">' +
      '<div class="form-group" style="margin-bottom: 8px; padding-left: 15px;">' +
      '<button type="button" class="btn btn-primary" id="search-transactions-btn" style="height: 32px; padding: 6px 16px; font-size: 13px;">' +
      '<span class="glyphicon glyphicon-search"></span> Search' +
      '</button> ' +
      '<button type="button" class="btn btn-default" id="clear-filters-btn" style="height: 32px; padding: 6px 16px; font-size: 13px;">Clear Filters</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</form>' +
      '</div>';
  },
  
  renderMetrics: function() {
    // Metrics section removed - no stats displayed
    return '';
  },
  
  renderTransactions: function() {
    // If no search has been performed, show initial message
    if (!this.hasSearched) {
      return '<div class="panel panel-default">' +
        '<div class="panel-heading">' +
        '<h3 class="panel-title">Purchase Transactions</h3>' +
        '</div>' +
        '<div class="panel-body text-center text-muted" style="padding: 40px;">' +
        '<p>Select filters and click Search to find transactions.</p>' +
        '</div>' +
        '</div>';
    }
    
    var transactions = this.getFilteredTransactions();
    
    // Group by order ID
    var orderGroups = {};
    transactions.forEach(function(t) {
      if (!orderGroups[t.orderId]) {
        orderGroups[t.orderId] = [];
      }
      orderGroups[t.orderId].push(t);
    });
    
    var ordersHtml = Object.keys(orderGroups).map(function(orderId) {
      var orderItems = orderGroups[orderId];
      var firstItem = orderItems[0];
      // Calculate order total only from items with Shipped or Processing status
      // Do not subtract refunded amounts - totals remain at original values
      var orderTotal = orderItems.reduce(function(sum, item) {
        if (item.lineStatus === 'Shipped' || item.lineStatus === 'Processing') {
          return sum + item.totalPrice;
        }
        return sum;
      }, 0);
      var shippingCost = firstItem.shippingCost || 0;
      var grandTotal = orderTotal + shippingCost;
      
      // Find user group information
      var userGroupInfo = '';
      var partner = AppState.customers.find(function(p) { return p.name === (firstItem.partnerName || firstItem.customerName); });
      
      // Find employee to get employeeId or username
      var employee = null;
      var employeeIdentifier = '';
      if (partner && partner.employees && firstItem.employeeName) {
        // Try to find employee by name (handle both firstName/lastName and name formats)
        employee = partner.employees.find(function(emp) {
          var empName = emp.firstName && emp.lastName ? emp.firstName + ' ' + emp.lastName : emp.name || '';
          return empName === firstItem.employeeName;
        });
        
        if (employee && partner.employeeFieldConfig) {
          if (partner.employeeFieldConfig.requireEmployeeId && employee.employeeId) {
            employeeIdentifier = employee.employeeId;
          } else if (partner.employeeFieldConfig.requireUsername && employee.username) {
            employeeIdentifier = employee.username;
          } else if (employee.employeeId) {
            employeeIdentifier = employee.employeeId;
          } else if (employee.username) {
            employeeIdentifier = employee.username;
          }
        }
      }
      
      if (partner && partner.groups && firstItem.employeeGroup) {
        var group = partner.groups.find(function(g) { return g.name === firstItem.employeeGroup; });
        if (group) {
          var addressStr = '';
          if (group.addressLine1) {
            addressStr = group.addressLine1;
            if (group.addressCity) addressStr += ', ' + group.addressCity;
            if (group.addressState) addressStr += ', ' + group.addressState;
            if (group.addressZip) addressStr += ' ' + group.addressZip;
          } else if (group.locationAddress) {
            addressStr = group.locationAddress;
          }
          
          userGroupInfo = '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #6b7280; margin-top: 6px; line-height: 1.8;">';
          if (group.locationId) {
            userGroupInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Location ID:</strong> ' + Helpers.escapeHtml(group.locationId) + '</span>';
          }
          if (group.location) {
            userGroupInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Location:</strong> ' + Helpers.escapeHtml(group.location) + '</span>';
          }
          if (group.department) {
            userGroupInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Department:</strong> ' + Helpers.escapeHtml(group.department) + '</span>';
          }
          if (addressStr) {
            userGroupInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Address:</strong> ' + Helpers.escapeHtml(addressStr) + '</span>';
          }
          userGroupInfo += '</div>';
        }
      }
      
      // Build shipping address display
      var shippingAddressDisplay = '';
      if (firstItem.shippingAddress) {
        var shippingAddressText = firstItem.shippingAddress.replace(/<br>/g, ', ');
        shippingAddressDisplay = '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #6b7280; margin-top: 6px; line-height: 1.8;">' +
          '<span style="margin-right: 4px;"><strong style="color: #374151;">Shipping Address:</strong> ' + Helpers.escapeHtml(shippingAddressText) + '</span>' +
          '</div>';
      }
      
      // Build employee identifier display
      var employeeIdentifierDisplay = '';
      if (employeeIdentifier) {
        var identifierLabel = partner && partner.employeeFieldConfig && partner.employeeFieldConfig.requireEmployeeId ? 'Employee ID' : 'Username';
        employeeIdentifierDisplay = '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #6b7280; margin-top: 6px; line-height: 1.8;">' +
          '<span style="margin-right: 4px;"><strong style="color: #374151;">' + identifierLabel + ':</strong> ' + Helpers.escapeHtml(employeeIdentifier) + '</span>' +
          '</div>';
      }
      
      // Calculate order-level voucher totals and payment breakdown (per requirements)
      var orderVoucherTotals = firstItem.orderVoucherTotals || {};
      var totalVoucherApplied = firstItem.totalVoucherApplied || 0;
      
      // Check for any vouchers specified in voucherUsed that aren't already in orderVoucherTotals
      // This handles cases where enrichTransactions missed some vouchers
      if (partner && partner.vouchers) {
        // Collect all unique voucher names from all line items
        var voucherNamesToProcess = [];
        orderItems.forEach(function(item) {
          if (item.voucherUsed && voucherNamesToProcess.indexOf(item.voucherUsed) === -1) {
            voucherNamesToProcess.push(item.voucherUsed);
          }
        });
        
        // Process each voucher found in the order that isn't already in orderVoucherTotals
        voucherNamesToProcess.forEach(function(voucherName) {
          // Skip if this voucher is already in orderVoucherTotals
          if (orderVoucherTotals[voucherName]) {
            return;
          }
          
          var voucher = partner.vouchers.find(function(v) {
            return v.name === voucherName || (v.name && v.name.toLowerCase().trim() === voucherName.toLowerCase().trim());
          });
          
          if (voucher && voucher.isActive) {
            // Sum qualifying line items for this voucher
            // Only include items that have this voucher in their voucherUsed field
            var voucherLineTotal = 0;
            orderItems.forEach(function(item) {
              // Only process items that are assigned to this voucher
              if (item.voucherUsed === voucherName && item.surewerxPartNumber) {
                var product = AppState.products.find(function(p) {
                  return p.surewerxSku === item.surewerxPartNumber;
                });
                if (product && voucher.productIds && voucher.productIds.indexOf(product.id) !== -1) {
                  voucherLineTotal += item.totalPrice;
                }
              }
            });
            
            // If no products matched but voucherUsed is set, apply voucher to items assigned to it
            if (voucherLineTotal === 0) {
              var itemsForThisVoucher = orderItems.filter(function(item) {
                return item.voucherUsed === voucherName;
              });
              var totalForThisVoucher = itemsForThisVoucher.reduce(function(sum, item) {
                return sum + item.totalPrice;
              }, 0);
              
              if (totalForThisVoucher > 0) {
                var voucherLimit = voucher.defaultAmount || 0;
                voucherLineTotal = Math.min(totalForThisVoucher, voucherLimit);
              }
            }
            
            if (voucherLineTotal > 0) {
              var voucherLimit = voucher.defaultAmount || 0;
              var voucherAmountUsed = Math.min(voucherLineTotal, voucherLimit);
              orderVoucherTotals[voucherName] = voucherAmountUsed;
              totalVoucherApplied += voucherAmountUsed;
            }
          }
        });
      }
      
      // Always recalculate remaining balance and credit card payment based on current totalVoucherApplied
      // (totalVoucherApplied may have been updated by the fallback logic above)
      var orderRemainingBalance = grandTotal - totalVoucherApplied;
      var orderCreditCardPayment = orderRemainingBalance > 0 ? orderRemainingBalance : 0;
      
      // Calculate refunds (voucher refunds vs credit card refunds) - voucher first priority
      var totalVoucherRefunded = 0;
      var totalCreditCardCollection = 0; // Sum of all exceeded amounts (refund > voucher allocation per line)
      var totalRefunded = 0;
      var hasRefunds = false;
      var allItemsRefunded = true;
      
      // Track refunds per voucher
      var voucherRefundTotals = {};
      if (orderVoucherTotals && Object.keys(orderVoucherTotals).length > 0) {
        for (var vName in orderVoucherTotals) {
          if (orderVoucherTotals.hasOwnProperty(vName)) {
            voucherRefundTotals[vName] = 0;
          }
        }
      }
      
      orderItems.forEach(function(item) {
        if (item.refundedAmount && item.refundedAmount > 0) {
          totalRefunded += item.refundedAmount;
          hasRefunds = true;
          
          // Determine the actual voucher amount allocated to this line item
          // When multiple items qualify for the same voucher and the total exceeds the limit,
          // we need to proportionally allocate the capped voucher amount across qualifying items
          var lineVoucherAllocation = 0;
          if (item.eligibleVoucherName && orderVoucherTotals && Object.keys(orderVoucherTotals).length > 0) {
            // Find matching voucher name (exact or case-insensitive)
            var matchingVoucherName = orderVoucherTotals[item.eligibleVoucherName] ? item.eligibleVoucherName :
              Object.keys(orderVoucherTotals).find(function(vName) {
                if (!vName || !item.eligibleVoucherName) return false;
                return vName.toLowerCase().trim() === item.eligibleVoucherName.toLowerCase().trim();
              });
            
            if (matchingVoucherName && orderVoucherTotals[matchingVoucherName]) {
              // Get the total amount applied from this voucher (already capped at voucher limit)
              var voucherAppliedAmount = orderVoucherTotals[matchingVoucherName];
              
              // Calculate the sum of all line items that qualified for this voucher
              var voucherQualifyingTotal = orderItems.reduce(function(sum, orderItem) {
                if (orderItem.eligibleVoucherName === matchingVoucherName ||
                    (orderItem.eligibleVoucherName && matchingVoucherName && 
                     orderItem.eligibleVoucherName.toLowerCase().trim() === matchingVoucherName.toLowerCase().trim())) {
                  return sum + orderItem.totalPrice;
                }
                return sum;
              }, 0);
              
              // Proportionally allocate the voucher amount to this line item
              // Allocation = (line item total / qualifying total) * voucher applied amount
              if (voucherQualifyingTotal > 0) {
                lineVoucherAllocation = (item.totalPrice / voucherQualifyingTotal) * voucherAppliedAmount;
              }
            }
          }
          
          // If no voucher allocation found, fall back to proportional allocation across all vouchers
          if (lineVoucherAllocation === 0 && totalVoucherApplied > 0 && orderTotal > 0) {
            var voucherRatio = totalVoucherApplied / orderTotal;
            lineVoucherAllocation = item.totalPrice * voucherRatio;
          }
          
          // Calculate how much of this refund exceeds the voucher allocation for this line
          if (item.refundedAmount > lineVoucherAllocation) {
            // This line's refund exceeded its voucher portion - track the excess
            var exceededAmount = item.refundedAmount - lineVoucherAllocation;
            totalCreditCardCollection += exceededAmount;
          }
          
          // Determine voucher refund amount (up to the line's voucher allocation)
          var lineVoucherRefund = Math.min(item.refundedAmount, lineVoucherAllocation);
          totalVoucherRefunded += lineVoucherRefund;
          
          // Allocate voucher refund to the specific voucher this line item is eligible for
          if (lineVoucherRefund > 0 && item.eligibleVoucherName && orderVoucherTotals && Object.keys(orderVoucherTotals).length > 0) {
            // Find matching voucher name
            var matchingVoucherName = orderVoucherTotals[item.eligibleVoucherName] ? item.eligibleVoucherName :
              Object.keys(orderVoucherTotals).find(function(vName) {
                if (!vName || !item.eligibleVoucherName) return false;
                return vName.toLowerCase().trim() === item.eligibleVoucherName.toLowerCase().trim();
              });
            
            if (matchingVoucherName) {
              // Allocate the full line voucher refund to this specific voucher
              voucherRefundTotals[matchingVoucherName] = (voucherRefundTotals[matchingVoucherName] || 0) + lineVoucherRefund;
            } else {
              // Fall back to proportional allocation if no matching voucher found
              if (totalVoucherApplied > 0) {
                for (var vName in orderVoucherTotals) {
                  if (orderVoucherTotals.hasOwnProperty(vName)) {
                    var voucherRatio = orderVoucherTotals[vName] / totalVoucherApplied;
                    var voucherRefundAmount = lineVoucherRefund * voucherRatio;
                    voucherRefundTotals[vName] = (voucherRefundTotals[vName] || 0) + voucherRefundAmount;
                  }
                }
              }
            }
          }
        } else {
          allItemsRefunded = false;
        }
      });
      
      // Round voucher refund totals to avoid floating point issues
      for (var vName in voucherRefundTotals) {
        if (voucherRefundTotals.hasOwnProperty(vName)) {
          voucherRefundTotals[vName] = Math.round(voucherRefundTotals[vName] * 100) / 100;
        }
      }
      
      // Get voucher details (limit and remaining balance) for each voucher
      // This is calculated AFTER refunds so it can account for refunded amounts
      var voucherDetails = {};
      if (partner && partner.vouchers && Object.keys(orderVoucherTotals).length > 0) {
        for (var voucherName in orderVoucherTotals) {
          if (orderVoucherTotals.hasOwnProperty(voucherName)) {
            var voucher = partner.vouchers.find(function(v) {
              return v.name === voucherName || (v.name && v.name.toLowerCase().trim() === voucherName.toLowerCase().trim());
            });
            if (voucher) {
              var voucherLimit = voucher.defaultAmount || 0;
              var voucherOriginalApplied = orderVoucherTotals[voucherName]; // Original amount used/applied for this voucher
              var voucherRefundAmount = voucherRefundTotals[voucherName] || 0; // Amount refunded for this voucher
              // Net voucher applied = original applied - refunded amount
              var voucherNetApplied = voucherOriginalApplied - voucherRefundAmount;
              // Remaining balance = voucher limit minus net voucher applied
              var voucherRemainingBalance = Math.max(0, voucherLimit - voucherNetApplied);
              voucherDetails[voucherName] = {
                limit: voucherLimit,
                total: voucherNetApplied,
                remainingBalance: voucherRemainingBalance
              };
            }
          }
        }
      }
      
      // Calculate remaining balance: Only show if refund was made AND refund exceeded voucher amount
      // Remaining balance = excess refund amount (refund - voucher applied)
      var calculatedRemainingBalance = 0;
      if (totalRefunded > 0 && totalRefunded > totalVoucherApplied) {
        calculatedRemainingBalance = totalRefunded - totalVoucherApplied;
      }
      
      // Build payment breakdown display
      var paymentBreakdownDisplay = '';
      // Show payment breakdown if there are vouchers OR credit card payment OR if voucher totals exist
      if (totalVoucherApplied > 0 || orderCreditCardPayment > 0 || Object.keys(orderVoucherTotals).length > 0) {
        paymentBreakdownDisplay = '<div style="font-size: 12px; color: #374151; margin-top: 6px; line-height: 1.8; padding: 8px; background-color: #f9fafb; border-radius: 4px;">';
        
        // Show credit card payment first if there was any credit card payment
        // Credit card payment = Grand Total - Total Voucher Applied (if positive)
        if (orderCreditCardPayment > 0) {
          paymentBreakdownDisplay += '<div style="margin-bottom: 8px;">';
          paymentBreakdownDisplay += '<strong style="color: #2563eb;">Paid by Credit Card:</strong> ' + Helpers.formatCurrency(orderCreditCardPayment);
          paymentBreakdownDisplay += '</div>';
        }
        
        // Show voucher breakdown with individual vouchers
        if (Object.keys(orderVoucherTotals).length > 0) {
          paymentBreakdownDisplay += '<div>';
          paymentBreakdownDisplay += '<strong style="color: #059669;">Paid by Voucher:</strong> ' + Helpers.formatCurrency(totalVoucherApplied) + '<br>';
          paymentBreakdownDisplay += '<div style="margin-top: 4px; margin-left: 10px;">';
          for (var voucherName in orderVoucherTotals) {
            if (orderVoucherTotals.hasOwnProperty(voucherName)) {
              var voucherDetail = voucherDetails[voucherName];
              var voucherAmount = voucherDetail ? voucherDetail.total : orderVoucherTotals[voucherName];
              paymentBreakdownDisplay += '<span>• <strong>' + Helpers.escapeHtml(voucherName) + '</strong>: ' + Helpers.formatCurrency(voucherAmount);
              if (voucherDetail && voucherDetail.remainingBalance !== undefined) {
                paymentBreakdownDisplay += ' (Remaining: ' + Helpers.formatCurrency(voucherDetail.remainingBalance) + ')';
              }
              paymentBreakdownDisplay += '</span><br>';
            }
          }
          paymentBreakdownDisplay += '</div>';
          paymentBreakdownDisplay += '</div>';
        } else if (totalVoucherApplied > 0) {
          paymentBreakdownDisplay += '<div>';
          paymentBreakdownDisplay += '<strong style="color: #059669;">Paid by Voucher:</strong> ' + Helpers.formatCurrency(totalVoucherApplied);
          paymentBreakdownDisplay += '</div>';
        }
        
        paymentBreakdownDisplay += '</div>';
      }
      
      // Build refund breakdown display
      var refundBreakdownDisplay = '';
      if (totalRefunded > 0) {
        refundBreakdownDisplay = '<div style="font-size: 12px; color: #dc2626; margin-top: 6px; line-height: 1.8; padding: 8px; background-color: #fef2f2; border-radius: 4px;">';
        
        // Voucher Amount Refunded: Show each voucher name and amount
        refundBreakdownDisplay += '<div style="margin-bottom: 8px;">';
        refundBreakdownDisplay += '<strong>Voucher Amount Refunded:</strong><br>';
        if (Object.keys(voucherRefundTotals).length > 0) {
          var hasVoucherRefunds = false;
          for (var vName in voucherRefundTotals) {
            if (voucherRefundTotals.hasOwnProperty(vName) && voucherRefundTotals[vName] > 0) {
              refundBreakdownDisplay += '<span style="margin-left: 10px;">• ' + Helpers.escapeHtml(vName) + ': ' + Helpers.formatCurrency(voucherRefundTotals[vName]) + '</span><br>';
              hasVoucherRefunds = true;
            }
          }
          if (!hasVoucherRefunds) {
            refundBreakdownDisplay += '<span style="margin-left: 10px; color: #6b7280;">No voucher refunds</span><br>';
          }
        } else if (totalVoucherRefunded > 0) {
          refundBreakdownDisplay += '<span style="margin-left: 10px;">' + Helpers.formatCurrency(totalVoucherRefunded) + '</span><br>';
        } else {
          refundBreakdownDisplay += '<span style="margin-left: 10px; color: #6b7280;">No voucher refunds</span><br>';
        }
        refundBreakdownDisplay += '</div>';
        
        // Amount to be Collected from Credit Card
        refundBreakdownDisplay += '<div style="font-weight: 700; color: #991b1b; margin-bottom: 8px;">';
        refundBreakdownDisplay += '<strong>Amount to be Collected from Credit Card:</strong> ' + Helpers.formatCurrency(totalCreditCardCollection);
        refundBreakdownDisplay += '</div>';
        
        refundBreakdownDisplay += '</div>';
      }
      
      // Check if all voucher-applied items have been fully refunded
      var allVoucherItemsRefunded = true;
      // Check for vouchers: either in orderVoucherTotals, totalVoucherApplied, or item-level indicators
      var hasVoucherItems = Object.keys(orderVoucherTotals).length > 0 || totalVoucherApplied > 0;
      if (!hasVoucherItems) {
        // Fallback: check item-level indicators
        orderItems.forEach(function(item) {
          if (item.voucherEligible || (item.voucherAmountPaid && item.voucherAmountPaid > 0) || item.voucherUsed) {
            hasVoucherItems = true;
          }
        });
      }
      
      // Check if all items are fully refunded
      orderItems.forEach(function(item) {
        if (hasVoucherItems && (item.voucherEligible || (item.voucherAmountPaid && item.voucherAmountPaid > 0) || item.voucherUsed)) {
          var refunded = item.refundedAmount || 0;
          var voucherAllocation = item.voucherAmountPaid || 0;
          // If no voucher allocation but voucher was used, check against line total
          if (voucherAllocation === 0 && item.voucherUsed) {
            voucherAllocation = item.totalPrice; // Use line total as fallback
          }
          if (refunded < voucherAllocation) {
            allVoucherItemsRefunded = false;
          }
        }
      });
      
      return '<div class="transaction-order" style="margin-bottom: 16px;">' +
        '<div class="order-header" style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">' +
        '<div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">' +
        '<div style="flex: 1; min-width: 200px;">' +
        '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">' +
        '<span style="font-weight: 600; font-size: 14px; color: #111827;">Order #' + Helpers.escapeHtml(orderId) + '</span>' +
        '<span class="label label-default" style="font-size: 11px; padding: 2px 6px;">' + Helpers.escapeHtml(firstItem.employeeGroup) + '</span>' +
        '</div>' +
        '<div style="font-size: 12px; color: #374151; margin-top: 2px;"><strong>' + Helpers.escapeHtml(firstItem.employeeName) + '</strong> • ' + Helpers.escapeHtml(firstItem.partnerName || firstItem.customerName || '') + '</div>' +
        employeeIdentifierDisplay +
        userGroupInfo +
        shippingAddressDisplay +
        paymentBreakdownDisplay +
        refundBreakdownDisplay +
        '</div>' +
        '<div style="text-align: right; flex-shrink: 0;">' +
        '<div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Order Total</div>' +
        '<div style="font-size: 18px; font-weight: 600; color: #111827;">' + Helpers.formatCurrency(orderTotal) + '</div>' +
        (shippingCost > 0 ? '<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">+ Shipping: ' + Helpers.formatCurrency(shippingCost) + '</div>' : '') +
        (shippingCost > 0 ? '<div style="font-size: 13px; font-weight: 600; color: #059669; margin-top: 4px; padding-top: 4px; border-top: 1px solid #d1d5db;">Total: ' + Helpers.formatCurrency(grandTotal) + '</div>' : '') +
        // Order-level refund button for SureWerx users only (if any voucher-applied lines exist and not all are fully refunded)
        (AppState.currentUser && AppState.currentUser.role === 'SureWerx' && hasVoucherItems && !allVoucherItemsRefunded ?
          '<div style="margin-top: 8px;">' +
          '<button class="btn btn-sm btn-warning refund-order-btn" data-order-id="' + Helpers.escapeHtml(orderId) + '" style="font-size: 11px; padding: 4px 8px;">Refund</button>' +
          '</div>' : '') +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="order-items" style="padding: 0;">' +
        orderItems.map(function(item) {
          // Find the product to check for distributor SKU
          var product = AppState.products.find(function(p) {
            return p.surewerxSku === item.surewerxPartNumber;
          });
          var customSku = product && product.customSku ? product.customSku : null;
          
          return '<div class="order-item" style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">' +
            '<div style="flex: 1; min-width: 0;">' +
            // Move invoice information above status / product name so it's more visible
            ((item.invoiceNumber || item.invoiceDate || item.invoiceDueDate) ?
              '<div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 6px;">' +
              (item.invoiceNumber ? '<span style="font-size: 15px; font-weight: 600; color: #111827;"><strong>Invoice #:</strong> ' + Helpers.escapeHtml(item.invoiceNumber) + '</span>' : '') +
              (item.invoiceDate ? '<span style="font-size: 11px; color: #6b7280;"><strong>Invoice Date:</strong> ' + Helpers.formatDate(item.invoiceDate) + '</span>' : '') +
              (item.invoiceDueDate ? '<span style="font-size: 11px; color: #6b7280;"><strong>Invoice Due:</strong> ' + Helpers.formatDate(item.invoiceDueDate) + '</span>' : '') +
              '</div>' : '') +
            '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">' +
            '<span class="status-badge ' + Helpers.getStatusBadgeClass(item.lineStatus) + '" style="font-size: 11px; padding: 2px 6px;">' +
            Helpers.escapeHtml(item.lineStatus) +
            '</span>' +
            '<span style="font-weight: 600; font-size: 13px; color: #111827;">' + Helpers.escapeHtml(item.productName) + '</span>' +
            '</div>' +
            '<div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-top: 4px;">' +
            '<span><strong>SKU:</strong> ' + Helpers.escapeHtml(item.surewerxPartNumber) + '</span>' +
            (customSku ? '<span><strong>Distributor SKU:</strong> ' + Helpers.escapeHtml(customSku) + '</span>' : '') +
            (item.distributorPartNumber ? '<span><strong>Dist. SKU:</strong> ' + Helpers.escapeHtml(item.distributorPartNumber) + '</span>' : '') +
            '<span><strong>Qty:</strong> ' + item.quantity + '</span>' +
            '<span><strong>Unit Price:</strong> ' + Helpers.formatCurrency(item.unitPrice) + '</span>' +
            // Show voucher name if eligible (line-item level)
            (item.voucherEligible && item.eligibleVoucherName ?
              '<span><strong style="color: #059669;">Voucher:</strong> ' + Helpers.escapeHtml(item.eligibleVoucherName) + '</span>' : '') +
            '</div>' +
            '<div style="display: inline-flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f3f4f6;">' +
            // Show voucher name if this item was paid by voucher
            // If order has voucher applied (totalVoucherApplied > 0) and item has a voucher name
            // Match voucher name case-insensitively or if item qualifies for any voucher on the order
            (function() {
              // Show voucher if order has vouchers applied
              if (totalVoucherApplied > 0 || Object.keys(orderVoucherTotals).length > 0) {
                // Try to find voucher name from various sources
                var voucherName = item.eligibleVoucherName || item.voucherUsed || firstItem.voucherUsed;
                
                if (voucherName) {
                  // Find matching voucher name (exact or case-insensitive)
                  var matchingVoucherName = orderVoucherTotals[voucherName] ? voucherName :
                    Object.keys(orderVoucherTotals).find(function(vName) {
                      if (!vName || !voucherName) return false;
                      return vName.toLowerCase().trim() === voucherName.toLowerCase().trim();
                    });
                  
                  // If no exact match but we have a voucher name, use it
                  if (!matchingVoucherName && voucherName) {
                    matchingVoucherName = voucherName;
                  }
                  
                  // If still no match but order has vouchers, use the first voucher name
                  if (!matchingVoucherName && Object.keys(orderVoucherTotals).length > 0) {
                    matchingVoucherName = Object.keys(orderVoucherTotals)[0];
                  }
                  
                  if (matchingVoucherName) {
                    // Show voucher name only (no amount at line level)
                    var displayText = '<span style="color: #059669; font-weight: 600;">' + Helpers.escapeHtml(matchingVoucherName) + '</span>';
                    return displayText;
                  }
                } else if (Object.keys(orderVoucherTotals).length > 0) {
                  // Fallback: show first voucher if no specific voucher name found
                  var firstVoucherName = Object.keys(orderVoucherTotals)[0];
                  var displayText = '<span style="color: #059669; font-weight: 600;">' + Helpers.escapeHtml(firstVoucherName) + '</span>';
                  return displayText;
                }
              }
              return '';
            })() +
            // Only show refunded amount at line level (voucher calculations are at order level only)
            (item.refundedAmount && item.refundedAmount > 0 ?
              '<span><strong style="color: #dc2626;">Refunded:</strong> ' + Helpers.formatCurrency(item.refundedAmount) + '</span>' : '') +
            '</div>' +
            // Shipping info at line item level
            ((item.shippingCarrier || item.shippingMethod || item.trackingNumber || (shippingCost > 0 && orderItems.indexOf(item) === 0)) ?
              '<div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f3f4f6;">' +
              (item.shippingCarrier ? '<span><strong>Carrier:</strong> ' + Helpers.escapeHtml(item.shippingCarrier) + '</span>' : '') +
              (item.shippingMethod ? '<span><strong>Method:</strong> ' + Helpers.escapeHtml(item.shippingMethod) + '</span>' : '') +
              (item.trackingNumber ? '<span><strong>Tracking:</strong> ' + Helpers.escapeHtml(item.trackingNumber) + '</span>' : '') +
              (shippingCost > 0 && orderItems.indexOf(item) === 0 ? '<span><strong>Shipping:</strong> ' + Helpers.formatCurrency(shippingCost) + '</span>' : '') +
              '</div>' : '') +
            '</div>' +
            '<div style="text-align: right; flex-shrink: 0; min-width: 100px;">' +
            '<div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Line Total</div>' +
            '<div style="font-size: 16px; font-weight: 600; color: #111827;">' + Helpers.formatCurrency(item.totalPrice) + '</div>' +
            '<div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Cost: ' + Helpers.formatCurrency(item.distributorCost * item.quantity) + '</div>' +
            '</div>' +
            '</div>';
        }).join('') +
        '</div>' +
        '</div>';
    }).join('');
    
    return '<div class="panel panel-default">' +
      '<div class="panel-heading">' +
      '<h3 class="panel-title">Purchase Transactions</h3>' +
      '</div>' +
      '<div class="panel-body">' +
      (ordersHtml || '<p class="text-muted">No transactions found for the selected filters.</p>') +
      '</div>' +
      '</div>';
  },
  
  getFilteredTransactions: function() {
    // Only return transactions if a search has been performed
    if (!this.hasSearched) {
      return [];
    }
    
    var transactions = AppState.transactions;
    var filters = this.filters;
    
    return transactions.filter(function(t) {
      // Partner filter - check both partnerName and customerName for compatibility
      // Only apply when a specific customer is selected
      if (filters.partner && filters.partner !== 'all') {
        var partner = AppState.customers.find(function(p) { return p.id === filters.partner; });
        if (!partner) {
          return false;
        }
        // Check both partnerName (if exists) and customerName
        var transactionCustomerName = t.partnerName || t.customerName;
        if (!transactionCustomerName || transactionCustomerName !== partner.name) {
          return false;
        }
      }
      
      // Location ID filter (only applies if partner is selected)
      if (filters.partner !== 'all' && filters.locationId !== 'all') {
        var partner = AppState.customers.find(function(p) { return p.id === filters.partner; });
        if (partner) {
          // Find all groups with the selected location ID
          var groupsWithLocationId = partner.groups.filter(function(g) {
            return g.locationId === filters.locationId;
          });
          if (groupsWithLocationId.length === 0) {
            return false;
          }
          // Check if transaction's employee group matches any group with this location ID
          var groupNames = groupsWithLocationId.map(function(g) { return g.name; });
          if (groupNames.indexOf(t.employeeGroup) === -1) {
            return false;
          }
        }
      }
      
      // Order Number filter
      if (filters.orderNumber && filters.orderNumber.trim() !== '') {
        var orderNumberLower = filters.orderNumber.toLowerCase().trim();
        if (t.orderId && t.orderId.toLowerCase().indexOf(orderNumberLower) === -1) {
          return false;
        }
      }
      
      // Invoice Number filter
      if (filters.invoiceNumber && filters.invoiceNumber.trim() !== '') {
        var invoiceNumberLower = filters.invoiceNumber.toLowerCase().trim();
        if (t.invoiceNumber && t.invoiceNumber.toLowerCase().indexOf(invoiceNumberLower) === -1) {
        return false;
        }
      }
      
      // Date range filter (from/to dates)
      // Datepicker returns dates in MM/DD/YYYY format
      if (filters.dateFrom && filters.dateFrom.trim() !== '') {
        var fromDateStr = filters.dateFrom.trim();
        // Convert MM/DD/YYYY to Date object
        var fromDateParts = fromDateStr.split('/');
        var fromDate = new Date(parseInt(fromDateParts[2]), parseInt(fromDateParts[0]) - 1, parseInt(fromDateParts[1]));
        fromDate.setHours(0, 0, 0, 0);
        var transactionDate = new Date(t.dateOrdered);
        transactionDate.setHours(0, 0, 0, 0);
        
        if (transactionDate < fromDate) {
          return false;
        }
      }
      
      if (filters.dateTo && filters.dateTo.trim() !== '') {
        var toDateStr = filters.dateTo.trim();
        // Convert MM/DD/YYYY to Date object
        var toDateParts = toDateStr.split('/');
        var toDate = new Date(parseInt(toDateParts[2]), parseInt(toDateParts[0]) - 1, parseInt(toDateParts[1]));
        toDate.setHours(23, 59, 59, 999);
        var transactionDate = new Date(t.dateOrdered);
        transactionDate.setHours(0, 0, 0, 0);
        
        if (transactionDate > toDate) {
          return false;
        }
      }
      
      // Status filter (multi-select)
      if (filters.status && filters.status.length > 0) {
        if (filters.status.indexOf(t.lineStatus) === -1) {
          return false;
        }
      }
      
      // Distributor branch filter (SureWerx / Distributor users)
      if (filters.branchId && filters.branchId !== 'all') {
        if (!t.branchId || t.branchId !== filters.branchId) {
          return false;
        }
      }
      
      return true;
    });
  },
  
  performSearch: function() {
    // Update filters from form
    this.filters.partner = $('#filter-partner').val();
    
    // Require a specific customer selection before searching,
    // UNLESS the user is searching by Order # or Invoice # only
    var orderNumberInput = $('#filter-order-number').val().trim();
    var invoiceNumberInput = $('#filter-invoice-number').val().trim();
    var hasCustomer = !!this.filters.partner;
    var hasOrderOrInvoice = !!orderNumberInput || !!invoiceNumberInput;
    
    if (!hasCustomer && !hasOrderOrInvoice) {
      Helpers.showAlert('Please select a customer or enter an Order # / Invoice # before searching.', 'warning');
      return;
    }
    // Convert YYYY-MM-DD to MM/DD/YYYY for date filters
    var dateFrom = $('#filter-date-from').val().trim();
    if (dateFrom && dateFrom.match(/^\d{4}-\d{2}-\d{2}$/)) {
      var parts = dateFrom.split('-');
      this.filters.dateFrom = parts[1] + '/' + parts[2] + '/' + parts[0];
    } else {
      this.filters.dateFrom = dateFrom;
    }
    var dateTo = $('#filter-date-to').val().trim();
    if (dateTo && dateTo.match(/^\d{4}-\d{2}-\d{2}$/)) {
      var parts = dateTo.split('-');
      this.filters.dateTo = parts[1] + '/' + parts[2] + '/' + parts[0];
    } else {
      this.filters.dateTo = dateTo;
    }
    this.filters.locationId = $('#filter-location-id').val();
    this.filters.orderNumber = orderNumberInput;
    this.filters.invoiceNumber = invoiceNumberInput;
    this.filters.branchId = $('#filter-branch').val();
    // Status filter is already maintained in this.filters.status array
    
    // Mark that a search has been performed
    this.hasSearched = true;
    
    // Re-render transactions
    $('.panel-default').last().replaceWith(this.renderTransactions());
  },
  
  applyFilters: function() {
    // This function is kept for backward compatibility but now requires search
    if (this.hasSearched) {
      this.performSearch();
    }
  },
  
  initializeDateInputs: function() {
    var self = this;
    
    // Convert MM/DD/YYYY to YYYY-MM-DD for native date inputs
    function convertToNativeFormat(dateStr) {
      if (!dateStr) return '';
      // If already in YYYY-MM-DD format, return as is
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      // If in MM/DD/YYYY format, convert to YYYY-MM-DD
      if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        var parts = dateStr.split('/');
        var month = (parts[0].length < 2 ? '0' : '') + parts[0];
        var day = (parts[1].length < 2 ? '0' : '') + parts[1];
        var year = parts[2];
        return year + '-' + month + '-' + day;
      }
      return '';
    }
    
    // Convert YYYY-MM-DD to MM/DD/YYYY for filter storage
    function convertToFilterFormat(dateStr) {
      if (!dateStr) return '';
      // If in YYYY-MM-DD format, convert to MM/DD/YYYY
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        var parts = dateStr.split('-');
        return parts[1] + '/' + parts[2] + '/' + parts[0];
      }
      // If already in MM/DD/YYYY format, return as is
      return dateStr;
    }
    
    // Set initial values
    if (this.filters.dateFrom) {
      $('#filter-date-from').val(convertToNativeFormat(this.filters.dateFrom));
    }
    
    if (this.filters.dateTo) {
      $('#filter-date-to').val(convertToNativeFormat(this.filters.dateTo));
    }
    
    // Update filters when date changes (native date input uses YYYY-MM-DD)
    $('#filter-date-from').on('change', function() {
      var value = $(this).val();
      self.filters.dateFrom = convertToFilterFormat(value);
    });
    
    $('#filter-date-to').on('change', function() {
      var value = $(this).val();
      self.filters.dateTo = convertToFilterFormat(value);
    });
  },
  
  clearFilters: function() {
    // Default to first customer
    var customers = AppState.getFilteredCustomers();
    var defaultCustomerId = (customers && customers.length > 0) ? customers[0].id : '';
    
    this.filters = {
      partner: defaultCustomerId,
      dateFrom: '',
      dateTo: '',
      orderNumber: '',
      invoiceNumber: '',
      locationId: 'all',
      status: [],
      branchId: 'all'
    };
    
    $('#filter-partner').val(defaultCustomerId);
    $('#filter-date-from').val('');
    $('#filter-date-to').val('');
    $('#filter-order-number').val('');
    $('#filter-invoice-number').val('');
    $('#filter-location-id').val('all');
    $('#filter-branch').val('all');
    
    // Update location ID and branch filters and disable dependent filters
    this.updateLocationIdFilter();
    this.updateBranchFilter();
    this.updateFilterEnabledState();
    
    // Reset search state
    this.hasSearched = false;
    
    // Re-render transactions to show initial message
    $('.panel-default').last().replaceWith(this.renderTransactions());
    // Re-render filters to clear status badges
    $('.filter-panel').replaceWith(this.renderFilters());
    this.attachEvents();
    Helpers.showAlert('Filters cleared', 'success');
  },
  
  handleRefund: function(orderId) {
    var self = this;
    // Get ALL transactions from AppState (not filtered) to get fresh refund data
    var allTransactions = AppState.transactions || [];
    var orderTransactions = allTransactions.filter(function(t) { return t.orderId === orderId; });
    
    if (!orderTransactions || orderTransactions.length === 0) {
      Helpers.showAlert('Transaction not found', 'danger');
      return;
    }
    
    // Re-enrich transactions to ensure we have latest data
    if (AppState.enrichTransactions) {
      AppState.enrichTransactions();
      // Re-fetch after enrichment
      orderTransactions = AppState.transactions.filter(function(t) { return t.orderId === orderId; });
    }
    
    // Find all voucher-applied line items
    // Check for voucherAmountPaid OR voucherUsed OR if order has vouchers
    var voucherLines = orderTransactions.filter(function(t) {
      return (t.voucherAmountPaid && t.voucherAmountPaid > 0) || t.voucherUsed || t.eligibleVoucherName;
    });
    
    if (!voucherLines || voucherLines.length === 0) {
      Helpers.showAlert('No voucher-applied line items available to refund for this order.', 'warning');
      return;
    }
    
    // Store scroll position and element reference before showing modal
    var scrollPosition = $(window).scrollTop();
    var refundButton = $('.refund-order-btn[data-order-id="' + orderId + '"]');
    var orderElement = refundButton.closest('.transaction-order');
    var orderElementOffset = orderElement.length > 0 ? orderElement.offset().top - $(window).scrollTop() : null;
    
    // Build refund modal with flat list of line items
    var modalBodyHtml = '<p style="margin-bottom: 12px;">Select line items and quantities to refund. You can refund multiple items at once.</p>';
    
    modalBodyHtml += '<table class="table table-condensed table-bordered" style="font-size: 11px; margin-bottom: 12px;">' +
      '<thead>' +
      '<tr>' +
      '<th style="width: 30px; text-align: center;">Select</th>' +
      '<th>SKU</th>' +
      '<th>Product</th>' +
      '<th style="width: 80px; text-align: right;">Price</th>' +
      '<th style="width: 60px; text-align: right;">Qty</th>' +
      '<th style="width: 100px; text-align: right;">Refunded</th>' +
      '<th style="width: 100px; text-align: right;">Available</th>' +
      '<th style="width: 80px; text-align: center;">Qty to Refund</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>';
    
    voucherLines.forEach(function(line, lineIdx) {
      var totalQty = line.quantity || 0;
      var alreadyRefunded = line.refundedAmount || 0;
      var unitPrice = totalQty > 0 ? line.totalPrice / totalQty : 0;
      // Calculate how many units have already been refunded
      var alreadyRefundedQty = unitPrice > 0 ? Math.round((alreadyRefunded / unitPrice) * 100) / 100 : 0;
      var remainingQty = totalQty - alreadyRefundedQty;
      var remainingAmount = line.totalPrice - alreadyRefunded;
      
      // Disable if fully refunded
      var isFullyRefunded = remainingQty <= 0 || remainingAmount <= 0;
      var rowStyle = isFullyRefunded ? 'opacity: 0.5; background-color: #f9fafb;' : '';
      var disabledAttr = isFullyRefunded ? 'disabled' : '';
      var maxRefundQty = Math.floor(remainingQty);
      
      modalBodyHtml += '<tr style="' + rowStyle + '">' +
        '<td style="text-align: center; vertical-align: middle;">' +
        '<input type="checkbox" class="refund-line-checkbox" data-line-idx="' + lineIdx + '" ' + disabledAttr + '>' +
        '</td>' +
        '<td style="vertical-align: middle;">' + Helpers.escapeHtml(line.surewerxPartNumber || '') + '</td>' +
        '<td style="vertical-align: middle;">' + Helpers.escapeHtml(line.productName || '') + '</td>' +
        '<td style="text-align: right; vertical-align: middle;">' + Helpers.formatCurrency(line.totalPrice || 0) + '</td>' +
        '<td style="text-align: right; vertical-align: middle;">' + totalQty + '</td>' +
        '<td style="text-align: right; vertical-align: middle; color: ' + (alreadyRefunded > 0 ? '#dc2626' : '#6b7280') + ';">' + 
          (alreadyRefunded > 0 ? Helpers.formatCurrency(alreadyRefunded) : '-') + 
        '</td>' +
        '<td style="text-align: right; vertical-align: middle; color: ' + (remainingAmount > 0 ? '#059669' : '#6b7280') + '; font-weight: ' + (remainingAmount > 0 ? '600' : '400') + ';">' + 
          (remainingAmount > 0 ? Helpers.formatCurrency(remainingAmount) : '-') + 
        '</td>' +
        '<td style="text-align: center; vertical-align: middle;">' +
        '<input type="number" class="form-control input-sm refund-qty-input" data-line-idx="' + lineIdx + '" min="1" max="' + maxRefundQty + '" value="1" style="width: 60px; padding: 2px 4px; font-size: 11px; height: 24px;" ' + disabledAttr + '>' +
        '</td>' +
        '</tr>';
    });
    
    modalBodyHtml += '</tbody></table>';
    
    modalBodyHtml += '<p style="font-size: 11px; color: #6b7280; margin-top: 12px;">Note: If the original voucher is no longer active, the employee will not be able to use this refunded voucher amount.</p>';
    
    var modalHtml = '<div class="modal fade" id="refund-quantity-modal" tabindex="-1">' +
      '<div class="modal-dialog" style="max-width: 900px;">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">' +
      '<span class="glyphicon glyphicon-warning-sign text-warning"></span> Refund Order</h4>' +
      '</div>' +
      '<div class="modal-body" style="max-height: 600px; overflow-y: auto;">' +
      modalBodyHtml +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" id="refund-quantity-cancel-btn">Cancel</button>' +
      '<button type="button" class="btn btn-warning" id="refund-quantity-confirm-btn">Confirm Refund</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    // Remove any existing modal first
    $('#refund-quantity-modal').remove();
    
    $('body').append(modalHtml);
    $('#refund-quantity-modal').modal('show');
    
    // Store voucher lines in modal data for use in confirm handler
    $('#refund-quantity-modal').data('voucher-lines', voucherLines);
    $('#refund-quantity-modal').data('order-id', orderId);
    
    // Handle confirm
    $(document).off('click', '#refund-quantity-confirm-btn').on('click', '#refund-quantity-confirm-btn', function() {
      // Get all selected checkboxes
      var selectedCheckboxes = $('.refund-line-checkbox:checked');
      if (!selectedCheckboxes.length) {
        Helpers.showAlert('Please select at least one line item to refund.', 'warning');
        return;
      }
      
      // Get fresh data from AppState transactions (not stored groups which may be stale)
      var allTransactions = AppState.transactions || [];
      var orderTransactions = allTransactions.filter(function(t) { return t.orderId === orderId; });
      
      // Re-enrich to get latest data
      if (AppState.enrichTransactions) {
        AppState.enrichTransactions();
        orderTransactions = AppState.transactions.filter(function(t) { return t.orderId === orderId; });
      }
      
      // Get refundable voucher lines from modal data
      var storedVoucherLines = $('#refund-quantity-modal').data('voucher-lines') || [];
      
      // Validate and collect refund items
      var refundItems = [];
      var hasError = false;
      var errorMessage = '';
      
      selectedCheckboxes.each(function() {
        var lineIdx = parseInt($(this).data('line-idx'), 10);
        var qtyInput = $('.refund-qty-input[data-line-idx="' + lineIdx + '"]');
        var qtyToRefund = parseInt(qtyInput.val(), 10);
        
        if (isNaN(lineIdx) || !storedVoucherLines[lineIdx]) {
          hasError = true;
          errorMessage = 'Invalid line selection.';
          return false;
        }
        
        var line = storedVoucherLines[lineIdx];
        var totalQty = line.quantity || 0;
        var alreadyRefunded = line.refundedAmount || 0;
        var unitPrice = totalQty > 0 ? line.totalPrice / totalQty : 0;
        var alreadyRefundedQty = unitPrice > 0 ? Math.round((alreadyRefunded / unitPrice) * 100) / 100 : 0;
        var remainingQty = totalQty - alreadyRefundedQty;
        var maxRefundQty = Math.floor(remainingQty);
        
        if (isNaN(qtyToRefund) || qtyToRefund <= 0) {
          hasError = true;
          errorMessage = 'Please enter a valid quantity for ' + (line.productName || line.surewerxPartNumber) + '.';
          return false;
        }
        
        if (qtyToRefund > maxRefundQty) {
          hasError = true;
          errorMessage = 'Quantity to refund for ' + (line.productName || line.surewerxPartNumber) + ' cannot exceed ' + maxRefundQty + '.';
          return false;
        }
        
        var refundAmount = Math.round(unitPrice * qtyToRefund * 100) / 100;
        if (refundAmount <= 0) {
          hasError = true;
          errorMessage = 'Calculated refund amount is zero for ' + (line.productName || line.surewerxPartNumber) + '.';
          return false;
        }
        
        refundItems.push({
          line: line,
          qtyToRefund: qtyToRefund,
          refundAmount: refundAmount
        });
      });
      
      if (hasError) {
        Helpers.showAlert(errorMessage, 'warning');
        return;
      }
      
      if (refundItems.length === 0) {
        Helpers.showAlert('No valid items to refund.', 'warning');
        return;
      }
      
      // Calculate total refund amount
      var totalRefundAmount = refundItems.reduce(function(sum, item) {
        return sum + item.refundAmount;
      }, 0);
      
      // Build confirmation modal
      var confirmBodyHtml = '<div style="margin-bottom: 20px;">' +
        '<div style="padding: 12px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; margin-bottom: 16px;">' +
        '<div style="display: flex; align-items: flex-start; gap: 10px;">' +
        '<span class="glyphicon glyphicon-warning-sign" style="color: #f59e0b; font-size: 20px; margin-top: 2px;"></span>' +
        '<div style="flex: 1;">' +
        '<div style="font-weight: 600; color: #92400e; margin-bottom: 6px;">Critical Warning</div>' +
        '<ul style="margin: 0; padding-left: 18px; color: #92400e; font-size: 13px;">' +
        '<li style="margin-bottom: 4px;"><strong>This action cannot be undone.</strong></li>' +
        '<li style="margin-bottom: 4px;">Voucher amounts (if applicable) will be <strong>immediately available</strong> to the employee.</li>' +
        '<li>Credit card refunds will be processed according to payment provider policies.</li>' +
        '</ul>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Refund Summary:</div>' +
        '<table class="table table-condensed table-bordered" style="font-size: 12px; margin-bottom: 12px;">' +
        '<thead>' +
        '<tr>' +
        '<th>SKU</th>' +
        '<th>Product</th>' +
        '<th style="text-align: center;">Qty</th>' +
        '<th style="text-align: right;">Amount</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>';
      
      refundItems.forEach(function(item) {
        confirmBodyHtml += '<tr>' +
          '<td>' + Helpers.escapeHtml(item.line.surewerxPartNumber || '') + '</td>' +
          '<td>' + Helpers.escapeHtml(item.line.productName || '') + '</td>' +
          '<td style="text-align: center;">' + item.qtyToRefund + '</td>' +
          '<td style="text-align: right;">' + Helpers.formatCurrency(item.refundAmount) + '</td>' +
          '</tr>';
      });
      
      confirmBodyHtml += '</tbody>' +
        '<tfoot>' +
        '<tr style="font-weight: 600; background-color: #f9fafb;">' +
        '<td colspan="3" style="text-align: right;">Total Refund Amount:</td>' +
        '<td style="text-align: right;">' + Helpers.formatCurrency(totalRefundAmount) + '</td>' +
        '</tr>' +
        '</tfoot>' +
        '</table>' +
        '<div style="font-size: 13px; color: #6b7280; margin-top: 12px;">Please confirm that you want to process this refund.</div>' +
        '</div>';
      
      var confirmModalHtml = '<div class="modal fade" id="refund-confirmation-modal" tabindex="-1">' +
        '<div class="modal-dialog">' +
        '<div class="modal-content">' +
        '<div class="modal-header" style="background-color: #fef3c7; border-bottom: 2px solid #f59e0b;">' +
        '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
        '<h4 class="modal-title">' +
        '<span class="glyphicon glyphicon-warning-sign" style="color: #f59e0b;"></span> Confirm Refund</h4>' +
        '</div>' +
        '<div class="modal-body">' +
        confirmBodyHtml +
        '</div>' +
        '<div class="modal-footer">' +
        '<button type="button" class="btn btn-default" id="refund-final-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-danger" id="refund-final-confirm-btn">Confirm Refund</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';
      
      // Remove existing confirmation modal if present
      $('#refund-confirmation-modal').remove();
      
      // Append and show confirmation modal
      $('body').append(confirmModalHtml);
      $('#refund-confirmation-modal').modal('show');
      
      // Store refund items for final confirmation
      $('#refund-confirmation-modal').data('refund-items', refundItems);
      $('#refund-confirmation-modal').data('order-id', orderId);
      
      // Handle final confirmation
      $(document).off('click', '#refund-final-confirm-btn').on('click', '#refund-final-confirm-btn', function() {
        var storedRefundItems = $('#refund-confirmation-modal').data('refund-items') || [];
        var storedOrderId = $('#refund-confirmation-modal').data('order-id');
        
        // Process all refunds
        var refundCount = 0;
        storedRefundItems.forEach(function(item) {
          var line = item.line;
          var refundAmountForQty = item.refundAmount;
          var qtyToRefund = item.qtyToRefund;
          
          // Find the actual transaction in AppState.transactions (not filtered) to update it
          var actualTransaction = allTransactions.find(function(t) {
            return t.orderId === storedOrderId && 
                   t.surewerxPartNumber === line.surewerxPartNumber &&
                   t.quantity === line.quantity &&
                   t.totalPrice === line.totalPrice;
          });
          
          if (actualTransaction) {
            // Process refund - accumulate refunded amount and quantity
            if (!actualTransaction.refundedAmount) {
              actualTransaction.refundedAmount = 0;
            }
            if (!actualTransaction.refundedQuantity) {
              actualTransaction.refundedQuantity = 0;
            }
            actualTransaction.refundedAmount += refundAmountForQty;
            actualTransaction.refundedQuantity += qtyToRefund;
            // Cap at line total (cannot refund more than the line item cost)
            if (actualTransaction.refundedAmount > actualTransaction.totalPrice) {
              actualTransaction.refundedAmount = actualTransaction.totalPrice;
            }
            // Cap at original quantity
            if (actualTransaction.refundedQuantity > actualTransaction.quantity) {
              actualTransaction.refundedQuantity = actualTransaction.quantity;
            }
            
            // Calculate remaining balance on item
            var effectiveVoucher = (actualTransaction.voucherAmountPaid || 0) - (actualTransaction.refundedAmount || 0);
            if (effectiveVoucher < 0) effectiveVoucher = 0;
            actualTransaction.remainingBalance = actualTransaction.totalPrice - effectiveVoucher;
            
            refundCount++;
          }
        });
        
        $('#refund-confirmation-modal').modal('hide');
        $('#refund-quantity-modal').modal('hide');
        
        // Re-render transactions to show updated state
        if (self.hasSearched) {
          $('.panel-default').last().replaceWith(self.renderTransactions());
          Helpers.showAlert('Successfully processed ' + refundCount + ' refund' + (refundCount !== 1 ? 's' : ''), 'success');
          
          // Restore scroll position to show the refunded item
          setTimeout(function() {
            // Try to find the same order element after re-render
            var newOrderElement = $('.transaction-order').filter(function() {
              var orderHeader = $(this).find('.order-header');
              return orderHeader.length > 0 && orderHeader.text().indexOf('Order #' + storedOrderId) !== -1;
            }).first();
            
            if (newOrderElement.length > 0) {
              // Calculate the new scroll position to show the order
              var newScrollPosition = newOrderElement.offset().top - (orderElementOffset || 0);
              // Ensure we don't scroll to negative position
              newScrollPosition = Math.max(0, newScrollPosition);
              
              $('html, body').animate({
                scrollTop: newScrollPosition
              }, 300);
            } else {
              // Fallback: restore original scroll position
              $('html, body').animate({
                scrollTop: scrollPosition
              }, 300);
            }
          }, 150);
        }
      });
      
      // Handle final cancel
      $(document).off('click', '#refund-final-cancel-btn').on('click', '#refund-final-cancel-btn', function() {
        $('#refund-confirmation-modal').modal('hide');
      });
      
      // Cleanup confirmation modal on hide
      $('#refund-confirmation-modal').on('hidden.bs.modal', function() {
        $(this).remove();
      });
    });
    
    // Handle cancel
    $(document).off('click', '#refund-quantity-cancel-btn').on('click', '#refund-quantity-cancel-btn', function() {
      $('#refund-quantity-modal').modal('hide');
    });
    
    // Cleanup on hide
    $('#refund-quantity-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  exportToCSV: function() {
    var transactions = this.getFilteredTransactions();
    
    // Group transactions by order to get order-level data
    var orderGroups = {};
    transactions.forEach(function(t) {
      if (!orderGroups[t.orderId]) {
        orderGroups[t.orderId] = [];
      }
      orderGroups[t.orderId].push(t);
    });
    
    var csvData = [];
    
    // Process each order
    Object.keys(orderGroups).forEach(function(orderId) {
      var orderItems = orderGroups[orderId];
      var firstItem = orderItems[0];
      // Calculate order total only from items with Shipped or Processing status
      // Do not subtract refunded amounts - totals remain at original values
      var orderTotal = orderItems.reduce(function(sum, item) {
        if (item.lineStatus === 'Shipped' || item.lineStatus === 'Processing') {
          return sum + item.totalPrice;
        }
        return sum;
      }, 0);
      var shippingCost = firstItem.shippingCost || 0;
      var grandTotal = orderTotal + shippingCost;
      
      // Find user group information
      var partner = AppState.customers.find(function(p) { return p.name === (firstItem.partnerName || firstItem.customerName); });
      var group = null;
      var locationId = '';
      var locationName = '';
      var department = '';
      var addressLine1 = '';
      var addressCity = '';
      var addressState = '';
      var addressZip = '';
      if (partner && partner.groups && firstItem.employeeGroup) {
        group = partner.groups.find(function(g) { return g.name === firstItem.employeeGroup; });
        if (group) {
          locationId = group.locationId || '';
          locationName = group.location || '';
          department = group.department || '';
          if (group.addressLine1) {
            addressLine1 = group.addressLine1 || '';
            addressCity = group.addressCity || '';
            addressState = group.addressState || '';
            addressZip = group.addressZip || '';
          } else if (group.locationAddress) {
            // Try to parse the locationAddress if it exists but addressLine1 doesn't
            var parts = group.locationAddress.split(',');
            if (parts.length >= 3) {
              addressLine1 = parts[0].trim();
              addressCity = parts[1].trim();
              var stateZip = parts[2].trim().split(' ');
              addressState = stateZip[0] || '';
              addressZip = stateZip.slice(1).join(' ') || '';
            } else {
              addressLine1 = group.locationAddress;
            }
          }
        }
      }
      
      // Find employee to get employeeId or username and name parts
      var employee = null;
      var employeeIdentifier = '';
      var employeeIdentifierLabel = '';
      var employeeFirstName = '';
      var employeeLastName = '';
      if (partner && partner.employees && firstItem.employeeName) {
        employee = partner.employees.find(function(emp) {
          var empName = emp.firstName && emp.lastName ? emp.firstName + ' ' + emp.lastName : emp.name || '';
          return empName === firstItem.employeeName;
        });
        
        if (employee) {
          employeeFirstName = employee.firstName || '';
          employeeLastName = employee.lastName || '';
          
          if (partner.employeeFieldConfig) {
            if (partner.employeeFieldConfig.requireEmployeeId && employee.employeeId) {
              employeeIdentifier = employee.employeeId;
              employeeIdentifierLabel = 'Employee ID';
            } else if (partner.employeeFieldConfig.requireUsername && employee.username) {
              employeeIdentifier = employee.username;
              employeeIdentifierLabel = 'Username';
            } else if (employee.employeeId) {
              employeeIdentifier = employee.employeeId;
              employeeIdentifierLabel = 'Employee ID';
            } else if (employee.username) {
              employeeIdentifier = employee.username;
              employeeIdentifierLabel = 'Username';
            }
          }
        }
      }
      
      // Get distributor customer number from customer
      var distributorCustomerNumber = partner && partner.distributorCustomerId ? partner.distributorCustomerId : '';
      
      // Get distributor branch code from location
      var distributorBranchCode = '';
      if (partner && partner.locations && locationId) {
        var location = partner.locations.find(function(loc) { return loc.id === locationId; });
        if (location && location.distributorBranchId) {
          // Find the branch location to get the branchId (the actual branch code)
          var branchLocation = AppState.branchLocations.find(function(branch) { 
            return branch.id === location.distributorBranchId; 
          });
          if (branchLocation) {
            distributorBranchCode = branchLocation.branchId || '';
          }
        }
      }
      
      // Get order-level voucher information (from first item, same for all items in order)
      var orderVoucherTotals = firstItem.orderVoucherTotals || {};
      var totalVoucherApplied = firstItem.totalVoucherApplied || 0;
      // Always calculate remaining balance and credit card payment from voucher totals
      var orderRemainingBalance = grandTotal - totalVoucherApplied;
      var orderCreditCardPayment = orderRemainingBalance > 0 ? orderRemainingBalance : 0;
      
      // Calculate refunds (voucher refunds vs credit card refunds) - voucher first priority
      var totalVoucherRefunded = 0;
      var totalCreditCardCollection = 0; // Sum of all exceeded amounts (refund > voucher allocation per line)
      var totalRefunded = 0;
      
      // Track refunds per voucher
      var voucherRefundTotals = {};
      if (orderVoucherTotals && Object.keys(orderVoucherTotals).length > 0) {
        for (var vName in orderVoucherTotals) {
          if (orderVoucherTotals.hasOwnProperty(vName)) {
            voucherRefundTotals[vName] = 0;
          }
        }
      }
      
      orderItems.forEach(function(item) {
        if (item.refundedAmount && item.refundedAmount > 0) {
          totalRefunded += item.refundedAmount;
          
          // Determine the actual voucher amount allocated to this line item
          // When multiple items qualify for the same voucher and the total exceeds the limit,
          // we need to proportionally allocate the capped voucher amount across qualifying items
          var lineVoucherAllocation = 0;
          if (item.eligibleVoucherName && orderVoucherTotals && Object.keys(orderVoucherTotals).length > 0) {
            // Find matching voucher name (exact or case-insensitive)
            var matchingVoucherName = orderVoucherTotals[item.eligibleVoucherName] ? item.eligibleVoucherName :
              Object.keys(orderVoucherTotals).find(function(vName) {
                if (!vName || !item.eligibleVoucherName) return false;
                return vName.toLowerCase().trim() === item.eligibleVoucherName.toLowerCase().trim();
              });
            
            if (matchingVoucherName && orderVoucherTotals[matchingVoucherName]) {
              // Get the total amount applied from this voucher (already capped at voucher limit)
              var voucherAppliedAmount = orderVoucherTotals[matchingVoucherName];
              
              // Calculate the sum of all line items that qualified for this voucher
              var voucherQualifyingTotal = orderItems.reduce(function(sum, orderItem) {
                if (orderItem.eligibleVoucherName === matchingVoucherName ||
                    (orderItem.eligibleVoucherName && matchingVoucherName && 
                     orderItem.eligibleVoucherName.toLowerCase().trim() === matchingVoucherName.toLowerCase().trim())) {
                  return sum + orderItem.totalPrice;
                }
                return sum;
              }, 0);
              
              // Proportionally allocate the voucher amount to this line item
              // Allocation = (line item total / qualifying total) * voucher applied amount
              if (voucherQualifyingTotal > 0) {
                lineVoucherAllocation = (item.totalPrice / voucherQualifyingTotal) * voucherAppliedAmount;
              }
            }
          }
          
          // If no voucher allocation found, fall back to proportional allocation across all vouchers
          if (lineVoucherAllocation === 0 && totalVoucherApplied > 0 && orderTotal > 0) {
            var voucherRatio = totalVoucherApplied / orderTotal;
            lineVoucherAllocation = item.totalPrice * voucherRatio;
          }
          
          // Calculate how much of this refund exceeds the voucher allocation for this line
          if (item.refundedAmount > lineVoucherAllocation) {
            // This line's refund exceeded its voucher portion - track the excess
            var exceededAmount = item.refundedAmount - lineVoucherAllocation;
            totalCreditCardCollection += exceededAmount;
          }
          
          // Determine voucher refund amount (up to the line's voucher allocation)
          var lineVoucherRefund = Math.min(item.refundedAmount, lineVoucherAllocation);
          totalVoucherRefunded += lineVoucherRefund;
          
          // Allocate voucher refund to the specific voucher this line item is eligible for
          if (lineVoucherRefund > 0 && item.eligibleVoucherName && orderVoucherTotals && Object.keys(orderVoucherTotals).length > 0) {
            // Find matching voucher name
            var matchingVoucherName = orderVoucherTotals[item.eligibleVoucherName] ? item.eligibleVoucherName :
              Object.keys(orderVoucherTotals).find(function(vName) {
                if (!vName || !item.eligibleVoucherName) return false;
                return vName.toLowerCase().trim() === item.eligibleVoucherName.toLowerCase().trim();
              });
            
            if (matchingVoucherName) {
              // Allocate the full line voucher refund to this specific voucher
              voucherRefundTotals[matchingVoucherName] = (voucherRefundTotals[matchingVoucherName] || 0) + lineVoucherRefund;
            } else {
              // Fall back to proportional allocation if no matching voucher found
              if (totalVoucherApplied > 0) {
                for (var vName in orderVoucherTotals) {
                  if (orderVoucherTotals.hasOwnProperty(vName)) {
                    var voucherRatio = orderVoucherTotals[vName] / totalVoucherApplied;
                    var voucherRefundAmount = lineVoucherRefund * voucherRatio;
                    voucherRefundTotals[vName] = (voucherRefundTotals[vName] || 0) + voucherRefundAmount;
                  }
                }
              }
            }
          }
        }
      });
      
      // Round voucher refund totals to avoid floating point issues
      for (var vName in voucherRefundTotals) {
        if (voucherRefundTotals.hasOwnProperty(vName)) {
          voucherRefundTotals[vName] = Math.round(voucherRefundTotals[vName] * 100) / 100;
        }
      }
      
      // Calculate remaining balance: Only show if refund was made AND refund exceeded voucher amount
      var calculatedRemainingBalance = 0;
      if (totalRefunded > 0 && totalRefunded > totalVoucherApplied) {
        calculatedRemainingBalance = totalRefunded - totalVoucherApplied;
      }
      
      // Build voucher totals string (per voucher)
      var voucherTotalsStr = '';
      if (Object.keys(orderVoucherTotals).length > 0) {
        var voucherParts = [];
        for (var vName in orderVoucherTotals) {
          if (orderVoucherTotals.hasOwnProperty(vName)) {
            voucherParts.push(vName + ': ' + Helpers.formatCurrency(orderVoucherTotals[vName]));
          }
        }
        voucherTotalsStr = voucherParts.join('; ');
      } else if (totalVoucherApplied > 0) {
        voucherTotalsStr = 'Total: ' + Helpers.formatCurrency(totalVoucherApplied);
      }
      
      // Build voucher refund totals string (per voucher)
      var voucherRefundTotalsStr = '';
      if (Object.keys(voucherRefundTotals).length > 0) {
        var voucherRefundParts = [];
        for (var vName in voucherRefundTotals) {
          if (voucherRefundTotals.hasOwnProperty(vName) && voucherRefundTotals[vName] > 0) {
            voucherRefundParts.push(vName + ': ' + Helpers.formatCurrency(voucherRefundTotals[vName]));
          }
        }
        voucherRefundTotalsStr = voucherRefundParts.length > 0 ? voucherRefundParts.join('; ') : '';
      }
      
      // Build comma-separated list of voucher names used in order
      var voucherNamesList = '';
      if (Object.keys(orderVoucherTotals).length > 0) {
        voucherNamesList = Object.keys(orderVoucherTotals).join(', ');
      }
      
      // Parse shipping address into components (Line 1, City, State, Zip)
      var shippingLine1 = '';
      var shippingCity = '';
      var shippingState = '';
      var shippingZip = '';
      if (firstItem.shippingAddress) {
        var shippingParts = firstItem.shippingAddress.replace(/<br>/g, '|').split('|');
        if (shippingParts.length >= 3) {
          // Format: Name | Address Line | City, State Zip
          shippingLine1 = shippingParts.length > 1 ? shippingParts[1].trim() : '';
          var cityStateZip = shippingParts.length > 2 ? shippingParts[2].trim() : '';
          var cityStateZipParts = cityStateZip.split(',');
          if (cityStateZipParts.length >= 2) {
            shippingCity = cityStateZipParts[0].trim();
            var stateZip = cityStateZipParts[1].trim().split(' ');
            shippingState = stateZip[0] || '';
            shippingZip = stateZip.slice(1).join(' ') || '';
          }
        }
      }
      
      // Get employee ID and username
      var employeeId = '';
      var employeeUsername = '';
      if (employee) {
        employeeId = employee.employeeId || '';
        employeeUsername = employee.username || '';
      }
      
      // Find product to get distributor SKU and cost for each item
      orderItems.forEach(function(item) {
        var product = AppState.products.find(function(p) {
          return p.surewerxSku === item.surewerxPartNumber;
        });
        var distributorSku = product && product.customSku ? product.customSku : '';
        var distributorPrice = item.distributorCost || 0;
        var distributorLineTotal = distributorPrice * item.quantity;
        
        // Calculate line-level refund amounts
        var lineRefundedQty = item.refundedQuantity || 0;
        // Fallback: if refundedQuantity not set but refundedAmount exists, calculate from amount
        if (lineRefundedQty === 0 && item.refundedAmount && item.refundedAmount > 0 && item.unitPrice > 0) {
          lineRefundedQty = Math.round(item.refundedAmount / item.unitPrice);
        }
        var voucherRefundAmount = '';
        var distributorRefundAmount = '';
        if (lineRefundedQty > 0) {
          voucherRefundAmount = (item.unitPrice * lineRefundedQty).toFixed(2);
          distributorRefundAmount = (distributorPrice * lineRefundedQty).toFixed(2);
        }
        
        // Generate random return/credit info if there's a refund
        var returnReferenceNumber = '';
        var creditInvoiceNumber = '';
        var creditInvoiceDate = '';
        if (lineRefundedQty > 0) {
          returnReferenceNumber = 'RET-' + Math.floor(Math.random() * 900000 + 100000);
          creditInvoiceNumber = 'CRD-' + Math.floor(Math.random() * 900000 + 100000);
          var randomDate = new Date();
          randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
          creditInvoiceDate = randomDate.toISOString().split('T')[0];
        }
        
        // Build CSV row according to specification
        var csvRow = {
          // Invoice Information (1-2)
          'Invoice Number': item.invoiceNumber || '',
          'Invoice Date': Helpers.formatDate(item.invoiceDate) || '',
          
          // Distributor / Customer Information (3-12)
          'Distributor Customer Number': distributorCustomerNumber,
          'Distributor Branch Code': distributorBranchCode,
          'Customer Name': item.partnerName || item.customerName || '',
          'Location ID': locationId,
          'Location Name': locationName,
          'Department': department,
          'Department Address Line 1': addressLine1,
          'Department City': addressCity,
          'Department State': addressState,
          'Department Zip': addressZip,
          
          // Employee Information (13-20)
          'Employee ID': employeeId,
          'Employee Username': employeeUsername,
          'Employee First Name': employeeFirstName,
          'Employee Last Name': employeeLastName,
          'Shipping Line 1': shippingLine1,
          'Shipping City': shippingCity,
          'Shipping State': shippingState,
          'Shipping Zip': shippingZip,
          
          // SKU Information (21-23)
          'SureWerx SKU': item.surewerxPartNumber,
          'Distributor SKU': distributorSku,
          'Product Name': item.productName,
          
          // Line Level Transactional Information (24-31)
          'Distributor Price': distributorPrice.toFixed(2),
          'Customer Price': item.unitPrice.toFixed(2),
          'Quantity': item.quantity,
          'Distributor Line Total': distributorLineTotal.toFixed(2),
          'Line Total': item.totalPrice.toFixed(2),
          'Voucher Name': item.voucherUsed || item.eligibleVoucherName || '',
          'Line Status': item.lineStatus,
          'Tracking Number': item.trackingNumber || '',
          
          // Order Level Transactional Information (32-36)
          'Order ID': item.orderId,
          'Total Voucher Amount Applied': totalVoucherApplied.toFixed(2),
          'Cash Payment': orderCreditCardPayment.toFixed(2),
          'Payment Method': item.paymentMethod || '',
          'Voucher Names': voucherNamesList,
          
          // Return Level Transaction Information (37-42)
          'Voucher Refund Amount': voucherRefundAmount,
          'Distributor Refund Amount': distributorRefundAmount,
          'Credit Card Refund Amount': totalCreditCardCollection > 0 ? totalCreditCardCollection.toFixed(2) : '',
          'Return Reference Number': returnReferenceNumber,
          'Credit Invoice Number': creditInvoiceNumber,
          'Credit Invoice Date': creditInvoiceDate
        };
        
        csvData.push(csvRow);
      });
    });
    
    Helpers.exportToCSV(csvData, 'purchase-report-' + new Date().toISOString().split('T')[0] + '.csv');
  }
};
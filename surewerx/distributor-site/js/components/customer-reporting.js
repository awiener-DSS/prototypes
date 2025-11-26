// Partner Reporting Component - Similar to Reporting but filtered to partner's data only
var CustomerReportingComponent = {
  customerId: null,
  partner: null,
  filters: {
    dateFrom: '',
    dateTo: '',
    orderNumber: '',
    locationId: 'all',
    employee: '',
    employeeName: ''
  },
  hasSearched: false,
  availableEmployees: [],
  
  init: function() {
    // Get partner ID from current user
    if (!AppState.currentUser || !AppState.currentUser.customerId) {
      Helpers.showAlert('Customer information not found', 'danger');
      App.navigate('customer-detail', { customerId: AppState.currentUser.customerId });
      return;
    }
    
    this.customerId = AppState.currentUser.customerId;
    this.partner = AppState.getCustomerById(this.customerId);
    
    if (!this.partner) {
      Helpers.showAlert('Customer not found', 'danger');
      App.navigate('customer-detail', { customerId: this.customerId });
      return;
    }
    
    this.hasSearched = false;
    // Ensure transactions are enriched before rendering
    if (AppState.enrichTransactions) {
      AppState.enrichTransactions();
    }
    this.render();
    this.attachEvents();
  },
  
  render: function() {
    var html = '<div>' +
      Templates.header() +
      '<div class="container">' +
      '<div class="row mb-4">' +
      '<div class="col-md-8">' +
      '<button class="btn btn-default mb-3" id="back-to-partner">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to Customer Detail' +
      '</button>' +
      '<h2>Reporting</h2>' +
      '<p class="text-muted">Track transactions and performance for ' + Helpers.escapeHtml(this.partner.name) + '</p>' +
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
    $(document).on('click', '#back-to-partner', function() {
      App.navigate('customer-detail', { customerId: self.customerId });
    });
    
    // Export button
    $(document).on('click', '#export-csv-btn', function() {
      self.exportToCSV();
    });
    
    // Search button
    $(document).on('click', '#search-transactions-btn', function() {
      self.performSearch();
    });
    
    // Allow Enter key to trigger search on filter inputs (except employee typeahead)
    $(document).on('keypress', '#filter-date-from, #filter-date-to, #filter-location-id, #filter-order-number', function(e) {
      if (e.which === 13) { // Enter key
        e.preventDefault();
        $('#search-transactions-btn').click();
      }
    });
    
    // Update employee typeahead when location ID changes
    $(document).on('change', '#filter-location-id', function() {
      self.updateEmployeeTypeahead();
      // Reset employee input when location ID changes
      self.filters.employee = '';
      self.filters.employeeName = '';
      $('#filter-employee').val('');
    });
    
    // Employee typeahead input
    $(document).on('input', '#filter-employee', function() {
      var query = $(this).val();
      if (query.length > 0) {
        self.showEmployeeSuggestions(query);
      } else {
        self.hideEmployeeTypeahead();
      }
    });
    
    // Employee typeahead selection
    $(document).on('click', '.employee-typeahead-item', function() {
      var employeeKey = $(this).data('employee-key');
      var employeeName = $(this).data('employee-name');
      self.filters.employee = employeeKey;
      self.filters.employeeName = employeeName;
      $('#filter-employee').val(employeeName);
      self.hideEmployeeTypeahead();
    });
    
    // Hide typeahead when clicking outside
    $(document).on('click', function(e) {
      if (!$(e.target).closest('.employee-typeahead-container').length) {
        self.hideEmployeeTypeahead();
      }
    });
    
    // Clear filters button
    $(document).on('click', '#clear-filters-btn', function() {
      self.clearFilters();
    });
    
    // Initialize location ID and employee filters
    this.updateLocationIdFilter();
    this.updateEmployeeTypeahead();
  },
  
  updateLocationIdFilter: function() {
    var locationIdSelect = $('#filter-location-id');
    locationIdSelect.html('<option value="all">All Location IDs</option>');
    
    if (this.partner && this.partner.groups) {
      // Get unique location IDs
      var locationIds = [];
      this.partner.groups.forEach(function(group) {
        if (group.locationId && locationIds.indexOf(group.locationId) === -1) {
          locationIds.push(group.locationId);
        }
      });
      locationIds.sort();
      
      locationIds.forEach(function(locationId) {
        var selected = this.filters.locationId === locationId ? ' selected' : '';
        locationIdSelect.append('<option value="' + Helpers.escapeHtml(locationId) + '"' + selected + '>' + Helpers.escapeHtml(locationId) + '</option>');
      }.bind(this));
    }
  },
  
  updateEmployeeTypeahead: function() {
    var self = this;
    var employeeInput = $('#filter-employee');
    // Get the current value from the dropdown, not from filters (which may not be updated yet)
    var selectedLocationId = $('#filter-location-id').val();
    
    if (selectedLocationId && selectedLocationId !== 'all') {
      // Find all groups with the selected location ID
      var groupsWithLocationId = this.partner.groups.filter(function(g) {
        return g.locationId === selectedLocationId;
      });
      
      if (groupsWithLocationId.length > 0 && this.partner.employees) {
        // Get all group IDs with this location ID
        var groupIds = groupsWithLocationId.map(function(g) { return g.id; });
        
        // Filter employees by groups with the selected location ID
        var locationEmployees = this.partner.employees.filter(function(emp) {
          return groupIds.indexOf(emp.groupId) !== -1;
        });
        
        // Create a map of unique employees by id first
        var uniqueEmployeesByIdMap = new Map();
        locationEmployees.forEach(function(emp) {
          var key = emp.id;
          if (!uniqueEmployeesByIdMap.has(key)) {
            uniqueEmployeesByIdMap.set(key, emp);
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
      employeeInput.prop('disabled', false);
    } else {
      employeeInput.prop('disabled', true);
      this.filters.employee = '';
      this.filters.employeeName = '';
      employeeInput.val('');
      this.availableEmployees = [];
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
    return '<div class="filter-panel" style="padding: 12px;">' +
      '<h4 style="margin-top: 0; margin-bottom: 12px; font-size: 16px;">Filters</h4>' +
      '<form class="form-horizontal">' +
      '<div class="row" style="margin-bottom: 8px;">' +
      '<div class="col-md-3">' +
      '<div class="form-group" style="margin-bottom: 8px; margin-right: 10px; padding-left: 15px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Location ID</label>' +
      '<select class="form-control" id="filter-location-id" style="height: 32px; font-size: 13px;">' +
      '<option value="all">All Location IDs</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3">' +
      '<div class="form-group" style="margin-bottom: 8px; margin-left: 5px; margin-right: 5px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Employee</label>' +
      '<div class="employee-typeahead-container" style="position: relative;">' +
      '<input type="text" class="form-control" id="filter-employee" placeholder="Search employees..." disabled autocomplete="off" style="height: 32px; font-size: 13px;">' +
      '<div id="employee-typeahead-results" class="employee-typeahead-results" style="display: none;"></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="row" style="margin-bottom: 8px;">' +
      '<div class="col-md-3">' +
      '<div class="form-group" style="margin-bottom: 8px; margin-right: 10px; padding-left: 15px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Order #</label>' +
      '<input type="text" class="form-control" id="filter-order-number" placeholder="Order number" value="' + Helpers.escapeHtml(this.filters.orderNumber || '') + '" style="height: 32px; font-size: 13px;">' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3">' +
      '<div class="form-group" style="margin-bottom: 8px; margin-left: 5px; margin-right: 5px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Date From</label>' +
      '<input type="date" class="form-control" id="filter-date-from" value="' + Helpers.escapeHtml(this.filters.dateFrom || '') + '" style="height: 32px; font-size: 13px;">' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3">' +
      '<div class="form-group" style="margin-bottom: 8px; margin-left: 10px; padding-right: 15px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Date To</label>' +
      '<input type="date" class="form-control" id="filter-date-to" value="' + Helpers.escapeHtml(this.filters.dateTo || '') + '" style="height: 32px; font-size: 13px;">' +
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
    var self = this;
    
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
      var orderTotal = orderItems.reduce(function(sum, item) {
        if (item.lineStatus === 'Shipped' || item.lineStatus === 'Processing') {
          return sum + item.totalPrice;
        }
        return sum;
      }, 0);
      var shippingCost = firstItem.shippingCost || 0;
      var grandTotal = orderTotal + shippingCost;
      
      // Find user group information - get fresh partner reference
      var userGroupInfo = '';
      // Try both methods: by ID and by name (in case customerId doesn't match)
      var partner = AppState.getCustomerById(self.customerId) || AppState.customers.find(function(p) { return p.name === firstItem.partnerName; });
      
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
        // Try to find group by name (case-insensitive first, then exact match)
        var group = partner.groups.find(function(g) { 
          return g && g.name && g.name.toLowerCase() === firstItem.employeeGroup.toLowerCase(); 
        }) || partner.groups.find(function(g) { 
          return g && g.name === firstItem.employeeGroup; 
        });
        
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
          
          // Always create the div structure (matches distributor reporting exactly)
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
      
      // Build compact shipping info with better spacing
      var shippingInfo = '';
      var hasShippingData = firstItem.shippingCarrier || firstItem.shippingMethod || firstItem.trackingNumber || shippingCost > 0;
      if (hasShippingData) {
        shippingInfo = '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #6b7280; margin-top: 6px; line-height: 1.8;">';
        if (firstItem.shippingCarrier) {
          shippingInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Carrier:</strong> ' + Helpers.escapeHtml(firstItem.shippingCarrier) + '</span>';
        }
        if (firstItem.shippingMethod) {
          shippingInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Method:</strong> ' + Helpers.escapeHtml(firstItem.shippingMethod) + '</span>';
        }
        if (firstItem.trackingNumber) {
          shippingInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Tracking:</strong> ' + Helpers.escapeHtml(firstItem.trackingNumber) + '</span>';
        }
        if (shippingCost > 0) {
          shippingInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Shipping:</strong> ' + Helpers.formatCurrency(shippingCost) + '</span>';
        }
        shippingInfo += '</div>';
      }
      
      return '<div class="transaction-order" style="margin-bottom: 16px;">' +
        '<div class="order-header" style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">' +
        '<div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">' +
        '<div style="flex: 1; min-width: 200px;">' +
        '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">' +
        '<span style="font-weight: 600; font-size: 14px; color: #111827;">Order #' + Helpers.escapeHtml(orderId) + '</span>' +
        '<span class="label label-default" style="font-size: 11px; padding: 2px 6px;">' + Helpers.escapeHtml(firstItem.employeeGroup) + '</span>' +
        '</div>' +
        '<div style="font-size: 12px; color: #374151; margin-top: 2px;"><strong>' + Helpers.escapeHtml(firstItem.employeeName) + '</strong></div>' +
        employeeIdentifierDisplay +
        userGroupInfo +
        shippingAddressDisplay +
        shippingInfo +
        '</div>' +
        '<div style="text-align: right; flex-shrink: 0;">' +
        '<div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Order Total</div>' +
        '<div style="font-size: 18px; font-weight: 600; color: #111827;">' + Helpers.formatCurrency(orderTotal) + '</div>' +
        (shippingCost > 0 ? '<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">+ Shipping: ' + Helpers.formatCurrency(shippingCost) + '</div>' : '') +
        (shippingCost > 0 ? '<div style="font-size: 13px; font-weight: 600; color: #059669; margin-top: 4px; padding-top: 4px; border-top: 1px solid #d1d5db;">Total: ' + Helpers.formatCurrency(grandTotal) + '</div>' : '') +
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
            '</div>' +
            '<div style="display: inline-flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f3f4f6;">' +
            ((item.voucherAmountPaid > 0 && item.voucherUsed) ?
              '<span><strong style="color: #059669;">Voucher (' + Helpers.escapeHtml(item.voucherUsed) + '):</strong> ' + Helpers.formatCurrency(item.voucherAmountPaid) + '</span>' :
              (item.voucherAmountPaid > 0 ?
                '<span><strong style="color: #059669;">Voucher:</strong> ' + Helpers.formatCurrency(item.voucherAmountPaid) + '</span>' : '')) +
            (item.creditCardAmountPaid > 0 ?
              '<span><strong style="color: #2563eb;">Credit Card:</strong> ' + Helpers.formatCurrency(item.creditCardAmountPaid) + '</span>' : '') +
            '</div>' +
            '</div>' +
            '<div style="text-align: right; flex-shrink: 0; min-width: 100px;">' +
            '<div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Line Total</div>' +
            '<div style="font-size: 16px; font-weight: 600; color: #111827;">' + Helpers.formatCurrency(item.totalPrice) + '</div>' +
            '</div>' +
            '</div>';
        }).join('') +
        '</div>' +
        '</div>';
    }).join('');
    
    if (!ordersHtml || ordersHtml === '') {
      return '<div class="panel panel-default">' +
        '<div class="panel-heading">' +
        '<h3 class="panel-title">Purchase Transactions</h3>' +
        '</div>' +
        '<div class="panel-body text-center text-muted" style="padding: 40px;">' +
        '<p>No transactions found matching your search criteria.</p>' +
        '</div>' +
        '</div>';
    }
    
    return '<div class="panel panel-default">' +
      '<div class="panel-heading">' +
      '<h3 class="panel-title">Purchase Transactions</h3>' +
      '</div>' +
      '<div class="panel-body">' +
      ordersHtml +
      '</div>' +
      '</div>';
  },
  
  getFilteredTransactions: function() {
    var self = this;
    var filters = this.filters;
    
    // First, filter to only this partner's transactions
    var partnerTransactions = AppState.transactions.filter(function(t) {
      return t.partnerName === self.partner.name;
    });
    
    // Then apply other filters
    return partnerTransactions.filter(function(t) {
      // Location ID filter
      if (filters.locationId !== 'all') {
        // Find all groups with the selected location ID
        var groupsWithLocationId = self.partner.groups.filter(function(g) {
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
      
      // Employee filter (only applies if location ID is selected and employee is specified)
      // Match by employee name only, since email is not required
      if (filters.locationId !== 'all' && filters.employee && filters.employee.trim() !== '' && filters.employeeName) {
        if (!t.employeeName || t.employeeName.toLowerCase() !== filters.employeeName.toLowerCase()) {
          return false;
        }
      }
      
      // Order Number filter
      if (filters.orderNumber && filters.orderNumber.trim() !== '') {
        var orderNumberLower = filters.orderNumber.toLowerCase().trim();
        if (t.orderId && t.orderId.toLowerCase().indexOf(orderNumberLower) === -1) {
          return false;
        }
      }
      
      // Date range filter
      if (filters.dateFrom && filters.dateFrom.trim() !== '') {
        var fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        var transactionDate = new Date(t.dateOrdered);
        transactionDate.setHours(0, 0, 0, 0);
        
        if (transactionDate < fromDate) {
          return false;
        }
      }
      
      if (filters.dateTo && filters.dateTo.trim() !== '') {
        var toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        var transactionDate = new Date(t.dateOrdered);
        transactionDate.setHours(0, 0, 0, 0);
        
        if (transactionDate > toDate) {
          return false;
        }
      }
      
      return true;
    });
  },
  
  performSearch: function() {
    // Update filters from form
    this.filters.dateFrom = $('#filter-date-from').val().trim();
    this.filters.dateTo = $('#filter-date-to').val().trim();
    this.filters.locationId = $('#filter-location-id').val();
    // Employee is already set when selected from typeahead
    if (!this.filters.employee || this.filters.employee === '') {
      var typedValue = $('#filter-employee').val().trim();
      if (typedValue) {
        var matchingEmp = this.availableEmployees.find(function(emp) {
          return emp.name.toLowerCase() === typedValue.toLowerCase();
        });
        if (matchingEmp) {
          this.filters.employee = matchingEmp.key;
          this.filters.employeeName = matchingEmp.name;
        } else {
          this.filters.employee = '';
          this.filters.employeeName = '';
        }
      }
    }
    this.filters.orderNumber = $('#filter-order-number').val().trim();
    
    // Hide typeahead when searching
    this.hideEmployeeTypeahead();
    
    // Mark that a search has been performed
    this.hasSearched = true;
    
    // Re-render transactions
    $('.panel-default').last().replaceWith(this.renderTransactions());
  },
  
  clearFilters: function() {
    this.filters = {
      dateFrom: '',
      dateTo: '',
      orderNumber: '',
      locationId: 'all',
      employee: '',
      employeeName: ''
    };
    
    $('#filter-date-from').val('');
    $('#filter-date-to').val('');
    $('#filter-order-number').val('');
    $('#filter-location-id').val('all');
    $('#filter-employee').val('');
    
    // Update location ID and employee filters
    this.updateLocationIdFilter();
    this.updateEmployeeTypeahead();
    this.hideEmployeeTypeahead();
    
    // Reset search state
    this.hasSearched = false;
    
    // Re-render transactions
    $('.panel-default').last().replaceWith(this.renderTransactions());
  },
  
  exportToCSV: function() {
    var self = this;
    
    if (!this.hasSearched) {
      Helpers.showAlert('Please perform a search before exporting', 'warning');
      return;
    }
    
    var transactions = this.getFilteredTransactions();
    
    if (!transactions || transactions.length === 0) {
      Helpers.showAlert('No data to export', 'warning');
      return;
    }
    
    // Group by order ID
    var orderGroups = {};
    transactions.forEach(function(t) {
      if (!orderGroups[t.orderId]) {
        orderGroups[t.orderId] = [];
      }
      orderGroups[t.orderId].push(t);
    });
    
    // Build CSV data
    var csvData = [];
    Object.keys(orderGroups).forEach(function(orderId) {
      var orderItems = orderGroups[orderId];
      var firstItem = orderItems[0];
      
      // Find user group information - get fresh partner reference
      var locationId = '';
      var locationName = '';
      var department = '';
      var addressLine1 = '';
      var addressCity = '';
      var addressState = '';
      var addressZip = '';
      // Try both methods: by ID and by name (in case customerId doesn't match)
      var partner = AppState.getCustomerById(self.customerId) || AppState.customers.find(function(p) { return p.name === firstItem.partnerName; });
      if (partner && partner.groups && firstItem.employeeGroup) {
        // Try to find group by name (case-insensitive first, then exact match)
        var group = partner.groups.find(function(g) { 
          return g.name && g.name.toLowerCase() === firstItem.employeeGroup.toLowerCase(); 
        }) || partner.groups.find(function(g) { 
          return g.name === firstItem.employeeGroup; 
        });
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
      
      // Find employee to get employeeId or username
      var employee = null;
      var employeeIdentifier = '';
      var employeeIdentifierLabel = '';
      if (partner && partner.employees && firstItem.employeeName) {
        employee = partner.employees.find(function(emp) {
          var empName = emp.firstName && emp.lastName ? emp.firstName + ' ' + emp.lastName : emp.name || '';
          return empName === firstItem.employeeName;
        });
        
        if (employee && partner.employeeFieldConfig) {
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
      
      orderItems.forEach(function(item) {
        // Calculate order total only from items with Shipped or Processing status
        var orderTotal = orderItems.reduce(function(sum, i) {
          if (i.lineStatus === 'Shipped' || i.lineStatus === 'Processing') {
            return sum + i.totalPrice;
          }
          return sum;
        }, 0);
        var shippingCost = item.shippingCost || 0;
        var grandTotal = orderTotal + shippingCost;
        
        // Find the product to check for distributor SKU
        var product = AppState.products.find(function(p) {
          return p.surewerxSku === item.surewerxPartNumber;
        });
        var customSku = product && product.customSku ? product.customSku : '';
        
        var csvRow = {
          'Order #': item.orderId,
          'Date Ordered': Helpers.formatDate(item.dateOrdered),
          'Employee Name': item.employeeName,
          'User Group': item.employeeGroup,
          'Location ID': locationId,
          'Location Name': locationName,
          'Department': department,
          'Address Line 1': addressLine1,
          'City': addressCity,
          'State': addressState,
          'Zip': addressZip,
          'Product Name': item.productName,
          'SureWerx SKU': item.surewerxPartNumber,
          'Distributor SKU': customSku,
          'Quantity': item.quantity,
          'Unit Price': item.unitPrice,
          'Line Total': item.totalPrice,
          'Line Status': item.lineStatus,
          'Voucher Used': item.voucherUsed || '',
          'Voucher Amount': item.voucherAmountPaid || 0,
          'Credit Card Amount': item.creditCardAmountPaid || 0,
          'Shipping Address': (item.shippingAddress || '').replace(/<br>/g, ', '),
          'Shipping Carrier': item.shippingCarrier || '',
          'Shipping Method': item.shippingMethod || '',
          'Tracking Number': item.trackingNumber || '',
          'Shipping Cost': shippingCost,
          'Order Total': orderTotal,
          'Grand Total': grandTotal
        };
        
        // Add employee identifier (Employee ID or Username) based on customer configuration
        if (employeeIdentifierLabel) {
          csvRow[employeeIdentifierLabel] = employeeIdentifier;
        }
        
        csvData.push(csvRow);
      });
    });
    
    Helpers.exportToCSV(csvData, 'customer-transactions-' + new Date().toISOString().split('T')[0] + '.csv');
  }
};


// Reporting Component

var ReportingComponent = {
  filters: {
    partner: 'all',
    dateFrom: '',
    dateTo: '',
    orderNumber: '',
    invoiceNumber: '',
    locationId: 'all',
    employee: '',
    employeeName: ''
  },
  hasSearched: false,
  availableEmployees: [],
  
  init: function() {
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
    
    // Allow Enter key to trigger search on filter inputs (except employee typeahead)
    $(document).on('keypress', '#filter-partner, #filter-date-from, #filter-date-to, #filter-location-id, #filter-order-number, #filter-invoice-number', function(e) {
      if (e.which === 13) { // Enter key
        e.preventDefault();
        $('#search-transactions-btn').click();
      }
    });
    
    // Update location ID dropdown when partner changes
    $(document).on('change', '#filter-partner', function() {
      self.updateLocationIdFilter();
      // Reset employee filter when partner changes
      self.filters.employee = '';
      self.filters.employeeName = '';
      $('#filter-employee').val('').prop('disabled', true);
      self.hideEmployeeTypeahead();
    });
    
    // Update employee typeahead when location ID changes
    $(document).on('change', '#filter-location-id', function() {
      self.updateEmployeeTypeahead();
      // Reset employee input when location ID changes
      self.filters.employee = '';
      self.filters.employeeName = '';
      $('#filter-employee').val('');
    });
    
    // Employee typeahead functionality
    $(document).on('input', '#filter-employee', function() {
      var query = $(this).val().trim();
      self.filters.employeeName = query;
      if (query.length > 0) {
        self.showEmployeeSuggestions(query);
      } else {
        self.hideEmployeeTypeahead();
        self.filters.employee = '';
      }
    });
    
    // Handle clicking outside to close typeahead
    $(document).on('click', function(e) {
      if (!$(e.target).closest('.employee-typeahead-container').length) {
        self.hideEmployeeTypeahead();
      }
    });
    
    // Handle selection from typeahead
    $(document).on('click', '.employee-typeahead-item', function() {
      var empKey = $(this).data('employee-key');
      var empName = $(this).data('employee-name');
      self.filters.employee = empKey;
      self.filters.employeeName = empName;
      $('#filter-employee').val(empName);
      self.hideEmployeeTypeahead();
    });
    
    // Handle Enter key in employee typeahead (select first result or trigger search)
    $(document).on('keydown', '#filter-employee', function(e) {
      if (e.which === 13) { // Enter key
        e.preventDefault();
        var firstResult = $('.employee-typeahead-item').first();
        if (firstResult.length) {
          firstResult.click();
        } else {
          $('#search-transactions-btn').click();
        }
      } else if (e.which === 27) { // Escape key
        self.hideEmployeeTypeahead();
      }
    });
    
    // Initialize filters
    this.updateLocationIdFilter();
    this.updateEmployeeTypeahead();
    
    // Clear filters
    $(document).on('click', '#clear-filters-btn', function() {
      self.clearFilters();
    });
  },
  
  updateLocationIdFilter: function() {
    var customerId = $('#filter-partner').val();
    var locationIdSelect = $('#filter-location-id');
    
    // Clear existing options except "All Location IDs"
    locationIdSelect.html('<option value="all">All Location IDs</option>');
    
    if (customerId && customerId !== 'all') {
      var partner = AppState.getCustomerById(customerId);
      if (partner && partner.groups && partner.groups.length > 0) {
        // Get unique location IDs
        var locationIds = [];
        partner.groups.forEach(function(group) {
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
    }
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
    return '<div class="filter-panel" style="padding: 12px;">' +
      '<h4 style="margin-top: 0; margin-bottom: 12px; font-size: 16px;">Filters</h4>' +
      '<form class="form-horizontal">' +
      '<div class="row" style="margin-bottom: 8px;">' +
      '<div class="col-md-3">' +
      '<div class="form-group" style="margin-bottom: 8px; margin-right: 10px; padding-left: 15px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Customer</label>' +
      '<select class="form-control" id="filter-partner" style="height: 32px; font-size: 13px;">' +
      '<option value="all">All Customers</option>' +
      AppState.getFilteredCustomers().map(function(p) {
        var selected = self.filters.partner === p.id ? ' selected' : '';
        return '<option value="' + p.id + '"' + selected + '>' + Helpers.escapeHtml(p.name) + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3">' +
      '<div class="form-group" style="margin-bottom: 8px; margin-left: 5px; margin-right: 5px;">' +
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
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Invoice #</label>' +
      '<input type="text" class="form-control" id="filter-invoice-number" placeholder="Invoice number" value="' + Helpers.escapeHtml(this.filters.invoiceNumber || '') + '" style="height: 32px; font-size: 13px;">' +
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
      
      // Build compact invoice and shipping info with better spacing
      var invoiceInfo = '';
      var hasInvoiceData = firstItem.invoiceNumber || firstItem.invoiceDate || firstItem.invoiceDueDate || firstItem.terms;
      if (hasInvoiceData) {
        invoiceInfo = '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #6b7280; margin-top: 6px; line-height: 1.8;">';
        if (firstItem.invoiceNumber) {
          invoiceInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Invoice:</strong> ' + Helpers.escapeHtml(firstItem.invoiceNumber) + '</span>';
        }
        if (firstItem.invoiceDate) {
          invoiceInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Invoice Date:</strong> ' + Helpers.formatDate(firstItem.invoiceDate) + '</span>';
        }
        if (firstItem.invoiceDueDate) {
          invoiceInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Invoice Due:</strong> ' + Helpers.formatDate(firstItem.invoiceDueDate) + '</span>';
        }
        if (firstItem.terms) {
          invoiceInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Invoice Terms:</strong> ' + Helpers.escapeHtml(firstItem.terms) + '</span>';
        }
        invoiceInfo += '</div>';
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
        '<div style="font-size: 12px; color: #374151; margin-top: 2px;"><strong>' + Helpers.escapeHtml(firstItem.employeeName) + '</strong> • ' + Helpers.escapeHtml(firstItem.partnerName || firstItem.customerName || '') + '</div>' +
        employeeIdentifierDisplay +
        userGroupInfo +
        shippingAddressDisplay +
        invoiceInfo +
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
            ((item.creditCardAmountPaid > 0 || item.payrollDeductionAmountPaid > 0) ?
              '<span><strong style="color: #2563eb;">' + (item.payrollDeductionAmountPaid > 0 ? 'Payroll' : 'Credit Card') + ':</strong> ' + Helpers.formatCurrency(item.creditCardAmountPaid || item.payrollDeductionAmountPaid || 0) + '</span>' : '') +
            '</div>' +
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
      if (filters.partner !== 'all') {
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
      
      // Employee filter (only applies if location ID is selected and employee is specified)
      // Match by employee name only, since email is not required
      if (filters.partner !== 'all' && filters.locationId !== 'all' && filters.employee && filters.employee.trim() !== '' && filters.employeeName) {
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
      
      // Invoice Number filter
      if (filters.invoiceNumber && filters.invoiceNumber.trim() !== '') {
        var invoiceNumberLower = filters.invoiceNumber.toLowerCase().trim();
        if (t.invoiceNumber && t.invoiceNumber.toLowerCase().indexOf(invoiceNumberLower) === -1) {
        return false;
        }
      }
      
      // Date range filter (from/to dates)
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
    this.filters.partner = $('#filter-partner').val();
    this.filters.dateFrom = $('#filter-date-from').val().trim();
    this.filters.dateTo = $('#filter-date-to').val().trim();
    this.filters.locationId = $('#filter-location-id').val();
    // Employee is already set when selected from typeahead
    // If user typed but didn't select, use the typed value
    if (!this.filters.employee || this.filters.employee === '') {
      var typedValue = $('#filter-employee').val().trim();
      if (typedValue) {
        // Try to find matching employee by name
        var matchingEmp = this.availableEmployees.find(function(emp) {
          return emp.name.toLowerCase() === typedValue.toLowerCase();
        });
        if (matchingEmp) {
          this.filters.employee = matchingEmp.key;
          this.filters.employeeName = matchingEmp.name;
        } else {
          // If no exact match, clear it
          this.filters.employee = '';
          this.filters.employeeName = '';
        }
      }
    }
    this.filters.orderNumber = $('#filter-order-number').val().trim();
    this.filters.invoiceNumber = $('#filter-invoice-number').val().trim();
    
    // Hide typeahead when searching
    this.hideEmployeeTypeahead();
    
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
  
  clearFilters: function() {
    this.filters = {
      partner: 'all',
      dateFrom: '',
      dateTo: '',
      orderNumber: '',
      invoiceNumber: '',
      locationId: 'all',
      employee: '',
      employeeName: ''
    };
    
    $('#filter-partner').val('all');
    $('#filter-date-from').val('');
    $('#filter-date-to').val('');
    $('#filter-order-number').val('');
    $('#filter-invoice-number').val('');
    $('#filter-location-id').val('all');
    $('#filter-employee').val('');
    
    // Update location ID and employee filters
    this.updateLocationIdFilter();
    this.updateEmployeeTypeahead();
    this.hideEmployeeTypeahead();
    
    // Reset search state
    this.hasSearched = false;
    
    // Re-render transactions to show initial message
    $('.panel-default').last().replaceWith(this.renderTransactions());
    Helpers.showAlert('Filters cleared', 'success');
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
      
      // Find product to get distributor SKU for each item
      orderItems.forEach(function(item) {
        var product = AppState.products.find(function(p) {
          return p.surewerxSku === item.surewerxPartNumber;
        });
        var customSku = product && product.customSku ? product.customSku : '';
        
        var csvRow = {
          'Order ID': item.orderId,
          'Order Date': item.dateOrdered,
          'Invoice Number': item.invoiceNumber || '',
          'Invoice Date': item.invoiceDate || '',
          'Invoice Due Date': item.invoiceDueDate || '',
          'Invoice Terms': item.terms || '',
          'Shipping Address': (item.shippingAddress || '').replace(/<br>/g, ', '),
          'Shipping Carrier': item.shippingCarrier || '',
          'Shipping Method': item.shippingMethod || '',
          'Tracking Number': item.trackingNumber || '',
          'Shipping Cost': shippingCost > 0 && orderItems.indexOf(item) === 0 ? shippingCost.toFixed(2) : '0.00',
          'Order Total': orderTotal.toFixed(2),
          'Grand Total': grandTotal.toFixed(2),
          'Employee Name': item.employeeName,
          'User Group': item.employeeGroup,
          'Location ID': locationId,
          'Location Name': locationName,
          'Department': department,
          'Address Line 1': addressLine1,
          'City': addressCity,
          'State': addressState,
          'Zip': addressZip,
          'Customer': item.partnerName || item.customerName || '',
          'Product Name': item.productName,
          'SureWerx SKU': item.surewerxPartNumber,
          'Distributor SKU': customSku,
          'Quantity': item.quantity,
          'Unit Price': item.unitPrice.toFixed(2),
          'Line Total': item.totalPrice.toFixed(2),
          'Line Cost': (item.distributorCost * item.quantity).toFixed(2),
          'Line Status': item.lineStatus,
          'Voucher Amount Paid': (item.voucherAmountPaid || 0).toFixed(2),
          'Voucher Name': item.voucherUsed || '',
          'Credit Card Amount Paid': (item.creditCardAmountPaid || 0).toFixed(2),
          'Payroll Deduction Amount Paid': (item.payrollDeductionAmountPaid || 0).toFixed(2),
          'Payment Method': item.paymentMethod || ''
        };
        
        // Add employee identifier (Employee ID or Username) based on customer configuration
        if (employeeIdentifierLabel) {
          csvRow[employeeIdentifierLabel] = employeeIdentifier;
        }
        
        csvData.push(csvRow);
      });
    });
    
    Helpers.exportToCSV(csvData, 'purchase-report-' + new Date().toISOString().split('T')[0] + '.csv');
  }
};
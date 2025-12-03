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
    employeeName: '',
    status: [] // Array of selected statuses
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
    
    // Initialize date inputs (convert MM/DD/YYYY to YYYY-MM-DD for native date inputs)
    this.initializeDateInputs();
    
    // Clear filters
    $(document).on('click', '#clear-filters-btn', function() {
      self.clearFilters();
    });
    
    // Refund line item (SureWerx only)
    $(document).on('click', '.refund-line-item-btn', function(e) {
      e.stopPropagation();
      var orderId = $(this).data('order-id');
      var lineIndex = $(this).data('line-index');
      self.handleRefund(orderId, lineIndex);
    });
    
    // Status filter dropdown toggle
    $(document).on('click', '#status-filter-display', function(e) {
      e.stopPropagation();
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
      self.applyFilters();
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
      self.applyFilters();
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
      '<div class="row" style="margin-bottom: 8px; margin-left: 0; margin-right: 0;">' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Customer</label>' +
      '<select class="form-control" id="filter-partner" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '<option value="all">All Customers</option>' +
      AppState.getFilteredCustomers().map(function(p) {
        var selected = self.filters.partner === p.id ? ' selected' : '';
        return '<option value="' + p.id + '"' + selected + '>' + Helpers.escapeHtml(p.name) + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Location ID</label>' +
      '<select class="form-control" id="filter-location-id" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '<option value="all">All Location IDs</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Employee</label>' +
      '<div class="employee-typeahead-container" style="position: relative;">' +
      '<input type="text" class="form-control" id="filter-employee" placeholder="Search employees..." disabled autocomplete="off" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '<div id="employee-typeahead-results" class="employee-typeahead-results" style="display: none;"></div>' +
      '</div>' +
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
      '<div class="row" style="margin-bottom: 8px; margin-left: 0; margin-right: 0;">' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Order #</label>' +
      '<input type="text" class="form-control" id="filter-order-number" placeholder="Order number" value="' + Helpers.escapeHtml(this.filters.orderNumber || '') + '" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Invoice #</label>' +
      '<input type="text" class="form-control" id="filter-invoice-number" placeholder="Invoice number" value="' + Helpers.escapeHtml(this.filters.invoiceNumber || '') + '" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Date From</label>' +
      '<input type="date" class="form-control" id="filter-date-from" value="' + Helpers.escapeHtml(this.filters.dateFrom || '') + '" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Date To</label>' +
      '<input type="date" class="form-control" id="filter-date-to" value="' + Helpers.escapeHtml(this.filters.dateTo || '') + '" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
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
      
      // Calculate original order total (before refunds) to determine original credit card amount
      var originalOrderTotal = orderItems.reduce(function(sum, item) {
        if (item.lineStatus === 'Shipped' || item.lineStatus === 'Processing') {
          return sum + item.totalPrice; // Use original totalPrice, don't subtract refunds
        }
        return sum;
      }, 0);
      var originalGrandTotal = originalOrderTotal + shippingCost;
      
      // Calculate payment totals at order level
      var totalVoucherPaid = 0;
      var totalCreditCardPaid = 0;
      var totalRefunded = 0;
      var totalRemainingBalance = 0;
      var hasRefunds = false;
      var allItemsRefunded = true;
      orderItems.forEach(function(item) {
        if (item.voucherAmountPaid && item.voucherAmountPaid > 0) {
          totalVoucherPaid += item.voucherAmountPaid;
        }
        if (item.creditCardAmountPaid && item.creditCardAmountPaid > 0) {
          totalCreditCardPaid += item.creditCardAmountPaid;
        }
        if (item.refundedAmount && item.refundedAmount > 0) {
          totalRefunded += item.refundedAmount;
          hasRefunds = true;
          // Add remaining balance for this item
          if (item.remainingBalance !== undefined) {
            totalRemainingBalance += item.remainingBalance;
          }
        } else {
          allItemsRefunded = false;
        }
      });
      
      // Calculate original credit card amount using original grand total (before refunds)
      // Credit card amount never changes - it's based on the original order
      var originalCreditCardPaid = Math.max(0, originalGrandTotal - totalVoucherPaid);
      // Use the original credit card amount (credit card cannot be refunded)
      totalCreditCardPaid = originalCreditCardPaid;
      
      // Calculate remaining balance: Grand Total - Vouchers Refunded
      var orderRemainingBalance = grandTotal - totalRefunded;
      
      // Show remaining balance calculation if vouchers were refunded (even if remaining balance = 0)
      // Don't show if no vouchers were refunded
      var remainingBalanceDisplay = '';
      if (totalRefunded > 0) {
        var calculationDisplay = '<strong>Grand Total:</strong> ' + Helpers.formatCurrency(grandTotal) + ' - <strong>Vouchers Refunded:</strong> ' + Helpers.formatCurrency(totalRefunded);
        remainingBalanceDisplay = '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #dc2626; margin-top: 6px; line-height: 1.8; font-weight: 600;">' +
          '<span style="margin-right: 4px;">' + calculationDisplay + ' = <strong>Remaining Balance:</strong> ' + Helpers.formatCurrency(orderRemainingBalance) + '</span>' +
          '</div>';
      }
      
      // Credit card payment display at order level
      // Always show if credit card was originally used (based on original order total)
      // Credit card amount never changes - it cannot be refunded
      var creditCardDisplay = '';
      if (totalCreditCardPaid > 0 || totalVoucherPaid < originalGrandTotal) {
        creditCardDisplay = '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #2563eb; margin-top: 6px; line-height: 1.8; font-weight: 600;">' +
          '<span style="margin-right: 4px;"><strong>Credit Card Payment:</strong> ' + Helpers.formatCurrency(totalCreditCardPaid) + '</span>' +
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
        '<div style="font-size: 12px; color: #374151; margin-top: 2px;"><strong>' + Helpers.escapeHtml(firstItem.employeeName) + '</strong> • ' + Helpers.escapeHtml(firstItem.partnerName || firstItem.customerName || '') + '</div>' +
        employeeIdentifierDisplay +
        userGroupInfo +
        shippingAddressDisplay +
        shippingInfo +
        creditCardDisplay +
        remainingBalanceDisplay +
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
            (item.refundedAmount && item.refundedAmount > 0 ?
              '<span><strong style="color: #dc2626;">Refunded:</strong> ' + Helpers.formatCurrency(item.refundedAmount) + '</span>' : '') +
            '</div>' +
            // Invoice information at line item level
            ((item.invoiceNumber || item.invoiceDate || item.invoiceDueDate || item.terms) ?
              '<div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f3f4f6;">' +
              (item.invoiceNumber ? '<span><strong>Invoice #:</strong> ' + Helpers.escapeHtml(item.invoiceNumber) + '</span>' : '') +
              (item.invoiceDate ? '<span><strong>Invoice Date:</strong> ' + Helpers.formatDate(item.invoiceDate) + '</span>' : '') +
              (item.invoiceDueDate ? '<span><strong>Invoice Due:</strong> ' + Helpers.formatDate(item.invoiceDueDate) + '</span>' : '') +
              (item.terms ? '<span><strong>Invoice Terms:</strong> ' + Helpers.escapeHtml(item.terms) + '</span>' : '') +
              '</div>' : '') +
            '</div>' +
            '<div style="text-align: right; flex-shrink: 0; min-width: 100px;">' +
            '<div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Line Total</div>' +
            '<div style="font-size: 16px; font-weight: 600; color: #111827;">' + Helpers.formatCurrency(item.totalPrice) + '</div>' +
            '<div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Cost: ' + Helpers.formatCurrency(item.distributorCost * item.quantity) + '</div>' +
            // Refund button for SureWerx users only (only show if not already refunded)
            (AppState.currentUser && AppState.currentUser.role === 'SureWerx' && item.voucherAmountPaid > 0 && (!item.refundedAmount || item.refundedAmount === 0) ?
              '<button class="btn btn-sm btn-warning refund-line-item-btn" data-order-id="' + Helpers.escapeHtml(orderId) + '" data-line-index="' + orderItems.indexOf(item) + '" style="margin-top: 6px; font-size: 11px; padding: 2px 6px;">Refund</button>' : '') +
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
      
      return true;
    });
  },
  
  performSearch: function() {
    // Update filters from form
    this.filters.partner = $('#filter-partner').val();
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
    // Status filter is already maintained in this.filters.status array
    
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
    this.filters = {
      partner: 'all',
      dateFrom: '',
      dateTo: '',
      orderNumber: '',
      invoiceNumber: '',
      locationId: 'all',
      employee: '',
      employeeName: '',
      status: []
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
    // Re-render filters to clear status badges
    $('.filter-panel').replaceWith(this.renderFilters());
    this.attachEvents();
    Helpers.showAlert('Filters cleared', 'success');
  },
  
  handleRefund: function(orderId, lineIndex) {
    var self = this;
    // Get filtered transactions for this order (matching current search/filter state)
    var filteredTransactions = this.getFilteredTransactions();
    var orderTransactions = filteredTransactions.filter(function(t) { return t.orderId === orderId; });
    
    if (!orderTransactions || orderTransactions.length <= lineIndex) {
      Helpers.showAlert('Transaction not found', 'danger');
      return;
    }
    
    var item = orderTransactions[lineIndex];
    var refundAmount = item.voucherAmountPaid || 0;
    
    if (refundAmount <= 0) {
      Helpers.showAlert('No voucher amount to refund', 'warning');
      return;
    }
    
    // Store scroll position and element reference before showing modal
    var scrollPosition = $(window).scrollTop();
    var refundButton = $('.refund-line-item-btn[data-order-id="' + orderId + '"][data-line-index="' + lineIndex + '"]');
    var orderElement = refundButton.closest('.transaction-order');
    var orderElementOffset = orderElement.length > 0 ? orderElement.offset().top - $(window).scrollTop() : null;
    
    // Show confirmation modal
    var confirmMsg = 'Refund voucher amount of ' + Helpers.formatCurrency(refundAmount) + ' for line item: ' + Helpers.escapeHtml(item.productName) + '?';
    
    UIHelpers.showConfirmDialog({
      title: 'Confirm Refund',
      message: confirmMsg,
      confirmText: 'Confirm Refund',
      cancelText: 'Cancel',
      confirmClass: 'btn-warning',
      onConfirm: function() {
        // Find the actual transaction in AppState.transactions (not filtered) to update it
        var allTransactions = AppState.transactions;
        var actualTransaction = allTransactions.find(function(t) {
          return t.orderId === orderId && 
                 t.surewerxPartNumber === item.surewerxPartNumber &&
                 t.quantity === item.quantity &&
                 t.totalPrice === item.totalPrice;
        });
        
        if (!actualTransaction) {
          Helpers.showAlert('Transaction not found in system', 'danger');
          return;
        }
        
        // Process refund - mark the item as refunded
        if (!actualTransaction.refundedAmount) {
          actualTransaction.refundedAmount = 0;
        }
        actualTransaction.refundedAmount = refundAmount;
        
        // Calculate remaining balance on item: Item Total - Voucher Amount Applied
        actualTransaction.remainingBalance = actualTransaction.totalPrice - actualTransaction.voucherAmountPaid;
        
        // Do NOT change the status - keep original status
        
        // Re-render transactions to show updated state
        if (self.hasSearched) {
          $('.panel-default').last().replaceWith(self.renderTransactions());
          Helpers.showAlert('Refund processed successfully', 'success');
          
          // Restore scroll position to show the refunded item
          setTimeout(function() {
            // Try to find the same order element after re-render
            var newOrderElement = $('.transaction-order').filter(function() {
              var orderHeader = $(this).find('.order-header');
              return orderHeader.length > 0 && orderHeader.text().indexOf('Order #' + orderId) !== -1;
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
      },
      onCancel: function() {
        // User cancelled, do nothing
      }
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
      
      // Calculate order-level totals for credit card and remaining balance
      var totalVoucherPaid = 0;
      var totalRefunded = 0;
      var originalGrandTotal = grandTotal;
      orderItems.forEach(function(item) {
        if (item.voucherAmountPaid && item.voucherAmountPaid > 0) {
          totalVoucherPaid += item.voucherAmountPaid;
        }
        if (item.refundedAmount && item.refundedAmount > 0) {
          totalRefunded += item.refundedAmount;
        }
      });
      
      // Calculate original credit card amount using original grand total (before refunds)
      var originalCreditCardPaid = Math.max(0, originalGrandTotal - totalVoucherPaid);
      var totalCreditCardPaid = originalCreditCardPaid;
      
      // Calculate remaining balance: Grand Total - Vouchers Refunded
      var orderRemainingBalance = grandTotal - totalRefunded;
      
      // Find product to get distributor SKU for each item
      orderItems.forEach(function(item) {
        var product = AppState.products.find(function(p) {
          return p.surewerxSku === item.surewerxPartNumber;
        });
        var customSku = product && product.customSku ? product.customSku : '';
        
        var csvRow = {
          'Order ID': item.orderId,
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
          'Credit Card Payment': (totalCreditCardPaid > 0 || totalVoucherPaid < originalGrandTotal ? totalCreditCardPaid : 0).toFixed(2),
          'Remaining Balance': (totalRefunded > 0 ? orderRemainingBalance.toFixed(2) : ''),
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
          'Refunded Amount': (item.refundedAmount || 0).toFixed(2),
          'Credit Card Amount Paid': (item.creditCardAmountPaid || 0).toFixed(2),
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
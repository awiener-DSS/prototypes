// Partner Reporting Component - Similar to Reporting but filtered to partner's data only
var CustomerReportingComponent = {
  customerId: null,
  partner: null,
  filters: {
    dateFrom: '',
    dateTo: '',
    orderNumber: '',
    locationId: 'all',
    departmentId: 'all',
    employee: '',
    employeeName: '',
    status: [] // Array of selected statuses
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
    $(document).on('keypress', '#filter-date-from, #filter-date-to, #filter-location-id, #filter-department-id, #filter-order-number', function(e) {
      if (e.which === 13) { // Enter key
        e.preventDefault();
        $('#search-transactions-btn').click();
      }
    });
    
    // Update department filter when location changes
    $(document).on('change', '#filter-location-id', function() {
      // Reset department filter when location changes
      self.filters.departmentId = 'all';
      self.updateDepartmentFilter();
      self.updateEmployeeTypeahead();
      // Reset employee input when location ID changes
      self.filters.employee = '';
      self.filters.employeeName = '';
      $('#filter-employee').val('');
    });
    
    // Update employee typeahead when department changes
    $(document).on('change', '#filter-department-id', function() {
      self.filters.departmentId = $(this).val();
      self.updateEmployeeTypeahead();
      // Reset employee input when department changes
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
    
    // Initialize date inputs (convert MM/DD/YYYY to YYYY-MM-DD for native date inputs)
    this.initializeDateInputs();
    
    // Clear filters button
    $(document).on('click', '#clear-filters-btn', function() {
      self.clearFilters();
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
    
    // Initialize location, department, and employee filters
    this.updateLocationIdFilter();
    this.updateDepartmentFilter();
    this.updateEmployeeTypeahead();
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
    var locationIdSelect = $('#filter-location-id');
    locationIdSelect.html('<option value="all">All Locations</option>');
    
    if (this.partner) {
      // Try new structure first (locations with departments)
      if (this.partner.locations && this.partner.locations.length > 0) {
        // Get unique locations and build display names
        var locationMap = new Map();
        this.partner.locations.forEach(function(location) {
          if (location.locationId) {
            // Build display name: "Location ID - City, State" or just "Location ID"
            var displayName = location.locationId;
            if (location.city || location.state) {
              var cityState = [];
              if (location.city) cityState.push(location.city);
              if (location.state) cityState.push(location.state);
              if (cityState.length > 0) {
                displayName += ' - ' + cityState.join(', ');
              }
            }
            locationMap.set(location.locationId, displayName);
          }
        });
        
        // Sort by location ID
        var sortedLocations = Array.from(locationMap.entries()).sort(function(a, b) {
          return a[0].localeCompare(b[0]);
        });
        
        sortedLocations.forEach(function(entry) {
          var locationId = entry[0];
          var displayName = entry[1];
          var selected = this.filters.locationId === locationId ? ' selected' : '';
          locationIdSelect.append('<option value="' + Helpers.escapeHtml(locationId) + '"' + selected + '>' + Helpers.escapeHtml(displayName) + '</option>');
        }.bind(this));
      } else if (this.partner.groups) {
        // Fallback to old groups structure
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
    }
  },
  
  updateDepartmentFilter: function() {
    var departmentSelect = $('#filter-department-id');
    var selectedLocationId = $('#filter-location-id').val();
    
    // Disable department filter if no specific location is selected
    if (!selectedLocationId || selectedLocationId === 'all') {
      departmentSelect.html('<option value="all">Select a location first</option>');
      departmentSelect.prop('disabled', true);
      this.filters.departmentId = 'all';
      return;
    }
    
    // Enable department filter and populate with departments for selected location
    departmentSelect.prop('disabled', false);
    departmentSelect.html('<option value="all">All Departments</option>');
    
    if (this.partner) {
      // Try new structure first (locations with departments)
      if (this.partner.locations && this.partner.locations.length > 0) {
        // Find the selected location
        var selectedLocation = this.partner.locations.find(function(loc) {
          return loc.locationId === selectedLocationId;
        });
        
        if (selectedLocation && selectedLocation.departments && selectedLocation.departments.length > 0) {
          // Get departments for this location
          var departments = selectedLocation.departments.slice(); // Copy array
          
          // Sort departments by name
          departments.sort(function(a, b) {
            return a.name.localeCompare(b.name);
          });
          
          // Add departments to dropdown
          departments.forEach(function(dept) {
            var selected = this.filters.departmentId === dept.id ? ' selected' : '';
            departmentSelect.append('<option value="' + Helpers.escapeHtml(dept.id) + '"' + selected + '>' + Helpers.escapeHtml(dept.name) + '</option>');
          }.bind(this));
        }
      } else if (this.partner.groups) {
        // Fallback to old groups structure
        // Filter groups by selected location ID
        var groupsForLocation = this.partner.groups.filter(function(group) {
          return group.locationId === selectedLocationId && group.name;
        });
        
        if (groupsForLocation.length > 0) {
          // Sort groups by name
          groupsForLocation.sort(function(a, b) {
            return a.name.localeCompare(b.name);
          });
          
          // Add groups to dropdown
          groupsForLocation.forEach(function(group) {
            var selected = this.filters.departmentId === group.id ? ' selected' : '';
            departmentSelect.append('<option value="' + Helpers.escapeHtml(group.id) + '"' + selected + '>' + Helpers.escapeHtml(group.name) + '</option>');
          }.bind(this));
        }
      }
    }
  },
  
  updateEmployeeTypeahead: function() {
    var self = this;
    var employeeInput = $('#filter-employee');
    // Get the current value from the dropdown, not from filters (which may not be updated yet)
    var selectedLocationId = $('#filter-location-id').val();
    
    // Always enable the employee input
    employeeInput.prop('disabled', false);
    
    var selectedDepartmentId = $('#filter-department-id').val();
    var locationEmployees = [];
    
    // Try new structure first (locations with departments)
    if (this.partner.locations && this.partner.locations.length > 0 && this.partner.employees) {
      if (selectedDepartmentId && selectedDepartmentId !== 'all') {
        // Filter by specific department
        locationEmployees = this.partner.employees.filter(function(emp) {
          return emp.departmentId === selectedDepartmentId;
        });
      } else if (selectedLocationId && selectedLocationId !== 'all') {
        // Filter by location (all departments in that location)
        var selectedLocation = this.partner.locations.find(function(loc) {
          return loc.locationId === selectedLocationId;
        });
        
        if (selectedLocation && selectedLocation.departments) {
          var departmentIds = selectedLocation.departments.map(function(dept) { return dept.id; });
          locationEmployees = this.partner.employees.filter(function(emp) {
            return emp.locationId === selectedLocation.id && departmentIds.indexOf(emp.departmentId) !== -1;
          });
        }
      } else {
        // Show all employees
        locationEmployees = this.partner.employees;
      }
    } else if (this.partner.groups && this.partner.employees) {
      // Fallback to old groups structure
      if (selectedDepartmentId && selectedDepartmentId !== 'all') {
        // Filter by specific group/department
        locationEmployees = this.partner.employees.filter(function(emp) {
          return emp.groupId === selectedDepartmentId;
        });
      } else if (selectedLocationId && selectedLocationId !== 'all') {
        // Filter by location (all groups with that location ID)
        var groupsWithLocationId = this.partner.groups.filter(function(g) {
          return g.locationId === selectedLocationId;
        });
        
        if (groupsWithLocationId.length > 0) {
          var groupIds = groupsWithLocationId.map(function(g) { return g.id; });
          locationEmployees = this.partner.employees.filter(function(emp) {
            return groupIds.indexOf(emp.groupId) !== -1;
          });
        }
      } else {
        // Show all employees
        locationEmployees = this.partner.employees;
      }
    }
    
    // Process employees (whether filtered or all)
    if (locationEmployees.length > 0) {
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
    } else {
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
      '<div class="row" style="margin-bottom: 8px; margin-left: 0; margin-right: 0;">' +
      '<div class="col-md-4" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Location Name</label>' +
      '<select class="form-control" id="filter-location-id" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '<option value="all">All Locations</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Department Name</label>' +
      '<select class="form-control" id="filter-department-id" disabled style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '<option value="all">Select a location first</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Employee</label>' +
      '<div class="employee-typeahead-container" style="position: relative;">' +
      '<input type="text" class="form-control" id="filter-employee" placeholder="Search employees..." autocomplete="off" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '<div id="employee-typeahead-results" class="employee-typeahead-results" style="display: none;"></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      // Row 2: Status, Order Number, Date Range
      '<div class="row" style="margin-bottom: 8px; margin-left: 0; margin-right: 0;">' +
      '<div class="col-md-4" style="padding-left: 10px; padding-right: 10px;">' +
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
      '<div class="col-md-4" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Order #</label>' +
      '<input type="text" class="form-control" id="filter-order-number" placeholder="Order number" value="' + Helpers.escapeHtml(this.filters.orderNumber || '') + '" style="height: 32px; font-size: 13px; width: 90%; box-sizing: border-box;">' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4" style="padding-left: 10px; padding-right: 10px;">' +
      '<div class="form-group" style="margin-bottom: 8px;">' +
      '<label style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">Date Range</label>' +
      '<div style="display: flex; gap: 8px; align-items: center; width: 90%; box-sizing: border-box;">' +
      '<input type="date" class="form-control" id="filter-date-from" value="' + Helpers.escapeHtml(this.filters.dateFrom || '') + '" style="height: 32px; font-size: 13px; flex: 1;">' +
      '<span style="color: #6b7280; font-size: 13px; white-space: nowrap;">to</span>' +
      '<input type="date" class="form-control" id="filter-date-to" value="' + Helpers.escapeHtml(this.filters.dateTo || '') + '" style="height: 32px; font-size: 13px; flex: 1;">' +
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
            userGroupInfo += '<span style="margin-right: 4px;"><strong style="color: #374151;">Location Name:</strong> ' + Helpers.escapeHtml(group.locationId) + '</span>';
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
      
      // Calculate order-level voucher totals and payment breakdown (per requirements)
      var orderVoucherTotals = firstItem.orderVoucherTotals || {};
      var totalVoucherApplied = firstItem.totalVoucherApplied || 0;
      
      // Check for any vouchers specified in voucherUsed that aren't already in orderVoucherTotals
      // This handles cases where enrichTransactions missed some vouchers
      if (this.partner && this.partner.vouchers) {
        var partner = this.partner; // Store in local variable for scope
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
      
      // Calculate refunds (voucher refunds vs credit card refunds)
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
      
      // Get voucher details (limit and remaining balance) for each voucher
      // This is calculated AFTER refunds so it can account for refunded amounts
      var voucherDetails = {};
      if (this.partner && this.partner.vouchers && Object.keys(orderVoucherTotals).length > 0) {
        for (var voucherName in orderVoucherTotals) {
          if (orderVoucherTotals.hasOwnProperty(voucherName)) {
            var voucher = this.partner.vouchers.find(function(v) {
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
      
      return '<div class="transaction-order" style="margin-bottom: 16px;">' +
        '<div class="order-header" style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">' +
        '<div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">' +
        '<div style="flex: 1; min-width: 200px;">' +
        '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">' +
        '<span style="font-weight: 600; font-size: 14px; color: #111827;">Order #' + Helpers.escapeHtml(orderId) + '</span>' +
        '</div>' +
        '<div style="font-size: 12px; color: #374151; margin-top: 2px;"><strong>' + Helpers.escapeHtml(firstItem.employeeName) + '</strong></div>' +
        employeeIdentifierDisplay +
        userGroupInfo +
        shippingAddressDisplay +
        shippingInfo +
        paymentBreakdownDisplay +
        refundBreakdownDisplay +
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
            // Show voucher name if eligible (line-item level)
            (item.voucherEligible && item.eligibleVoucherName ?
              '<span><strong style="color: #059669;">Voucher:</strong> ' + Helpers.escapeHtml(item.eligibleVoucherName) + '</span>' : '') +
            '</div>' +
            (item.refundedAmount && item.refundedAmount > 0 ?
              '<div style="display: inline-flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f3f4f6;">' +
              '<span><strong style="color: #dc2626;">Refunded:</strong> ' + Helpers.formatCurrency(item.refundedAmount) + '</span>' +
              '</div>' : '') +
            // Invoice information at line item level
            ((item.invoiceNumber || item.invoiceDate || item.terms) ?
              '<div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f3f4f6;">' +
              (item.invoiceNumber ? '<span><strong>Invoice #:</strong> ' + Helpers.escapeHtml(item.invoiceNumber) + '</span>' : '') +
              (item.invoiceDate ? '<span><strong>Invoice Date:</strong> ' + Helpers.formatDate(item.invoiceDate) + '</span>' : '') +
              (item.terms ? '<span><strong>Invoice Terms:</strong> ' + Helpers.escapeHtml(item.terms) + '</span>' : '') +
              '</div>' : '') +
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
      // Location filter
      if (filters.locationId !== 'all') {
        var matchesLocation = false;
        
        // Try new structure first (locations with departments)
        if (self.partner.locations && self.partner.locations.length > 0) {
          // Find the location with matching locationId
          var selectedLocation = self.partner.locations.find(function(loc) {
            return loc.locationId === filters.locationId;
          });
          
          if (selectedLocation && selectedLocation.departments) {
            // Get all department names in this location
            var departmentNames = selectedLocation.departments.map(function(dept) { return dept.name; });
            // Check if transaction's employee group matches any department in this location
            matchesLocation = departmentNames.indexOf(t.employeeGroup) !== -1;
          }
        } else if (self.partner.groups) {
          // Fallback to old groups structure
          // Find all groups with the selected location ID
          var groupsWithLocationId = self.partner.groups.filter(function(g) {
            return g.locationId === filters.locationId;
          });
          if (groupsWithLocationId.length > 0) {
            // Check if transaction's employee group matches any group with this location ID
            var groupNames = groupsWithLocationId.map(function(g) { return g.name; });
            matchesLocation = groupNames.indexOf(t.employeeGroup) !== -1;
          }
        }
        
        if (!matchesLocation) {
          return false;
        }
      }
      
      // Department filter
      if (filters.departmentId !== 'all') {
        var matchesDepartment = false;
        
        // Try new structure first (locations with departments)
        if (self.partner.locations && self.partner.locations.length > 0) {
          // Find the department with matching ID
          var selectedDepartment = null;
          self.partner.locations.forEach(function(loc) {
            if (loc.departments) {
              var dept = loc.departments.find(function(d) { return d.id === filters.departmentId; });
              if (dept) {
                selectedDepartment = dept;
              }
            }
          });
          
          if (selectedDepartment) {
            // Check if transaction's employee group matches the selected department name
            matchesDepartment = t.employeeGroup === selectedDepartment.name;
          }
        } else if (self.partner.groups) {
          // Fallback to old groups structure
          var selectedGroup = self.partner.groups.find(function(g) {
            return g.id === filters.departmentId;
          });
          
          if (selectedGroup) {
            // Check if transaction's employee group matches the selected group name
            matchesDepartment = t.employeeGroup === selectedGroup.name;
          }
        }
        
        if (!matchesDepartment) {
          return false;
        }
      }
      
      // Employee filter (applies regardless of location ID selection)
      // Match by employee name only, since email is not required
      if (filters.employee && filters.employee.trim() !== '' && filters.employeeName) {
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
    this.filters.departmentId = $('#filter-department-id').val();
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
    // Status filter is already maintained in this.filters.status array
    
    // Hide typeahead when searching
    this.hideEmployeeTypeahead();
    
    // Mark that a search has been performed
    this.hasSearched = true;
    
    // Re-render transactions
    $('.panel-default').last().replaceWith(this.renderTransactions());
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
      dateFrom: '',
      dateTo: '',
      orderNumber: '',
      locationId: 'all',
      departmentId: 'all',
      employee: '',
      employeeName: '',
      status: []
    };
    
    $('#filter-date-from').val('');
    $('#filter-date-to').val('');
    $('#filter-order-number').val('');
    $('#filter-location-id').val('all');
    $('#filter-employee').val('');
    $('#filter-department-id').val('all');
    
    // Update location, department, and employee filters
    this.updateLocationIdFilter();
    this.updateDepartmentFilter();
    this.updateEmployeeTypeahead();
    this.hideEmployeeTypeahead();
    
    // Reset search state
    this.hasSearched = false;
    
    // Re-render transactions
    $('.panel-default').last().replaceWith(this.renderTransactions());
    // Re-render filters to clear status badges
    $('.filter-panel').replaceWith(this.renderFilters());
    this.attachEvents();
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
      
      // Calculate order totals once (before loop)
      var orderTotal = orderItems.reduce(function(sum, i) {
        if (i.lineStatus === 'Shipped' || i.lineStatus === 'Processing') {
          return sum + i.totalPrice;
        }
        return sum;
      }, 0);
      var shippingCost = firstItem.shippingCost || 0;
      var grandTotal = orderTotal + shippingCost;
      
      // Get order-level voucher information (from first item, same for all items in order)
      var orderVoucherTotals = firstItem.orderVoucherTotals || {};
      var totalVoucherApplied = firstItem.totalVoucherApplied || 0;
      // Always calculate remaining balance and credit card payment from voucher totals
      var orderRemainingBalance = grandTotal - totalVoucherApplied;
      var orderCreditCardPayment = orderRemainingBalance > 0 ? orderRemainingBalance : 0;
      
      // Calculate refunds (voucher refunds vs credit card refunds)
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
      
      // Get employee ID, username, and name parts
      var employeeId = '';
      var employeeUsername = '';
      var employeeFirstName = '';
      var employeeLastName = '';
      if (employee) {
        employeeId = employee.employeeId || '';
        employeeUsername = employee.username || '';
        employeeFirstName = employee.firstName || '';
        employeeLastName = employee.lastName || '';
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
          'Customer Name': partner ? partner.name : '',
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
          'Customer Price': item.unitPrice.toFixed(2),
          'Quantity': item.quantity,
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
          'Credit Card Refund Amount': totalCreditCardCollection > 0 ? totalCreditCardCollection.toFixed(2) : '',
          'Return Reference Number': returnReferenceNumber,
          'Credit Invoice Number': creditInvoiceNumber,
          'Credit Invoice Date': creditInvoiceDate
        };
        
        csvData.push(csvRow);
      });
    });
    
    Helpers.exportToCSV(csvData, 'customer-transactions-' + new Date().toISOString().split('T')[0] + '.csv');
  }
};


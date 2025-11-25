// Enhanced Employee Table Template

Templates.renderEmployeesTabEnhanced = function(customer) {
  var html = '<div class="row">' +
    '<div class="col-md-12">';
  
  // Check if customer has any user groups
  var hasGroups = customer.groups && customer.groups.length > 0;
  
  // Help Section - Conditional based on whether groups exist
  if (!hasGroups) {
    // No groups - show "Create User Groups First" message
    html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
      '<div style="display: flex; align-items: start; gap: 15px;">' +
      '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
      '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
      '</div>' +
      '<div style="flex: 1;">' +
      '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">Create User Groups First</h4>' +
      '<p style="margin: 0 0 12px 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
      'Before adding employees, you need to create user groups in the User Groups tab. Once user groups are created, you can add employees and assign them to those groups.' +
      '</p>' +
      '<button class="btn btn-sm btn-primary" onclick="CustomerDetailComponent.switchTab(\'groups\')">' +
      'Go to User Groups' +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  } else {
    // Has groups - show "How Employee Management Works" message
    html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
      '<div style="display: flex; align-items: start; gap: 15px;">' +
      '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
      '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
      '</div>' +
      '<div style="flex: 1;">' +
      '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">How Employee Management Works</h4>' +
      '<p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
      'Add individual employees by entering their details such as name and configured fields like Employee ID, Username, or date of birth. ' +
      'Each employee must be assigned to a user group when created. You can later reassign them to different user groups as needed. ' +
      'Use the bulk upload feature to add multiple employees at once from a CSV file.' +
      '</p>' +
      '</div>' +
      '</div>' +
      '</div>';
  }
  
  // Employees section only - full width
  html += '<div class="mb-4">' +
    '<div class="btn-toolbar" style="margin-bottom: 15px;">' +
    '<button class="btn btn-primary" id="add-employee-btn"' +
    (!hasGroups ? ' disabled title="Create user groups first"' : '') + '>' +
    '<span class="glyphicon glyphicon-plus"></span> Add Employee' +
    '</button> ' +
    '<button class="btn btn-primary" id="bulk-import-btn"' +
    (!hasGroups ? ' disabled title="Create user groups first"' : '') + '>' +
    '<span class="glyphicon glyphicon-upload"></span> Import Employees' +
    '</button>' +
    '</div>';
  
  // Only show search if groups exist
  if (hasGroups) {
    html += '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="input-group">' +
      '<span class="input-group-addon"><span class="glyphicon glyphicon-search"></span></span>' +
      '<input type="text" class="form-control" id="employee-search" placeholder="Search employees by name, ID, username, group, notes..." value="' + Helpers.escapeHtml(EmployeeTableEnhanced.searchTerm || '') + '">' +
      '<span class="input-group-btn">' +
      '<button class="btn btn-primary" type="button" id="search-employees-btn">' +
      '<span class="glyphicon glyphicon-search"></span> Search' +
      '</button>' +
      '</span>' +
      '</div>' +
      '</div>' +
      '</div>';
  }
  
  html += '</div>';
  
  // Only show employee table and bulk actions if groups exist
  if (hasGroups) {
    // Bulk actions toolbar (hidden by default)
    html += '<div id="bulk-actions-toolbar" class="alert alert-info" style="display: none;">' +
      '<div class="row">' +
      '<div class="col-sm-6">' +
      '<strong><span id="selected-count">0</span> employee(s) selected</strong>' +
      '</div>' +
      '<div class="col-sm-6 text-right">' +
      '<button class="btn btn-sm btn-primary" id="bulk-change-group-btn">' +
      '<span class="glyphicon glyphicon-transfer"></span> Change Group' +
      '</button> ' +
      '<button class="btn btn-sm btn-default" id="clear-selection-btn">' +
      '<span class="glyphicon glyphicon-remove"></span> Clear Selection' +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    if (customer.employees.length > 0) {
    // Filter employees if search term exists
    var employees = customer.employees;
    if (EmployeeTableEnhanced.searchTerm) {
      employees = EmployeeTableEnhanced.filterEmployees(employees, customer);
    }
    
    // Always show all identifier fields since they're all available as optional fields
    // This allows users to see and manage all fields even if they're not required
    var showEmployeeId = true; // Always show - available as optional field
    var showUsername = true; // Always show - available as optional field
    var showDateOfBirth = true; // Always show - available as optional field
    var showStartDate = true; // Always show - available as optional field
    
    html += '<div class="table-responsive">' +
      '<table class="table table-hover">' +
      '<thead>' +
      '<tr>' +
      '<th style="width: 30px;">' +
      '<input type="checkbox" id="select-all-employees">' +
      '</th>' +
      '<th>Name</th>' +
      (showEmployeeId ? '<th>Employee ID</th>' : '') +
      (showUsername ? '<th>Username</th>' : '') +
      (showDateOfBirth ? '<th>Date of Birth</th>' : '') +
      (showStartDate ? '<th>Start Date</th>' : '') +
      '<th>Group</th>' +
      '<th>Notes</th>' +
      '<th style="width: 120px;">Actions</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody id="employees-table-body">';
    
    if (employees.length === 0) {
      html += '<tr><td colspan="100%" class="text-center text-muted">No employees found matching your search.</td></tr>';
    } else {
      employees.forEach(function(emp) {
      var group = customer.groups.find(function(g) { return g.id === emp.groupId; });
      
      html += '<tr class="selectable-row" data-employee-id="' + emp.id + '" style="cursor: pointer;">' +
        '<td>' +
        '<input type="checkbox" class="employee-checkbox" data-employee-id="' + emp.id + '">' +
        '</td>' +
        '<td>' + Helpers.escapeHtml(emp.firstName ? emp.firstName + ' ' + emp.lastName : emp.name) + '</td>' +
        (showEmployeeId ? 
          '<td>' + Helpers.escapeHtml(emp.employeeId || '') + '</td>' : '') +
        (showUsername ? 
          '<td>' + Helpers.escapeHtml(emp.username || '') + '</td>' : '') +
        (showDateOfBirth ? 
          '<td>' + Helpers.formatDate(emp.dateOfBirth || '') + '</td>' : '') +
        (showStartDate ? 
          '<td>' + Helpers.formatDate(emp.startDate || '') + '</td>' : '') +
        '<td>' + (group ? Helpers.escapeHtml(group.name) : '-') + '</td>' +
        '<td>' + (emp.notes ? Helpers.escapeHtml(emp.notes) : '-') + '</td>' +
        '<td>' +
        '<div class="btn-group btn-group-xs">' +
        '<button class="btn btn-default edit-employee-btn" data-employee-id="' + emp.id + '" title="Edit" style="padding: 5px 10px; background-color: transparent; border-color: transparent; color: #6b7280;">' +
        '<span class="glyphicon glyphicon-pencil"></span>' +
        '</button>' +
        '<button class="btn btn-default delete-employee-btn" data-employee-id="' + emp.id + '" title="Delete" style="padding: 5px 10px; background-color: transparent; border-color: transparent; color: #dc2626;">' +
        '<span class="glyphicon glyphicon-trash"></span>' +
        '</button>' +
        '</div>' +
        '</td>' +
        '</tr>';
      });
    }
    
      html += '</tbody></table></div>';
    } else {
      html += '<div class="alert alert-info">No employees added yet. Click "Add Employee" to get started.</div>';
    }
  }
  
  html += '</div></div>';
  
  return html;
};
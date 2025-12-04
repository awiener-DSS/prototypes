// Enhanced Employee Table Template

Templates.renderEmployeesTabEnhanced = function(customer) {
  var html = '<div class="row">' +
    '<div class="col-md-12">';
  
  // Check if customer has any departments (in locations) or groups (legacy)
  var hasDepartments = false;
  if (customer.locations && customer.locations.length > 0) {
    hasDepartments = customer.locations.some(function(loc) {
      return loc.departments && loc.departments.length > 0;
    });
  }
  var hasGroups = customer.groups && customer.groups.length > 0;
  var hasAny = hasDepartments || hasGroups;
  
  // Help Section - Conditional based on whether departments exist
  if (!hasAny) {
    // No departments - show "Create Departments First" message
    html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
      '<div style="display: flex; align-items: start; gap: 15px;">' +
      '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
      '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
      '</div>' +
      '<div style="flex: 1;">' +
      '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">Create Departments First</h4>' +
      '<p style="margin: 0 0 12px 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
      'Before adding employees, you need to create locations and departments in the Locations and Departments tabs. Once departments are created, you can add employees and assign them to those departments.' +
      '</p>' +
      '<button class="btn btn-sm btn-primary" onclick="CustomerDetailComponent.switchTab(\'departments\')">' +
      'Go to Departments' +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  } else {
    // Has departments - show "How Employee Management Works" message
    html += '<div class="alert alert-info" style="background-color: #e3f2fd; border-color: #90caf9; margin-bottom: 20px;">' +
      '<div style="display: flex; align-items: start; gap: 15px;">' +
      '<div style="background-color: #bbdefb; padding: 10px; border-radius: 4px; flex-shrink: 0;">' +
      '<span class="glyphicon glyphicon-info-sign" style="font-size: 20px; color: #1976d2;"></span>' +
      '</div>' +
      '<div style="flex: 1;">' +
      '<h4 style="margin: 0 0 8px 0; color: #0d47a1; font-size: 14px; font-weight: 600;">How Employee Management Works</h4>' +
      '<p style="margin: 0; color: #1565c0; font-size: 13px; line-height: 1.5;">' +
      'Add individual employees by entering their details such as name and configured fields like Employee ID, Username, or date of birth. ' +
      'Each employee must be assigned to a department when created. You can later reassign them to different departments as needed. ' +
      'Use the bulk upload feature to add multiple employees at once from a CSV file.' +
      '</p>' +
      '</div>' +
      '</div>' +
      '</div>';
  }
  
  // Employees section only - full width
  html += '<div class="mb-4" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">';
  
  // Only show search if departments exist
  if (hasAny) {
    html += '<div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 300px;">' +
      '<div class="input-group" style="flex: 1; max-width: 500px;">' +
      '<span class="input-group-addon"><span class="glyphicon glyphicon-search"></span></span>' +
      '<input type="text" class="form-control" id="employee-search" placeholder="Search by name, ID, username, department, or notes" value="' + Helpers.escapeHtml(EmployeeTableEnhanced.searchTerm || '') + '">' +
      '<span class="input-group-btn" style="padding-left: 6px;">' +
      '<button class="btn btn-primary" type="button" id="search-employees-btn">' +
      '<span class="glyphicon glyphicon-search"></span> Search' +
      '</button>' +
      '</span>' +
      '</div>' +
      '</div>';
  } else {
    html += '<div></div>';
  }
  
  html += '<div style="display: flex; gap: 10px;">' +
    '<button class="btn btn-primary" id="add-employee-btn"' +
    (!hasAny ? ' disabled title="Create departments first"' : '') + '>' +
    '<span class="glyphicon glyphicon-plus"></span> Add Employee' +
    '</button>' +
    '<button class="btn btn-primary" id="bulk-import-btn"' +
    (!hasAny ? ' disabled title="Create departments first"' : '') + '>' +
    '<span class="glyphicon glyphicon-upload"></span> Import Employees' +
    '</button>' +
    '</div>' +
    '</div>';
  
  // Only show employee table and bulk actions if departments exist
  if (hasAny) {
    // Bulk actions toolbar (hidden by default)
    html += '<div id="bulk-actions-toolbar" class="alert alert-info" style="display: none;">' +
      '<div class="row">' +
      '<div class="col-sm-6">' +
      '<strong><span id="selected-count">0</span> employee(s) selected</strong>' +
      '</div>' +
      '<div class="col-sm-6 text-right">' +
      '<button class="btn btn-sm btn-primary" id="bulk-change-group-btn">' +
      '<span class="glyphicon glyphicon-transfer"></span> Change Department' +
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
      '<table class="table table-striped table-bordered">' +
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
      '<th>Department</th>' +
      '<th>Notes</th>' +
      '<th style="width: 120px;">Actions</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody id="employees-table-body">';
    
    if (employees.length === 0) {
      html += '<tr><td colspan="100%" class="text-center text-muted">No employees found matching your search.</td></tr>';
    } else {
      employees.forEach(function(emp) {
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
        '<td>' + departmentName + '</td>' +
        '<td>' + (emp.notes ? Helpers.escapeHtml(emp.notes) : '-') + '</td>' +
        '<td>' +
        '<button type="button" class="btn btn-xs btn-default edit-employee-btn" data-employee-id="' + emp.id + '" title="Edit">' +
        '<span class="glyphicon glyphicon-pencil"></span>' +
        '</button> ' +
        '<button type="button" class="btn btn-xs btn-danger delete-employee-btn" data-employee-id="' + emp.id + '" title="Delete">' +
        '<span class="glyphicon glyphicon-trash"></span>' +
        '</button>' +
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
// Extended employee modal templates

Templates.showEditEmployeeModal = function(partner, employee, customerId) {
  var modalHtml = '<div class="modal fade" id="edit-employee-modal" tabindex="-1">' +
    '<div class="modal-dialog">' +
    '<div class="modal-content">' +
    '<div class="modal-header">' +
    '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
    '<h4 class="modal-title">Edit Employee</h4>' +
    '</div>' +
    '<form id="edit-employee-form">' +
    '<div class="modal-body">' +
    '<div class="form-group">' +
    '<label>First Name *</label>' +
    '<input type="text" class="form-control" id="edit-employee-first-name" value="' + Helpers.escapeHtml(employee.firstName || employee.name.split(' ')[0] || '') + '" required>' +
    '</div>' +
    '<div class="form-group">' +
    '<label>Last Name *</label>' +
    '<input type="text" class="form-control" id="edit-employee-last-name" value="' + Helpers.escapeHtml(employee.lastName || employee.name.split(' ').slice(1).join(' ') || '') + '" required>' +
    '</div>' +
    // Employee ID - always show, required if configured
    '<div class="form-group">' +
    '<label>Employee ID' + (partner.employeeFieldConfig.requireEmployeeId ? ' *' : '') + '</label>' +
    '<input type="text" class="form-control" id="edit-employee-id" value="' + Helpers.escapeHtml(employee.employeeId || '') + '"' + (partner.employeeFieldConfig.requireEmployeeId ? ' required' : '') + ' placeholder="Optional">' +
    '</div>' +
    // Username - always show, required if configured
    '<div class="form-group">' +
    '<label>Username' + (partner.employeeFieldConfig.requireUsername ? ' *' : '') + '</label>' +
    '<input type="text" class="form-control" id="edit-employee-username" value="' + Helpers.escapeHtml(employee.username || '') + '"' + (partner.employeeFieldConfig.requireUsername ? ' required' : '') + ' placeholder="Optional">' +
    '</div>' +
    // Date of Birth - always show, required if configured
    '<div class="form-group">' +
    '<label>Date of Birth' + (partner.employeeFieldConfig.requireDateOfBirth ? ' *' : '') + '</label>' +
    '<input type="date" class="form-control" id="edit-employee-dob" value="' + (employee.dateOfBirth || '') + '"' + (partner.employeeFieldConfig.requireDateOfBirth ? ' required' : '') + '>' +
    '</div>' +
    // Start Date - always show, required if configured
    '<div class="form-group">' +
    '<label>Start Date' + (partner.employeeFieldConfig.requireStartDate ? ' *' : '') + '</label>' +
    '<input type="date" class="form-control" id="edit-employee-start-date" value="' + (employee.startDate || '') + '"' + (partner.employeeFieldConfig.requireStartDate ? ' required' : '') + '>' +
    '</div>';
  
  // Department (always shown, but disabled for editing)
  modalHtml += '<div class="form-group">' +
    '<label>Department</label>' +
    '<select class="form-control" id="edit-employee-department" disabled>' +
    (function() {
      var options = '';
      var currentDepartmentId = employee.departmentId || employee.groupId; // Support both
      var currentLocationId = employee.locationId;
      
      // Use new structure (locations -> departments)
      if (partner.locations && partner.locations.length > 0) {
        partner.locations.forEach(function(loc) {
          if (loc.departments && loc.departments.length > 0) {
            loc.departments.forEach(function(dept) {
              var selected = (dept.id === currentDepartmentId && loc.id === currentLocationId) ? ' selected' : '';
              options += '<option value="' + dept.id + '" data-location-id="' + loc.id + '"' + selected + '>' +
                Helpers.escapeHtml(loc.locationId || 'Unnamed') + ' - ' + Helpers.escapeHtml(dept.name) +
                '</option>';
            });
          }
        });
      }
      
      // Fallback to old groups structure
      return options;
    })() +
    '</select>' +
    '<p class="help-block"><small class="text-muted">Department changes must be done through the "Change Department" feature on the Employees tab</small></p>' +
    '</div>';
  
  // Notes (always shown)
  modalHtml += '<div class="form-group">' +
    '<label>Notes</label>' +
    '<textarea class="form-control" id="edit-employee-notes" rows="3" placeholder="Optional notes about this employee...">' + Helpers.escapeHtml(employee.notes || '') + '</textarea>' +
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
  $('#edit-employee-modal').modal('show');
  
  $(document).off('submit', '#edit-employee-form').on('submit', '#edit-employee-form', function(e) {
    e.preventDefault();
    
    var firstName = $('#edit-employee-first-name').val();
    var lastName = $('#edit-employee-last-name').val();
    
    // Department cannot be changed through edit - use "Change Department" feature instead
    // Keep the existing department and location values
    var keepDepartmentId = employee.departmentId || employee.groupId;
    var keepLocationId = employee.locationId;
    
    // Get all identifier fields (both required and optional)
    var employeeId = $('#edit-employee-id').val().trim() || undefined;
    var username = $('#edit-employee-username').val().trim() || undefined;
    var dateOfBirth = $('#edit-employee-dob').val() || undefined;
    var startDate = $('#edit-employee-start-date').val() || undefined;
    
    var updatedEmployeeData = {
      firstName: firstName,
      lastName: lastName,
      name: firstName + ' ' + lastName,
      employeeId: employeeId,
      username: username,
      dateOfBirth: dateOfBirth,
      startDate: startDate,
      departmentId: keepDepartmentId,
      locationId: keepLocationId || null,
      // Keep groupId for backward compatibility
      notes: $('#edit-employee-notes').val() || ''
    };
    
    // Department changes are not allowed through edit modal
    // Voucher balances remain unchanged
    
    // Update employee
    var updatedEmployees = partner.employees.map(function(e) {
      if (e.id === employee.id) {
        return Object.assign({}, e, updatedEmployeeData);
      }
      return e;
    });
    
    // Update employee counts in departments
    var updatedLocations = null;
    var updatedGroups = null;
    
    // Use new structure (locations -> departments)
    if (partner.locations && partner.locations.length > 0) {
      updatedLocations = partner.locations.map(function(loc) {
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
      employees: updatedEmployees
    };
    if (updatedLocations) {
      updateData.locations = updatedLocations;
    }
    if (updatedGroups) {
      updateData.groups = updatedGroups;
    }
    
    AppState.updateCustomer(customerId, updateData);
    
    $('#edit-employee-modal').modal('hide');
    CustomerDetailComponent.renderTabContent('employees');
    Helpers.showAlert('Employee updated successfully', 'success');
  });
  
  $('#edit-employee-modal').on('hidden.bs.modal', function() {
    $(this).remove();
  });
};

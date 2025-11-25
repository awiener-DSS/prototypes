// Extended employee modal templates

Templates.showEditEmployeeModal = function(partner, employee, customerId) {
  console.log('Edit Employee Modal - Partner Config:', partner.employeeFieldConfig);
  console.log('Edit Employee Modal - Employee Data:', employee);
  
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
  
  // User Group (always shown)
  modalHtml += '<div class="form-group">' +
    '<label>User Group *</label>' +
    '<select class="form-control" id="edit-employee-group" required>' +
    partner.groups.map(function(g) {
      var groupVouchers = partner.vouchers.filter(function(v) {
        return v.userGroupIds && v.userGroupIds.indexOf(g.id) > -1;
      });
      var totalAmount = groupVouchers.reduce(function(sum, v) { return sum + v.defaultAmount; }, 0);
      var selected = g.id === employee.groupId ? ' selected' : '';
      return '<option value="' + g.id + '"' + selected + '>' +
        Helpers.escapeHtml(g.name) + ' - $' + totalAmount.toFixed(2) + ' (' + groupVouchers.length + ' vouchers)' +
        '</option>';
    }).join('') +
    '</select>' +
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
    var newGroupId = $('#edit-employee-group').val();
    var oldGroupId = employee.groupId;
    
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
      groupId: newGroupId,
      notes: $('#edit-employee-notes').val() || ''
    };
    
    // If group changed, update voucher balances
    if (newGroupId !== oldGroupId) {
      var groupVouchers = partner.vouchers.filter(function(v) {
        return v.userGroupIds && v.userGroupIds.indexOf(newGroupId) > -1;
      });
      
      var totalBalance = groupVouchers.reduce(function(sum, v) { return sum + v.defaultAmount; }, 0);
      var voucherBalances = groupVouchers.map(function(v) {
        return {
          voucherId: v.id,
          remainingAmount: v.defaultAmount
        };
      });
      var voucherExpiry = groupVouchers.length > 0 ? groupVouchers[0].endDate : '';
      
      updatedEmployeeData.voucherBalances = voucherBalances;
      updatedEmployeeData.remainingBalance = totalBalance;
      updatedEmployeeData.voucherExpiry = voucherExpiry;
    }
    
    console.log('Updating employee with data:', updatedEmployeeData);
    
    // Update employee
    var updatedEmployees = partner.employees.map(function(e) {
      if (e.id === employee.id) {
        return Object.assign({}, e, updatedEmployeeData);
      }
      return e;
    });
    
    // Update employee counts in groups
    var updatedGroups = partner.groups.map(function(group) {
      var count = updatedEmployees.filter(function(e) { return e.groupId === group.id; }).length;
      return Object.assign({}, group, { employeeCount: count });
    });
    
    AppState.updateCustomer(customerId, {
      employees: updatedEmployees,
      groups: updatedGroups
    });
    
    $('#edit-employee-modal').modal('hide');
    CustomerDetailComponent.renderTabContent('employees');
    Helpers.showAlert('Employee updated successfully', 'success');
  });
  
  $('#edit-employee-modal').on('hidden.bs.modal', function() {
    $(this).remove();
  });
};

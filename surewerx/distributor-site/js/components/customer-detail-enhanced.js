// Enhanced Customer Detail Component Event Handlers

// Add these event handlers to customer-detail.js attachEvents method

// Export employees
$(document).on('click', '#export-employees-btn', function() {
  var customer = AppState.getCustomerById(CustomerDetailComponent.customerId);
  EmployeeTableEnhanced.exportToCSV(customer.employees, customer.groups, customer);
});

// Select all employees
$(document).on('change', '#select-all-employees', function() {
  var customer = AppState.getCustomerById(CustomerDetailComponent.customerId);
  EmployeeTableEnhanced.toggleSelectAll(customer.employees);
});

// Select individual employee checkbox
$(document).on('change', '.employee-checkbox', function(e) {
  e.stopPropagation(); // Prevent row click from triggering
  var employeeId = $(this).data('employee-id');
  EmployeeTableEnhanced.toggleSelection(employeeId);
});

// Click on employee row to toggle checkbox
$(document).on('click', '.selectable-row[data-employee-id]', function(e) {
  // Don't trigger if clicking on a button, checkbox, or link
  if ($(e.target).closest('button, .btn, .employee-checkbox, a').length > 0) {
    return;
  }
  
  var $row = $(this);
  var employeeId = $row.data('employee-id');
  var $checkbox = $row.find('.employee-checkbox');
  
  // Toggle the checkbox
  if ($checkbox.length > 0) {
    $checkbox.prop('checked', !$checkbox.prop('checked'));
    $checkbox.trigger('change');
  }
});

// Clear selection
$(document).on('click', '#clear-selection-btn', function() {
  EmployeeTableEnhanced.clearSelection();
});

// Bulk change group
$(document).on('click', '#bulk-change-group-btn', function() {
  var customer = AppState.getCustomerById(CustomerDetailComponent.customerId);
  var selectedIds = EmployeeTableEnhanced.selectedEmployees;
  
  EmployeeTableEnhanced.showBulkGroupChangeModal(selectedIds, customer.groups, function(targetGroupId) {
    // Update employees
    var updatedEmployees = customer.employees.map(function(emp) {
      if (selectedIds.indexOf(emp.id) > -1) {
        // Get vouchers for new group
        var groupVouchers = customer.vouchers.filter(function(v) {
          return v.userGroupIds && v.userGroupIds.indexOf(targetGroupId) > -1;
        });
        
        var totalBalance = groupVouchers.reduce(function(sum, v) { return sum + v.defaultAmount; }, 0);
        var voucherBalances = groupVouchers.map(function(v) {
          return { voucherId: v.id, remainingAmount: v.defaultAmount };
        });
        var voucherExpiry = groupVouchers.length > 0 ? groupVouchers[0].endDate : '';
        
        return Object.assign({}, emp, {
          groupId: targetGroupId,
          voucherBalances: voucherBalances,
          remainingBalance: totalBalance,
          voucherExpiry: voucherExpiry
        });
      }
      return emp;
    });
    
    // Update employee counts in groups
    var updatedGroups = customer.groups.map(function(group) {
      var count = updatedEmployees.filter(function(e) { return e.groupId === group.id; }).length;
      return Object.assign({}, group, { employeeCount: count });
    });
    
    AppState.updateCustomer(CustomerDetailComponent.customerId, {
      employees: updatedEmployees,
      groups: updatedGroups
    });
    
    EmployeeTableEnhanced.clearSelection();
    CustomerDetailComponent.renderTabContent('employees');
    Helpers.showAlert(selectedIds.length + ' employee(s) moved successfully', 'success');
  });
});

// Sort column
$(document).on('click', '.sortable-column', function() {
  var column = $(this).data('column');
  
  // Just set the sort column and direction, don't sort here
  // The template will handle the actual sorting
  EmployeeTableEnhanced.setSortColumn(column);
  
  // Re-render tab
  CustomerDetailComponent.renderTabContent('employees');
});
// Expand/collapse row
$(document).on('click', '.expand-row-btn', function() {
  var employeeId = $(this).data('employee-id');
  EmployeeTableEnhanced.toggleRowExpansion(employeeId);
  
  // Re-render tab
  CustomerDetailComponent.renderTabContent('employees');
});

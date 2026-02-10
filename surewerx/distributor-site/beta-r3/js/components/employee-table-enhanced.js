// Enhanced Employee Table with Selection, Sorting, and Bulk Operations

var EmployeeTableEnhanced = {
  selectedEmployees: [],
  expandedRows: [],
  sortColumn: null,
  sortDirection: 'asc',
  searchTerm: '',
  
  init: function() {
    this.selectedEmployees = [];
    this.expandedRows = [];
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.searchTerm = '';
  },
  
  toggleSelection: function(employeeId) {
    var index = this.selectedEmployees.indexOf(employeeId);
    if (index > -1) {
      this.selectedEmployees.splice(index, 1);
    } else {
      this.selectedEmployees.push(employeeId);
    }
    this.updateSelectionUI();
  },
  
  toggleSelectAll: function(employees) {
    if (this.selectedEmployees.length === employees.length) {
      // Deselect all
      this.selectedEmployees = [];
    } else {
      // Select all
      this.selectedEmployees = employees.map(function(e) { return e.id; });
    }
    this.updateSelectionUI();
  },
  
  updateSelectionUI: function() {
    var self = this;
    
    // Update individual checkboxes
    $('.employee-checkbox').each(function() {
      var employeeId = $(this).data('employee-id');
      $(this).prop('checked', self.selectedEmployees.indexOf(employeeId) > -1);
    });
    
    // Update select all checkbox
    var totalEmployees = $('.employee-checkbox').length;
    var selectedCount = this.selectedEmployees.length;
    $('#select-all-employees').prop('checked', selectedCount === totalEmployees && totalEmployees > 0);
    $('#select-all-employees').prop('indeterminate', selectedCount > 0 && selectedCount < totalEmployees);
    
    // Update bulk actions toolbar
    if (selectedCount > 0) {
      $('#bulk-actions-toolbar').show();
      $('#selected-count').text(selectedCount);
    } else {
      $('#bulk-actions-toolbar').hide();
    }
  },
  
  clearSelection: function() {
    this.selectedEmployees = [];
    this.updateSelectionUI();
  },
  
  toggleRowExpansion: function(employeeId) {
    var index = this.expandedRows.indexOf(employeeId);
    if (index > -1) {
      this.expandedRows.splice(index, 1);
    } else {
      this.expandedRows.push(employeeId);
    }
  },
  
  isRowExpanded: function(employeeId) {
    return this.expandedRows.indexOf(employeeId) > -1;
  },
  
  setSortColumn: function(column) {
    // Toggle direction if same column
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  },
  
  sortEmployees: function(employees, column) {
    var self = this;
    
    // Update sort state if column provided (legacy support)
    if (column) {
      this.setSortColumn(column);
    }
    
    // Use the stored sortColumn for the actual sorting
    var sortCol = this.sortColumn;
    
    var sorted = employees.slice().sort(function(a, b) {
      var aVal, bVal;
      
      switch(sortCol) {
        case 'name':
          aVal = (a.firstName || a.name || '').toLowerCase();
          bVal = (b.firstName || b.name || '').toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
        case 'group':
        case 'department':
          // Try departmentId first, fallback to groupId
          aVal = a.departmentId || a.groupId || '';
          bVal = b.departmentId || b.groupId || '';
          break;
        case 'balance':
          aVal = a.remainingBalance || 0;
          bVal = b.remainingBalance || 0;
          break;
        case 'status':
          aVal = a.voucherStatus || '';
          bVal = b.voucherStatus || '';
          break;
        case 'employeeId':
          aVal = (a.employeeId || '').toLowerCase();
          bVal = (b.employeeId || '').toLowerCase();
          break;
        case 'username':
          aVal = (a.username || '').toLowerCase();
          bVal = (b.username || '').toLowerCase();
          break;
        case 'dateOfBirth':
          aVal = a.dateOfBirth || '';
          bVal = b.dateOfBirth || '';
          break;
        case 'startDate':
          aVal = a.startDate || '';
          bVal = b.startDate || '';
          break;
        case 'notes':
          aVal = (a.notes || '').toLowerCase();
          bVal = (b.notes || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return self.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return self.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  },
  
  getSortIcon: function(column) {
    if (this.sortColumn !== column) {
      return '<span class="glyphicon glyphicon-sort text-muted"></span>';
    }
    
    if (this.sortDirection === 'asc') {
      return '<span class="glyphicon glyphicon-sort-by-attributes text-primary"></span>';
    } else {
      return '<span class="glyphicon glyphicon-sort-by-attributes-alt text-primary"></span>';
    }
  },
  
  filterEmployees: function(employees, customer) {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      return employees;
    }
    
    var searchLower = this.searchTerm.toLowerCase();
    
    return employees.filter(function(emp) {
      // Search by name
      var nameMatch = (emp.firstName && emp.firstName.toLowerCase().indexOf(searchLower) > -1) ||
        (emp.lastName && emp.lastName.toLowerCase().indexOf(searchLower) > -1) ||
        (emp.name && emp.name.toLowerCase().indexOf(searchLower) > -1);
      
      // Search by employee ID
      var idMatch = emp.employeeId && emp.employeeId.toLowerCase().indexOf(searchLower) > -1;
      
      // Search by username
      var usernameMatch = emp.username && emp.username.toLowerCase().indexOf(searchLower) > -1;
      
      // Search by department name
      var departmentMatch = false;
      if (emp.departmentId && emp.locationId && customer.locations) {
        var location = customer.locations.find(function(l) { return l.id === emp.locationId; });
        if (location && location.departments) {
          var department = location.departments.find(function(d) { return d.id === emp.departmentId; });
          if (department && department.name.toLowerCase().indexOf(searchLower) > -1) {
            departmentMatch = true;
          }
        }
      }
      // Fallback to old group structure
      if (!departmentMatch && emp.groupId && customer.groups) {
        var group = customer.groups.find(function(g) { return g.id === emp.groupId; });
        if (group && group.name.toLowerCase().indexOf(searchLower) > -1) {
          departmentMatch = true;
        }
      }
      
      // Search by notes
      var notesMatch = emp.notes && emp.notes.toLowerCase().indexOf(searchLower) > -1;
      
      return nameMatch || idMatch || usernameMatch || departmentMatch || notesMatch;
    });
  },
  
  exportEmployees: function(employees, partnerName) {
    if (!employees || employees.length === 0) {
      Helpers.showAlert('No employees to export', 'warning', '#export-employees-btn');
      return;
    }
    
    var headers = ['Name', 'Department', 'Voucher Status', 'Remaining Balance', 'Voucher Expiry'];
    var csv = headers.join(',') + '\n';
    
    employees.forEach(function(emp) {
      var departmentName = emp.departmentName || emp.groupName || 'Unassigned';
      var row = [
        emp.name,
        departmentName,
        emp.voucherStatus,
        '$' + emp.remainingBalance.toFixed(2),
        emp.voucherExpiry
      ];
      csv += row.map(function(val) {
        return typeof val === 'string' && val.indexOf(',') > -1 ? '\"' + val + '\"' : val;
      }).join(',') + '\n';
    });
    
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = partnerName.replace(/\s+/g, '_') + '_employees_' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    Helpers.showAlert('Employee data exported successfully', 'success', '#export-employees-btn');
  },
  
  showBulkGroupChangeModal: function(selectedEmployeeIds, groups, onSave) {
    // This function is called with groups parameter for backward compatibility
    // But we should get departments from customer instead
    var customer = AppState.getCustomerById(CustomerDetailComponent.customerId);
    if (!customer) {
      Helpers.showAlert('Customer not found', 'danger');
      return;
    }
    
    // Build department options from locations
    var departmentOptions = '';
    if (customer.locations && customer.locations.length > 0) {
      customer.locations.forEach(function(loc) {
        if (loc.departments && loc.departments.length > 0) {
          loc.departments.forEach(function(dept) {
            departmentOptions += '<option value="' + dept.id + '" data-location-id="' + loc.id + '">' +
              Helpers.escapeHtml(loc.locationId || 'Unnamed') + ' - ' + Helpers.escapeHtml(dept.name) +
              '</option>';
          });
        }
      });
    }
    // Fallback to old groups
    if (!departmentOptions && groups && groups.length > 0) {
      groups.forEach(function(g) {
        departmentOptions += '<option value="' + g.id + '" data-is-legacy-group="true">' + 
          Helpers.escapeHtml(g.name) + '</option>';
      });
    }
    
    var modalHtml = '<div class="modal fade" id="bulk-group-change-modal" tabindex="-1">' +
      '<div class="modal-dialog">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Change Department</h4>' +
      '</div>' +
      '<form id="bulk-group-change-form">' +
      '<div class="modal-body">' +
      '<div class="alert alert-info">' +
      '<strong><span class="glyphicon glyphicon-info-sign"></span> Note:</strong><br>' +
      'You are about to change the department for <strong>' + selectedEmployeeIds.length + ' employee(s)</strong>.<br>' +
      'This will update their voucher balances based on the new department\'s configuration.' +
      '</div>' +
      '<div class="form-group">' +
      '<label>New Department *</label>' +
      '<select class="form-control" id="bulk-target-group" required>' +
      '<option value="">-- Select a department --</option>' +
      departmentOptions +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Change Department</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#bulk-group-change-modal').modal('show');
    
    $(document).off('submit', '#bulk-group-change-form').on('submit', '#bulk-group-change-form', function(e) {
      e.preventDefault();
      
      var targetDepartmentId = $('#bulk-target-group').val();
      if (!targetDepartmentId) {
        Helpers.showAlert('Please select a target department', 'danger');
        return;
      }
      
      $('#bulk-group-change-modal').modal('hide');
      onSave(targetDepartmentId);
    });
    
    $('#bulk-group-change-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  renderVoucherBalanceDetails: function(employee, vouchers) {
    if (!employee.voucherBalances || employee.voucherBalances.length === 0) {
      return '<tr class="voucher-details-row">' +
        '<td colspan="100%" class="bg-info">' +
        '<div style="padding: 20px;">' +
        '<p class="text-muted text-center">No voucher balances available</p>' +
        '</div>' +
        '</td>' +
        '</tr>';
    }
    
    var html = '<tr class="voucher-details-row">' +
      '<td colspan="100%" class="bg-info">' +
      '<div style="padding: 20px;">' +
      '<h5 style="margin-top: 0;"><strong>Voucher Balances</strong></h5>' +
      '<div class="row">';
    
    employee.voucherBalances.forEach(function(vb) {
      var voucher = vouchers.find(function(v) { return v.id === vb.voucherId; });
      if (!voucher) return;
      
      var percentUsed = voucher.defaultAmount > 0 
        ? ((voucher.defaultAmount - vb.remainingAmount) / voucher.defaultAmount * 100).toFixed(0)
        : 0;
      
      html += '<div class="col-md-4 col-sm-6">' +
        '<div class="panel panel-default">' +
        '<div class="panel-body">' +
        '<h5 style="margin-top: 0;">' + Helpers.escapeHtml(voucher.name) + '</h5>' +
        '<div class="progress">' +
        '<div class="progress-bar progress-bar-success" role="progressbar" style="width: ' + percentUsed + '%">' +
        percentUsed + '%' +
        '</div>' +
        '</div>' +
        '<p class="mb-0">' +
        '<strong>Used:</strong> $' + (voucher.defaultAmount - vb.remainingAmount).toFixed(2) + '<br>' +
        '<strong>Remaining:</strong> $' + vb.remainingAmount.toFixed(2) + '<br>' +
        '<strong>Original:</strong> $' + voucher.defaultAmount.toFixed(2) +
        '</p>' +
        '</div>' +
        '</div>' +
        '</div>';
    });
    
    html += '</div>' +
      '</div>' +
      '</td>' +
      '</tr>';
    
    return html;
  }
};
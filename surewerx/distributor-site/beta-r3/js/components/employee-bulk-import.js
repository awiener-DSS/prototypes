// Employee Bulk Import Component

var EmployeeBulkImport = {
  currentPartnerId: null,
  selectedGroupId: null,
  
  show: function(customerId) {
    this.currentPartnerId = customerId;
    var partner = AppState.getCustomerById(customerId);
    
    // Find first available group
    this.selectedGroupId = partner.groups && partner.groups.length > 0 ? partner.groups[0].id : null;
    
    this.renderModal(partner);
  },
  
  renderModal: function(partner) {
    var self = this;
    
    var modalHtml = '<div class="modal fade" id="bulk-import-modal" tabindex="-1">' +
      '<div class="modal-dialog modal-lg">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Import Employees</h4>' +
      '</div>' +
      '<div class="modal-body">' +
      '<div class="alert alert-info">' +
      '<strong><span class="glyphicon glyphicon-info-sign"></span> How it works:</strong>' +
      '<ol class="mb-0 mt-2">' +
      '<li>Download the CSV template</li>' +
      '<li>Fill in employee information</li>' +
      '<li>Select the department for these employees</li>' +
      '<li>Upload the completed CSV file</li>' +
      '</ol>' +
      '</div>' +
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><strong>Step 1: Download Template</strong></div>' +
      '<div class="panel-body">' +
      '<p class="text-muted">Download a CSV template with the correct column headers based on this partner\'s configuration.</p>' +
      '<button type="button" class="btn btn-primary" id="download-template-btn">' +
      '<span class="glyphicon glyphicon-download-alt"></span> Download CSV Template' +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><strong>Step 2: Department Assignment</strong></div>' +
      '<div class="panel-body">' +
      '<p class="text-muted">You can assign employees to departments in two ways:</p>' +
      '<ul class="text-muted">' +
      '<li><strong>Option 1:</strong> Select a default department below (all employees will be assigned to this department)</li>' +
      '<li><strong>Option 2:</strong> Include a "Department" column in your CSV file (each employee can be assigned to a different department)</li>' +
      '</ul>' +
      '<div class="form-group">' +
      '<label>Default Department (Optional - only used if CSV doesn\'t have Department column)</label>' +
      '<select class="form-control" id="bulk-import-group-select">' +
      '<option value="">-- No default group --</option>' +
      partner.groups.map(function(g) {
          // Get vouchers for this department (legacy group)
          var groupVouchers = [];
          if (partner.locations) {
            partner.locations.forEach(function(loc) {
              if (loc.departments) {
                loc.departments.forEach(function(dept) {
                  if (dept.id === g.id) {
                    groupVouchers = partner.vouchers.filter(function(v) {
                      return v.departmentId === dept.id && v.locationId === loc.id;
                    });
                  }
                });
              }
            });
          }
        var totalAmount = groupVouchers.reduce(function(sum, v) { return sum + v.defaultAmount; }, 0);
        var selected = g.id === self.selectedGroupId ? ' selected' : '';
        return '<option value="' + g.id + '"' + selected + '>' +
          Helpers.escapeHtml(g.name) + ' - $' + totalAmount.toFixed(2) + ' (' + groupVouchers.length + ' vouchers)' +
          '</option>';
      }).join('') +
      '</select>' +
      '<p class="help-block">If your CSV includes a "Department" column (or legacy "User Group" column), employees will be assigned to the departments specified in the CSV. Otherwise, they will be assigned to the default department selected above.</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><strong>Step 3: Upload File</strong></div>' +
      '<div class="panel-body">' +
      '<p class="text-muted">Upload your completed CSV file with employee data.</p>' +
      '<div class="form-group">' +
      '<label class="btn btn-success" for="csv-file-input">' +
      '<span class="glyphicon glyphicon-upload"></span> Choose CSV File' +
      '</label>' +
      '<input type="file" id="csv-file-input" accept=".csv" style="display: none;">' +
      '<p class="help-block" id="file-name-display">No file selected</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div id="import-progress" style="display: none;">' +
      '<div class="progress">' +
      '<div class="progress-bar progress-bar-striped active" role="progressbar" style="width: 0%;" id="import-progress-bar">' +
      '<span id="import-progress-text">0%</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div id="import-results" style="display: none;" class="alert"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#bulk-import-modal').modal('show');
    
    this.attachModalEvents(partner);
    
    $('#bulk-import-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  attachModalEvents: function(partner) {
    var self = this;
    
    // Download template
    $(document).on('click', '#download-template-btn', function() {
      self.downloadTemplate(partner);
    });
    
    // Group selection
    $(document).on('change', '#bulk-import-group-select', function() {
      self.selectedGroupId = $(this).val();
    });
    
    // File selection
    $(document).on('change', '#csv-file-input', function(e) {
      var fileName = e.target.files[0] ? e.target.files[0].name : 'No file selected';
      $('#file-name-display').text(fileName);
      
      if (e.target.files[0]) {
        self.processFile(e.target.files[0], partner);
      }
    });
  },
  
  downloadTemplate: function(partner) {
    // Build header - always include all identifier fields (required and optional)
    var headers = ['First Name', 'Last Name', 'Employee ID', 'Username', 'Date of Birth', 'Start Date', 'Department', 'Notes'];
    
    // Create CSV with header row
    var csv = headers.join(',') + '\n';
    
    // Get group names for examples
    var groupNames = partner.groups.map(function(g) { return g.name; });
    var exampleGroup1 = groupNames.length > 0 ? groupNames[0] : '';
    var exampleGroup2 = groupNames.length > 1 ? groupNames[1] : groupNames[0] || '';
    
    // Add example rows - include all fields, mark required ones with asterisk in comment
    // Note: Required fields are marked with * in the label, but all fields are included
    var exampleRow1 = ['John', 'Doe', 'EMP001', 'jdoe', '1990-01-15', '2020-01-01', exampleGroup1, 'Example notes for employee'];
    csv += exampleRow1.join(',') + '\n';
    
    var exampleRow2 = ['Jane', 'Smith', 'EMP002', 'jsmith', '1985-05-22', '2019-06-15', exampleGroup2, ''];
    csv += exampleRow2.join(',') + '\n';
    
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    Helpers.showAlert('Template downloaded successfully', 'success', '#download-template-btn');
  },
  
  processFile: function(file, partner) {
    var self = this;
    
    var reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        var text = e.target.result;
        var lines = text.split('\n').filter(function(line) { return line.trim(); });
        
        if (lines.length < 2) {
          Helpers.showAlert('CSV file is empty or invalid', 'danger', '#file-input');
          return;
        }
        
        // Parse header row to find column indices
        var headerRow = lines[0].split(',').map(function(s) { return s.trim(); });
        var firstNameIndex = headerRow.indexOf('First Name');
        var lastNameIndex = headerRow.indexOf('Last Name');
        var employeeIdIndex = headerRow.indexOf('Employee ID');
        var usernameIndex = headerRow.indexOf('Username');
        var dateOfBirthIndex = headerRow.indexOf('Date of Birth');
        var startDateIndex = headerRow.indexOf('Start Date');
        var userGroupIndex = headerRow.indexOf('Department');
        if (userGroupIndex === -1) {
          // Fallback to legacy "User Group" column name
          userGroupIndex = headerRow.indexOf('User Group');
        }
        var notesIndex = headerRow.indexOf('Notes');
        var hasUserGroupColumn = userGroupIndex !== -1;
        
        // Skip header row
        var dataLines = lines.slice(1);
        var successCount = 0;
        var errorCount = 0;
        var errors = [];
        
        $('#import-progress').show();
        $('#import-results').hide();
        
        var validEmployees = [];
        var employeesToUpdate = [];
        var employeesToCreate = [];
        
        dataLines.forEach(function(line, index) {
          var values = line.split(',').map(function(s) { return s.trim().replace(/^"|"$/g, ''); });
          
          // Parse all fields from CSV (both required and optional)
          var firstName = firstNameIndex !== -1 ? (values[firstNameIndex] || '').trim() : '';
          var lastName = lastNameIndex !== -1 ? (values[lastNameIndex] || '').trim() : '';
          var employeeId = employeeIdIndex !== -1 ? (values[employeeIdIndex] || '').trim() : '';
          var username = usernameIndex !== -1 ? (values[usernameIndex] || '').trim() : '';
          var dateOfBirth = dateOfBirthIndex !== -1 ? (values[dateOfBirthIndex] || '').trim() : '';
          var startDate = startDateIndex !== -1 ? (values[startDateIndex] || '').trim() : '';
          
          // Convert empty strings to undefined for optional fields
          employeeId = employeeId || undefined;
          username = username || undefined;
          dateOfBirth = dateOfBirth || undefined;
          startDate = startDate || undefined;
          
          // Get department from CSV or use default
          var groupName = '';
          var assignedGroupId = null;
          
          if (hasUserGroupColumn && userGroupIndex !== -1) {
            // Department column exists in CSV (legacy column name "User Group")
            groupName = (values[userGroupIndex] || '').trim();
            if (groupName) {
              // Find department by name (case-insensitive) - try new structure first
              var foundDepartment = null;
              if (partner.locations && partner.locations.length > 0) {
                for (var i = 0; i < partner.locations.length; i++) {
                  var loc = partner.locations[i];
                  if (loc.departments) {
                    foundDepartment = loc.departments.find(function(d) {
                      return d.name.toLowerCase() === groupName.toLowerCase();
                    });
                    if (foundDepartment) {
                      assignedGroupId = foundDepartment.id;
                      break;
                    }
                  }
                }
              }
              // Fallback to old groups structure
              if (!foundDepartment && partner.groups) {
                var foundGroup = partner.groups.find(function(g) {
                  return g.name.toLowerCase() === groupName.toLowerCase();
                });
                if (foundGroup) {
                  assignedGroupId = foundGroup.id;
                }
              }
              if (!assignedGroupId) {
                errorCount++;
                errors.push('Row ' + (index + 2) + ': Department "' + groupName + '" not found for ' + firstName + ' ' + lastName);
                return;
              }
            }
          }
          
          // If no department from CSV, use default department
          if (!assignedGroupId) {
            if (self.selectedGroupId) {
              assignedGroupId = self.selectedGroupId;
            } else {
              errorCount++;
              errors.push('Row ' + (index + 2) + ': No department specified for ' + firstName + ' ' + lastName + '. Please either include a Department column in the CSV or select a default department.');
              return;
            }
          }
          
          // Get notes
          var notes = notesIndex !== -1 ? (values[notesIndex] || '').trim() : '';
          
          // Validate required fields
          if (!firstName || !lastName) {
            errorCount++;
            errors.push('Row ' + (index + 2) + ': Missing first or last name');
            return;
          }
          
          if (partner.employeeFieldConfig.requireEmployeeId && !employeeId) {
            errorCount++;
            errors.push('Row ' + (index + 2) + ': Missing Employee ID for ' + firstName + ' ' + lastName);
            return;
          }
          
          if (partner.employeeFieldConfig.requireUsername && !username) {
            errorCount++;
            errors.push('Row ' + (index + 2) + ': Missing Username for ' + firstName + ' ' + lastName);
            return;
          }
          
          if (partner.employeeFieldConfig.requireDateOfBirth && !dateOfBirth) {
            errorCount++;
            errors.push('Row ' + (index + 2) + ': Missing Date of Birth for ' + firstName + ' ' + lastName);
            return;
          }
          
          if (partner.employeeFieldConfig.requireStartDate && !startDate) {
            errorCount++;
            errors.push('Row ' + (index + 2) + ': Missing Start Date for ' + firstName + ' ' + lastName);
            return;
          }
          
          // Check if employee already exists based on matching criteria:
          // Name AND (Employee ID OR Username) AND (Date of Birth OR Start Date)
          var existingEmployee = partner.employees.find(function(emp) {
            // Match name (case-insensitive)
            var nameMatch = emp.firstName && emp.lastName &&
              emp.firstName.toLowerCase() === firstName.toLowerCase() &&
              emp.lastName.toLowerCase() === lastName.toLowerCase();
            
            if (!nameMatch) return false;
            
            // Match identifier: Employee ID OR Username
            var identifierMatch = false;
            if (employeeId && emp.employeeId && emp.employeeId.toLowerCase() === employeeId.toLowerCase()) {
              identifierMatch = true;
            } else if (username && emp.username && emp.username.toLowerCase() === username.toLowerCase()) {
              identifierMatch = true;
            }
            
            if (!identifierMatch) return false;
            
            // Match date: Date of Birth OR Start Date
            var dateMatch = false;
            if (dateOfBirth && emp.dateOfBirth && emp.dateOfBirth === dateOfBirth) {
              dateMatch = true;
            } else if (startDate && emp.startDate && emp.startDate === startDate) {
              dateMatch = true;
            }
            
            return dateMatch;
          });
          
          // Get vouchers for this group
            // Get vouchers for assigned department
            var groupVouchers = [];
            if (partner.locations) {
              partner.locations.forEach(function(loc) {
                if (loc.departments) {
                  loc.departments.forEach(function(dept) {
                    if (dept.id === assignedGroupId) {
                      groupVouchers = partner.vouchers.filter(function(v) {
                        return v.departmentId === dept.id && v.locationId === loc.id;
                      });
                    }
                  });
                }
              });
            }
          
          // Calculate total voucher balance
          var totalBalance = groupVouchers.reduce(function(sum, v) { return sum + v.defaultAmount; }, 0);
          
          // Initialize voucher balances
          var voucherBalances = groupVouchers.map(function(v) {
            return {
              voucherId: v.id,
              remainingAmount: v.defaultAmount
            };
          });
          
          // Get expiry date from vouchers
          var voucherExpiry = groupVouchers.length > 0 ? groupVouchers[0].endDate : '';
          
          if (existingEmployee) {
            // Update existing employee
            // Find location for this department
            var assignedLocationId = null;
            if (partner.locations) {
              partner.locations.forEach(function(loc) {
                if (loc.departments) {
                  var dept = loc.departments.find(function(d) { return d.id === assignedGroupId; });
                  if (dept) {
                    assignedLocationId = loc.id;
                  }
                }
              });
            }
            
            var updatedEmployee = Object.assign({}, existingEmployee, {
              firstName: firstName,
              lastName: lastName,
              name: firstName + ' ' + lastName,
              departmentId: assignedGroupId,
              locationId: assignedLocationId,
              voucherExpiry: voucherExpiry,
              voucherStatus: 'active',
              remainingBalance: totalBalance,
              voucherBalances: voucherBalances,
              notes: notes
            });
            
            // Update optional fields
            if (employeeId) updatedEmployee.employeeId = employeeId;
            if (username) updatedEmployee.username = username;
            if (dateOfBirth) updatedEmployee.dateOfBirth = dateOfBirth;
            if (startDate) updatedEmployee.startDate = startDate;
            
            employeesToUpdate.push({
              oldEmployee: existingEmployee,
              newEmployee: updatedEmployee
            });
          } else {
            // Create new employee - include all fields (required and optional)
            // Find location for this department
            var assignedLocationId = null;
            if (partner.locations) {
              partner.locations.forEach(function(loc) {
                if (loc.departments) {
                  var dept = loc.departments.find(function(d) { return d.id === assignedGroupId; });
                  if (dept) {
                    assignedLocationId = loc.id;
                  }
                }
              });
            }
            
            var employeeData = {
              id: Helpers.generateId(),
              firstName: firstName,
              lastName: lastName,
              name: firstName + ' ' + lastName,
              employeeId: employeeId,
              username: username,
              dateOfBirth: dateOfBirth,
              startDate: startDate,
              departmentId: assignedGroupId,
              locationId: assignedLocationId,
              voucherExpiry: voucherExpiry,
              voucherStatus: 'active',
              remainingBalance: totalBalance,
              voucherBalances: voucherBalances,
              notes: notes
            };
            
            employeesToCreate.push(employeeData);
          }
          
          successCount++;
          
          // Update progress
          var progress = Math.round(((index + 1) / dataLines.length) * 100);
          $('#import-progress-bar').css('width', progress + '%');
          $('#import-progress-text').text(progress + '%');
        });
        
        // Build final employee list: update existing, add new, keep others unchanged
        var allEmployees = partner.employees.map(function(emp) {
          var updateInfo = employeesToUpdate.find(function(u) { return u.oldEmployee.id === emp.id; });
          if (updateInfo) {
            return updateInfo.newEmployee;
          }
          return emp;
        });
        
        // Add new employees
        allEmployees = allEmployees.concat(employeesToCreate);
        
        // Update employee count for all affected groups
        // Update employee counts in departments
        var updatedLocations = null;
        if (partner.locations) {
          updatedLocations = partner.locations.map(function(loc) {
            if (loc.departments) {
              var updatedDepartments = loc.departments.map(function(dept) {
                var count = allEmployees.filter(function(e) { 
                  return e.departmentId === dept.id && e.locationId === loc.id; 
                }).length;
                return Object.assign({}, dept, { employeeCount: count });
              });
              return Object.assign({}, loc, { departments: updatedDepartments });
            }
            return loc;
          });
        }
        
        AppState.updateCustomer(partner.id, {
          employees: allEmployees,
          employeeCount: allEmployees.length,
          groups: updatedGroups
        });
        
        // Show results
        $('#import-progress').hide();
        var resultHtml = '';
        
        if (successCount > 0) {
          var updateCount = employeesToUpdate.length;
          var createCount = employeesToCreate.length;
          resultHtml += '<p class="text-success"><strong>' + successCount + ' employee(s) processed successfully!</strong></p>';
          if (updateCount > 0) {
            resultHtml += '<p class="text-info">' + updateCount + ' existing employee(s) updated</p>';
          }
          if (createCount > 0) {
            resultHtml += '<p class="text-info">' + createCount + ' new employee(s) created</p>';
          }
        }
        
        if (errorCount > 0) {
          resultHtml += '<p class="text-danger"><strong>' + errorCount + ' employee(s) failed to import:</strong></p>';
          resultHtml += '<ul class="text-danger">';
          errors.forEach(function(err) {
            resultHtml += '<li>' + err + '</li>';
          });
          resultHtml += '</ul>';
        }
        
        $('#import-results').removeClass('alert-success alert-danger');
        $('#import-results').addClass(errorCount > 0 ? 'alert-warning' : 'alert-success');
        $('#import-results').html(resultHtml).show();
        
        // Refresh the employee list
        if (successCount > 0) {
          setTimeout(function() {
            $('#bulk-import-modal').modal('hide');
            CustomerDetailComponent.renderTabContent('employees');
            var updateCount = employeesToUpdate.length;
            var createCount = employeesToCreate.length;
            var message = '';
            if (updateCount > 0 && createCount > 0) {
              message = updateCount + ' employee(s) updated, ' + createCount + ' new employee(s) created';
            } else if (updateCount > 0) {
              message = updateCount + ' employee(s) updated';
            } else {
              message = createCount + ' employee(s) created';
            }
            Helpers.showAlert(message, 'success');
          }, 2000);
        }
        
      } catch (error) {
        console.error('Error processing file:', error);
        Helpers.showAlert('Error processing file. Please check the format.', 'danger');
      }
    };
    
    reader.readAsText(file);
  }
};
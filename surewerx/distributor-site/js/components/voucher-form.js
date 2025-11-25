// Voucher Form Component

var VoucherFormComponent = {
  customerId: null,
  voucherId: null,
  selectedProductIds: [],
  
  init: function(customerId, voucherId) {
    this.customerId = customerId;
    this.voucherId = voucherId || null;
    this.selectedProductIds = [];
    this.isReturningFromProductSelection = false;
    this.render();
    this.attachEvents();
  },
  
  render: function() {
    var partner = AppState.getCustomerById(this.customerId);
    if (!partner) {
      App.navigate('dashboard');
      return;
    }
    
    var voucher = null;
    if (this.voucherId) {
      voucher = partner.vouchers.find(function(v) { return v.id === this.voucherId; }.bind(this));
      if (!voucher) {
        Helpers.showAlert('Voucher not found', 'error');
        App.navigate('customer-detail', { customerId: this.customerId, tab: 'vouchers' });
        return;
      }
    }
    
    var html = this.renderForm(partner, voucher);
    $('#app-container').html(html);
    this.updateActiveNav('dashboard');
    
    // Check if returning from product selection page - restore form data
    var savedFormData = sessionStorage.getItem('voucherFormData');
    this.isReturningFromProductSelection = !!savedFormData;
    
    if (savedFormData) {
      try {
        var formData = JSON.parse(savedFormData);
        // Restore form data (for both new and edit)
        $('#voucher-name').val(formData.name || '');
        $('#voucher-description').val(formData.description || '');
        $('#voucher-amount').val(formData.amount || '');
        $('#voucher-start-date').val(formData.startDate || '');
        $('#voucher-end-date').val(formData.endDate || '');
        $('#voucher-active').prop('checked', formData.isActive !== false);
        $('#voucher-rollover').prop('checked', formData.rolloverEnabled || false);
        if (formData.userGroupId) {
          $('#voucher-user-group').val(formData.userGroupId);
          this.updateGroupProductsDisplay(formData.userGroupId);
        }
        sessionStorage.removeItem('voucherFormData');
      } catch (e) {
        console.error('Error parsing saved form data:', e);
      }
    }
    
    // Initialize form values (only if not returning from product selection)
    if (voucher && !this.isReturningFromProductSelection) {
      this.populateForm(voucher);
    }
    
    // Check if returning from product selection page - restore selected products
    // This should take precedence over voucher's existing products
    var savedProducts = sessionStorage.getItem('voucherSelectedProducts');
    if (savedProducts && this.isReturningFromProductSelection) {
      try {
        this.selectedProductIds = JSON.parse(savedProducts);
        // If a user group is already selected, update the summary
        var selectedGroupId = $('#voucher-user-group').val();
        if (selectedGroupId) {
          this.updateSelectedProductsSummary();
        }
        // Don't remove from sessionStorage yet - keep it until form is submitted or cancelled
      } catch (e) {
        console.error('Error parsing saved products:', e);
      }
    } else if (voucher && !this.isReturningFromProductSelection) {
      // Only load from voucher if we're not returning from product selection
      // This is already handled in populateForm, but we need to make sure it's called
      if (voucher.userGroupIds && voucher.userGroupIds.length > 0) {
        var groupId = voucher.userGroupIds[0];
        this.updateGroupProductsDisplay(groupId);
      }
    } else if (!voucher && !this.isReturningFromProductSelection) {
      // For new vouchers, clear any stale sessionStorage data
      sessionStorage.removeItem('voucherSelectedProducts');
      this.selectedProductIds = [];
    }
  },
  
  renderForm: function(partner, voucher) {
    var isEdit = !!voucher;
    
    var html = Templates.header() +
      '<div class="container-fluid">' +
      '<div class="row">' +
      '<div class="col-md-8 col-md-offset-2">' +
      '<div style="margin-top: 20px; margin-bottom: 20px;">' +
      '<button class="btn btn-default" id="back-to-partner">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to Partner' +
      '</button>' +
      '<h2 style="margin-top: 10px;">' + (isEdit ? 'Edit Voucher' : 'Create New Voucher') + '</h2>' +
      '<p class="text-muted">' + 
      (isEdit ? 'Update voucher settings. Changes will affect the assigned user group.' : 'Create a voucher that can be assigned to a user group') +
      '</p>' +
      '</div>' +
      
      '<form id="voucher-form">' +
      
      // Basic Information
      '<div class="panel panel-default">' +
      '<div class="panel-heading">' +
      '<h3 class="panel-title">Basic Information</h3>' +
      '</div>' +
      '<div class="panel-body">' +
      
      '<div class="form-group">' +
      '<label for="voucher-name">Voucher Name <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="voucher-name" placeholder="e.g., Monthly Equipment Allowance" required>' +
      '</div>' +
      
      '<div class="form-group">' +
      '<label for="voucher-description">Description</label>' +
      '<textarea class="form-control" id="voucher-description" rows="3" placeholder="Describe what this voucher can be used for..."></textarea>' +
      '</div>' +
      
      '<div class="row">' +
      '<div class="col-md-4">' +
      '<div class="form-group">' +
      '<label for="voucher-amount">Voucher Amount <span class="text-danger">*</span></label>' +
      '<div class="input-group" style="max-width: 200px;">' +
      '<span class="input-group-addon">$</span>' +
      '<input type="number" class="form-control" id="voucher-amount" step="0.01" min="0" placeholder="0.00" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4">' +
      '<div class="form-group">' +
      '<label for="voucher-start-date">Start Date <span class="text-danger">*</span></label>' +
      '<input type="date" class="form-control" id="voucher-start-date" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4">' +
      '<div class="form-group">' +
      '<label for="voucher-end-date">End Date <span class="text-danger">*</span></label>' +
      '<input type="date" class="form-control" id="voucher-end-date" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" id="voucher-active" checked> ' +
      '<strong>Active</strong> - Voucher is currently active and can be used' +
      '</label>' +
      '</div>' +
      
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" id="voucher-rollover"> ' +
      '<strong>Rollover Enabled</strong> - Allow unused balance to carry over to the next period' +
      '</label>' +
      '</div>' +
      
      '</div>' +
      '</div>' +
      
      // User Group Assignment
      '<div class="panel panel-default">' +
      '<div class="panel-heading">' +
      '<h3 class="panel-title">User Group Assignment</h3>' +
      '</div>' +
      '<div class="panel-body">' +
      
      '<div class="alert alert-info">' +
      '<span class="glyphicon glyphicon-info-sign"></span> ' +
      'Vouchers are assigned to a single user group.' +
      '</div>' +
      
      '<div class="form-group">' +
      '<label for="voucher-user-group">Assign to User Group <span class="text-danger">*</span></label>' +
      '<select class="form-control" id="voucher-user-group" required>' +
      '<option value="">Select a user group...</option>';
    
    // Show all groups
    partner.groups.forEach(function(group) {
      html += '<option value="' + group.id + '">' +
        Helpers.escapeHtml(group.name) + ' (' + group.employeeCount + ' employees)' +
        '</option>';
    });
    
      html += '</select>' +
      '</div>' +
      
      '</div>' +
      '</div>' +
      
      // Qualified Products
      '<div class="panel panel-default" id="qualified-products-panel" style="display: none;">' +
      '<div class="panel-heading">' +
      '<h3 class="panel-title">Qualified Products</h3>' +
      '</div>' +
      '<div class="panel-body">' +
      
      '<p class="text-muted">Choose which products this voucher can be applied to. Qualified products must be a subset of the visible products for the selected user group.</p>' +
      
      '<div class="form-group">' +
      '<button type="button" class="btn btn-primary" id="select-qualified-products-btn">' +
      '<span class="glyphicon glyphicon-list"></span> Select Qualified Products' +
      '</button>' +
      '</div>' +
      
      '<div id="selected-products-summary" style="display: none; margin-top: 15px; padding: 15px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;">' +
      '<strong><span id="selected-products-count">0</span> product(s) selected</strong>' +
      '<div id="selected-products-list" style="margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>' +
      '</div>' +
      
      '</div>' +
      '</div>' +
      
      // Form Actions
      '<div class="form-group">' +
      '<button type="submit" class="btn btn-primary">' +
      '<span class="glyphicon glyphicon-floppy-disk"></span> ' +
      (isEdit ? 'Update Voucher' : 'Create Voucher') +
      '</button> ' +
      '<button type="button" class="btn btn-default" id="cancel-voucher-form">Cancel</button>' +
      (isEdit ? ' <button type="button" class="btn btn-danger" id="delete-voucher-btn" style="float: right;">' +
      '<span class="glyphicon glyphicon-trash"></span> Delete Voucher' +
      '</button>' : '') +
      '</div>' +
      
      '</form>' +
      
      '</div>' +
      '</div>' +
      '</div>';
    
    return html;
  },
  
  populateForm: function(voucher) {
    var self = this;
    $('#voucher-name').val(voucher.name);
    $('#voucher-description').val(voucher.description || '');
    $('#voucher-amount').val(voucher.defaultAmount);
    $('#voucher-start-date').val(voucher.startDate);
    $('#voucher-end-date').val(voucher.endDate);
    $('#voucher-active').prop('checked', voucher.isActive);
    $('#voucher-rollover').prop('checked', voucher.rolloverEnabled || false);
    
    if (voucher.userGroupIds && voucher.userGroupIds.length > 0) {
      $('#voucher-user-group').val(voucher.userGroupIds[0]);
      this.updateGroupProductsDisplay(voucher.userGroupIds[0]);
      
      // Set selected products
      if (voucher.productIds) {
        this.selectedProductIds = voucher.productIds.slice();
        this.updateSelectedProductsSummary();
      }
    }
  },
  
  attachEvents: function() {
    var self = this;
    
    // Back button
    $(document).on('click', '#back-to-partner', function() {
      App.navigate('customer-detail', { customerId: self.customerId, tab: 'vouchers' });
    });
    
    // Cancel button
    $(document).on('click', '#cancel-voucher-form', function() {
      // Clear sessionStorage when cancelling
      sessionStorage.removeItem('voucherFormData');
      sessionStorage.removeItem('voucherSelectedProducts');
      App.navigate('customer-detail', { customerId: self.customerId, tab: 'vouchers' });
    });
    
    // Delete voucher button (only shown when editing)
    $(document).on('click', '#delete-voucher-btn', function() {
      self.deleteVoucher();
    });
    
    // User group selection
    $(document).on('change', '#voucher-user-group', function() {
      var groupId = $(this).val();
      self.updateGroupProductsDisplay(groupId);
    });
    
    // Select qualified products button
    $(document).on('click', '#select-qualified-products-btn', function() {
      var userGroupId = $('#voucher-user-group').val();
      if (!userGroupId) {
        Helpers.showAlert('Please select a user group first', 'warning');
        return;
      }
      
      // Store current form data temporarily (for both new and edit)
      var formData = {
        name: $('#voucher-name').val(),
        description: $('#voucher-description').val(),
        amount: $('#voucher-amount').val(),
        startDate: $('#voucher-start-date').val(),
        endDate: $('#voucher-end-date').val(),
        isActive: $('#voucher-active').prop('checked'),
        rolloverEnabled: $('#voucher-rollover').prop('checked'),
        userGroupId: userGroupId
      };
      
      // Store in sessionStorage to preserve form data
      sessionStorage.setItem('voucherFormData', JSON.stringify(formData));
      sessionStorage.setItem('voucherSelectedProducts', JSON.stringify(self.selectedProductIds));
      
      // Navigate to product selection page
      var url = 'voucher-product-selection.html?customerId=' + encodeURIComponent(self.customerId);
      if (self.voucherId) {
        url += '&voucherId=' + encodeURIComponent(self.voucherId);
      }
      url += '&userGroupId=' + encodeURIComponent(userGroupId);
      window.location.href = url;
    });
    
    // Form submission
    $(document).on('submit', '#voucher-form', function(e) {
      e.preventDefault();
      self.handleSubmit();
    });
  },
  
  updateGroupProductsDisplay: function(groupId) {
    var self = this;
    if (!groupId) {
      $('#qualified-products-panel').hide();
      return;
    }
    
    var partner = AppState.getCustomerById(this.customerId);
    var group = partner.groups.find(function(g) { return g.id === groupId; });
    
    if (!group) {
      $('#qualified-products-panel').hide();
      return;
    }
    
    // Show qualified products panel
    $('#qualified-products-panel').show();
    
    // Only load selected products from sessionStorage if we're returning from product selection page
    // Don't load stale sessionStorage data when user just selects a group for a new voucher
    if (this.isReturningFromProductSelection) {
    var savedProducts = sessionStorage.getItem('voucherSelectedProducts');
    if (savedProducts) {
      try {
        var savedIds = JSON.parse(savedProducts);
        // Filter to only include products that exist in available products
        this.selectedProductIds = savedIds.filter(function(id) {
          return AppState.products.some(function(p) { return p.id === id; });
        });
      } catch (e) {
        console.error('Error parsing saved products:', e);
      }
      }
    } else if (!this.voucherId) {
      // For new vouchers, ensure selectedProductIds is empty when selecting a group
      this.selectedProductIds = [];
    }
    
    // Update selected products summary
    this.updateSelectedProductsSummary();
  },
  
  updateSelectedProductsSummary: function() {
    var self = this;
    if (this.selectedProductIds.length === 0) {
      $('#selected-products-summary').hide();
      return;
    }
    
    $('#selected-products-count').text(this.selectedProductIds.length);
    
    // Always show only the count, not the product details (for both new and edit vouchers)
      $('#selected-products-list').html('');
    $('#selected-products-summary').show();
  },
  
  handleSubmit: function() {
    var self = this;
    var partner = AppState.getCustomerById(this.customerId);
    
    // Get form values
    var name = $('#voucher-name').val().trim();
    var description = $('#voucher-description').val().trim();
    var defaultAmount = parseFloat($('#voucher-amount').val());
    var startDate = $('#voucher-start-date').val();
    var endDate = $('#voucher-end-date').val();
    var isActive = $('#voucher-active').prop('checked');
    var rolloverEnabled = $('#voucher-rollover').prop('checked');
    var userGroupId = $('#voucher-user-group').val();
    
    // Validation
    if (!name || !defaultAmount || !startDate || !endDate) {
      Helpers.showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    if (!userGroupId) {
      Helpers.showAlert('Please select a user group for this voucher', 'warning');
      return;
    }
    
    // Get products
    var group = partner.groups.find(function(g) { return g.id === userGroupId; });
    if (!group) {
      Helpers.showAlert('Selected user group not found', 'warning');
      return;
    }
    
    var productIds = this.selectedProductIds;
    if (productIds.length === 0) {
      Helpers.showAlert('Please select at least one product for this voucher', 'warning');
      return;
    }
    
    // VALIDATION: Ensure selected products exist in available products
    var invalidProducts = productIds.filter(function(pid) {
      return !AppState.products.some(function(p) { return p.id === pid; });
    });
    
    if (invalidProducts.length > 0) {
      Helpers.showAlert('One or more selected products are invalid', 'warning');
      return;
    }
    
    // VALIDATION: Check for duplicate product assignments in other ACTIVE vouchers within same group
    // IMPORTANT: Exclude the current voucher being edited to allow updating it with the same products
    var existingActiveVouchers = partner.vouchers.filter(function(v) {
      // Exclude current voucher if editing (must match exactly)
      if (self.voucherId && String(v.id) === String(self.voucherId)) {
        return false;
      }
      // Only check ACTIVE vouchers assigned to the same group
      return v.isActive && v.userGroupIds && v.userGroupIds.indexOf(userGroupId) !== -1;
    });
    
    var duplicateProducts = [];
    existingActiveVouchers.forEach(function(voucher) {
      // Double-check: skip if this is the voucher being edited (defensive check)
      if (self.voucherId && String(voucher.id) === String(self.voucherId)) {
        return;
      }
      
      productIds.forEach(function(pid) {
        if (voucher.productIds && voucher.productIds.indexOf(pid) !== -1) {
          var product = AppState.products.find(function(p) { return p.id === pid; });
          if (product) {
            // Store product name and voucher name
            var existing = duplicateProducts.find(function(dp) { return dp.productId === pid; });
            if (!existing) {
              duplicateProducts.push({
                productId: pid,
                productName: product.name,
                voucherName: voucher.name
              });
            }
          }
        }
      });
    });
    
    if (duplicateProducts.length > 0) {
      var errorMsg = 'The following products are already assigned to an active voucher in this user group:\\n\\n';
      duplicateProducts.slice(0, 5).forEach(function(dp) {
        errorMsg += dp.productName + ' (assigned to: ' + dp.voucherName + ')\\n';
      });
      if (duplicateProducts.length > 5) {
        errorMsg += '... and ' + (duplicateProducts.length - 5) + ' more\\n';
      }
      errorMsg += '\\nEach product can only be assigned to one active voucher per user group at a time.';
      Helpers.showAlert(errorMsg, 'warning');
      return;
    }
    
    UIHelpers.showLoadingSpinner(this.voucherId ? 'Updating voucher...' : 'Creating voucher...');
    
    setTimeout(function() {
      var voucherData = {
        name: name,
        description: description,
        defaultAmount: defaultAmount,
        startDate: startDate,
        endDate: endDate,
        isActive: isActive,
        rolloverEnabled: rolloverEnabled,
        productIds: productIds,
        userGroupIds: [userGroupId]
      };
      
      if (self.voucherId) {
        // Edit existing voucher
        var updatedVouchers = partner.vouchers.map(function(v) {
          if (v.id === self.voucherId) {
            return Object.assign({}, v, voucherData);
          }
          return v;
        });
        
        // Update employees with new voucher amounts
        var updatedEmployees = partner.employees.map(function(emp) {
          if (emp.groupId === userGroupId) {
            var voucherBalances = emp.voucherBalances || [];
            var existingBalance = voucherBalances.find(function(vb) {
              return vb.voucherId === self.voucherId;
            });
            
            if (existingBalance) {
              voucherBalances = voucherBalances.map(function(vb) {
                if (vb.voucherId === self.voucherId) {
                  return Object.assign({}, vb, { remainingAmount: defaultAmount });
                }
                return vb;
              });
            } else {
              voucherBalances.push({
                voucherId: self.voucherId,
                remainingAmount: defaultAmount
              });
            }
            
            var totalBalance = voucherBalances.reduce(function(sum, vb) {
              return sum + vb.remainingAmount;
            }, 0);
            
            return Object.assign({}, emp, {
              voucherBalances: voucherBalances,
              remainingBalance: totalBalance,
              voucherExpiry: endDate
            });
          }
          return emp;
        });
        
        AppState.updateCustomer(self.customerId, {
          vouchers: updatedVouchers,
          employees: updatedEmployees
        });
        
        // Clear sessionStorage
        sessionStorage.removeItem('voucherFormData');
        sessionStorage.removeItem('voucherSelectedProducts');
        
        UIHelpers.hideLoadingSpinner();
        Helpers.showAlert('Voucher updated successfully', 'success');
        App.navigate('customer-detail', { customerId: self.customerId, tab: 'vouchers' });
        
      } else {
        // Create new voucher
        var newVoucher = Object.assign({
          id: 'voucher_' + Date.now()
        }, voucherData);
        
        var updatedVouchers = partner.vouchers.concat([newVoucher]);
        
        // Update employees in the selected user group
        var updatedEmployees = partner.employees.map(function(emp) {
          if (emp.groupId === userGroupId) {
            var voucherBalances = emp.voucherBalances || [];
            voucherBalances.push({
              voucherId: newVoucher.id,
              remainingAmount: defaultAmount
            });
            
            var totalBalance = voucherBalances.reduce(function(sum, vb) {
              return sum + vb.remainingAmount;
            }, 0);
            
            return Object.assign({}, emp, {
              voucherBalances: voucherBalances,
              remainingBalance: totalBalance,
              voucherExpiry: endDate
            });
          }
          return emp;
        });
        
        AppState.updateCustomer(self.customerId, {
          vouchers: updatedVouchers,
          employees: updatedEmployees,
          activeVouchers: updatedVouchers.filter(function(v) { return v.isActive; }).length
        });
        
        // Clear sessionStorage
        sessionStorage.removeItem('voucherFormData');
        sessionStorage.removeItem('voucherSelectedProducts');
        
        UIHelpers.hideLoadingSpinner();
        Helpers.showAlert('Voucher created successfully', 'success');
        App.navigate('customer-detail', { customerId: self.customerId, tab: 'vouchers' });
      }
    }, 500);
  },
  
  deleteVoucher: function() {
    var self = this;
    if (!this.voucherId) {
      return; // Can't delete if not editing
    }
    
    var partner = AppState.getCustomerById(this.customerId);
    var voucher = partner.vouchers.find(function(v) { return v.id === self.voucherId; });
    
    if (!voucher) {
      Helpers.showAlert('Voucher not found', 'error');
      return;
    }
    
    // Check if voucher is assigned to any employees
    var affectedEmployees = partner.employees.filter(function(e) {
      return e.voucherBalances && e.voucherBalances.some(function(vb) {
        return vb.voucherId === self.voucherId;
      });
    }).length;
    
    var message = 'Are you sure you want to delete the voucher "' + voucher.name + '"?';
    
    if (affectedEmployees > 0) {
      message += '\n\nWarning: This voucher is currently assigned to ' + affectedEmployees + ' employee(s). Their voucher balances will be updated.';
    }
    
    UIHelpers.showConfirmDialog({
      title: 'Delete Voucher',
      message: message,
      confirmText: 'Delete Voucher',
      confirmClass: 'btn-danger',
      onConfirm: function() {
        UIHelpers.showLoadingSpinner('Deleting voucher...');
        
        setTimeout(function() {
          var updatedVouchers = partner.vouchers.filter(function(v) { return v.id !== self.voucherId; });
          
          // Update employee voucher balances
          var updatedEmployees = partner.employees.map(function(e) {
            if (e.voucherBalances) {
              var newBalances = e.voucherBalances.filter(function(vb) {
                return vb.voucherId !== self.voucherId;
              });
              var newTotal = newBalances.reduce(function(sum, vb) {
                return sum + vb.remainingAmount;
              }, 0);
              
              return Object.assign({}, e, {
                voucherBalances: newBalances,
                remainingBalance: newTotal
              });
            }
            return e;
          });
          
          AppState.updateCustomer(self.customerId, { 
            vouchers: updatedVouchers,
            employees: updatedEmployees,
            activeVouchers: updatedVouchers.filter(function(v) { return v.isActive; }).length
          });
          
          // Clear sessionStorage
          sessionStorage.removeItem('voucherFormData');
          sessionStorage.removeItem('voucherSelectedProducts');
          
          UIHelpers.hideLoadingSpinner();
          Helpers.showAlert('Voucher "' + voucher.name + '" deleted successfully', 'success');
          App.navigate('customer-detail', { customerId: self.customerId, tab: 'vouchers' });
        }, 500);
      }
    });
  },
  
  updateActiveNav: function(view) {
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="' + view + '"]').addClass('active');
  }
};
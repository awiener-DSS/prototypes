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
        if (formData.departmentId) {
          $('#voucher-department').val(formData.departmentId);
          if (formData.locationId) {
            $('#voucher-department option[value="' + formData.departmentId + '"]').attr('data-location-id', formData.locationId);
          }
          this.updateDepartmentProductsDisplay(formData.departmentId, formData.locationId);
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
        // If a department is already selected, update the summary
        var selectedDepartmentId = $('#voucher-department').val();
        if (selectedDepartmentId) {
          this.updateSelectedProductsSummary();
        }
        // Don't remove from sessionStorage yet - keep it until form is submitted or cancelled
      } catch (e) {
        console.error('Error parsing saved products:', e);
      }
    } else if (voucher && !this.isReturningFromProductSelection) {
      // Only load from voucher if we're not returning from product selection
      // This is already handled in populateForm, but we need to make sure it's called
      if (voucher.departmentId) {
        this.updateDepartmentProductsDisplay(voucher.departmentId, voucher.locationId);
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
      '<div class="col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">' +
      '<div style="margin-top: 15px; margin-bottom: 10px;">' +
      '<button class="btn btn-default btn-sm" id="back-to-vouchers">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to Vouchers' +
      '</button>' +
      '</div>' +
      '<div style="margin-bottom: 15px;">' +
      '<h3 style="margin: 0 0 4px 0;">' + (isEdit ? 'Edit Voucher' : 'Create New Voucher') + '</h3>' +
      '<p class="text-muted" style="margin: 0; font-size: 12px;">' + 
      (isEdit ? 'Update the active/inactive status of this voucher. To modify other voucher details, create a new voucher.' : 'Create a voucher and assign it to a department.') +
      '</p>' +
      '</div>' +
      
      '<form id="voucher-form">' +
      
      // Voucher Details (Basic Information + Department Assignment, condensed)
      '<div class="panel panel-default">' +
      '<div class="panel-heading">' +
      '<h3 class="panel-title">Voucher Details</h3>' +
      '</div>' +
      '<div class="panel-body">' +
      
      // Name + Amount
      '<div class="row">' +
      '<div class="col-sm-7">' +
      '<div class="form-group" style="margin-bottom: 10px;">' +
      '<label for="voucher-name">Voucher Name <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="voucher-name" placeholder="e.g., Monthly Equipment Allowance" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-sm-5">' +
      '<div class="form-group" style="margin-bottom: 10px;">' +
      '<label for="voucher-amount">Amount <span class="text-danger">*</span></label>' +
      '<div class="input-group" style="max-width: 220px;">' +
      '<span class="input-group-addon">$</span>' +
      '<input type="number" class="form-control" id="voucher-amount" step="0.01" min="0" placeholder="0.00" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      
      // Description (under voucher name)
      '<div class="form-group" style="margin-bottom: 10px;">' +
      '<label for="voucher-description">Description</label>' +
      '<small class="text-muted" style="display: block; margin-bottom: 4px;">This description will be shown to employees during purchase.</small>' +
      '<textarea class="form-control" id="voucher-description" rows="2" placeholder="Describe what this voucher can be used for..."></textarea>' +
      '</div>' +
      
      // Dates
      '<div class="row">' +
      '<div class="col-sm-6">' +
      '<div class="form-group" style="margin-bottom: 10px;">' +
      '<label for="voucher-start-date">Start Date <span class="text-danger">*</span></label>' +
      '<input type="date" class="form-control" id="voucher-start-date" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-sm-6">' +
      '<div class="form-group" style="margin-bottom: 10px;">' +
      '<label for="voucher-end-date">End Date <span class="text-danger">*</span></label>' +
      '<input type="date" class="form-control" id="voucher-end-date" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      
      // Status / Rollover
      '<div class="row" style="margin-bottom: 10px;">' +
      '<div class="col-sm-7">' +
      '<div class="checkbox" style="margin-top: 5px; margin-bottom: 5px;">' +
      '<label>' +
      '<input type="checkbox" id="voucher-active" checked> ' +
      '<strong>Active</strong> - Voucher is currently active and can be used' +
      '</label>' +
      '</div>' +
      '</div>' +
      '<div class="col-sm-5">' +
      '<div class="checkbox" style="margin-top: 5px; margin-bottom: 5px;">' +
      '<label>' +
      '<input type="checkbox" id="voucher-rollover"> ' +
      '<strong>Rollover Enabled</strong> - Unused credit carries over to future orders until limit reached or voucher expires' +
      '</label>' +
      '</div>' +
      '</div>' +
      '</div>' +
      
      // Department Assignment
      '<div class="form-group" style="margin-bottom: 10px;">' +
      '<label for="voucher-department">Assign to Department <span class="text-danger">*</span></label>' +
      '<small class="text-muted" style="display: block; margin-bottom: 4px;">Choose a department to control who can use this voucher.</small>' +
      '<select class="form-control" id="voucher-department" required>' +
      '<option value="">Select a department...</option>';
    
    // Show all departments organized by location
    if (partner.locations && partner.locations.length > 0) {
      partner.locations.forEach(function(location) {
        if (location.departments && location.departments.length > 0) {
          location.departments.forEach(function(department) {
            var locationLabel = location.locationId || 'Location';
            html += '<option value="' + department.id + '" data-location-id="' + location.id + '">' +
              Helpers.escapeHtml(locationLabel + ' - ' + department.name) + ' (' + (department.employeeCount || 0) + ' employees)' +
              '</option>';
          });
        }
      });
    } else if (partner.groups && partner.groups.length > 0) {
      // Fallback to old groups structure if locations don't exist
      partner.groups.forEach(function(group) {
        html += '<option value="' + group.id + '">' +
          Helpers.escapeHtml(group.name) + ' (' + (group.employeeCount || 0) + ' employees)' +
          '</option>';
      });
    }
    
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
      (isEdit ? 
        // Read-only display for editing
        '<div id="voucher-products-readonly">' +
        '<p class="text-muted" style="margin-bottom: 12px;">Products that can be purchased with this voucher:</p>' +
        '<div id="voucher-products-list" style="max-height: 300px; overflow-y: auto;"></div>' +
        '</div>' :
        // Editable interface for creating
        '<p class="text-muted" style="margin-bottom: 8px;">Choose which products this voucher can be applied to. These must be a subset of the products visible to the selected department.</p>' +
        '<div class="form-group">' +
        '<button type="button" class="btn btn-primary" id="select-qualified-products-btn">' +
        '<span class="glyphicon glyphicon-list"></span> Select Qualified Products' +
        '</button>' +
        '</div>' +
        '<div id="selected-products-summary" style="display: none; margin-top: 15px; padding: 15px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;">' +
        '<strong><span id="selected-products-count">0</span> product(s) selected</strong>' +
        '<div id="selected-products-list" style="margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>' +
        '</div>'
      ) +
      '</div>' +
      '</div>' +
      
      // Form Actions
      '<div class="form-group">' +
      '<button type="submit" class="btn btn-primary">' +
      '<span class="glyphicon glyphicon-floppy-disk"></span> ' +
      (isEdit ? 'Update Status' : 'Create Voucher') +
      '</button> ' +
      '<button type="button" class="btn btn-default" id="cancel-voucher-form">Cancel</button>' +
      '</div>' +
      (isEdit ? '<div class="alert alert-info" style="margin-top: 15px; font-size: 12px;">' +
      '<strong>Note:</strong> Once a voucher has been created, only the Active/Inactive status can be changed. ' +
      'To modify other voucher details, please create a new voucher.' +
      '</div>' : '') +
      
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
    
    // When editing, disable all fields except active/inactive checkbox
    if (this.voucherId) {
      $('#voucher-name').prop('disabled', true);
      $('#voucher-description').prop('disabled', true);
      $('#voucher-amount').prop('disabled', true);
      $('#voucher-start-date').prop('disabled', true);
      $('#voucher-end-date').prop('disabled', true);
      $('#voucher-rollover').prop('disabled', true);
      $('#voucher-department').prop('disabled', true);
      $('#select-qualified-products-btn').prop('disabled', true);
    }
    
    // Try new structure first (departmentId/locationId)
    if (voucher.departmentId) {
      $('#voucher-department').val(voucher.departmentId);
      if (voucher.locationId) {
        $('#voucher-department option[value="' + voucher.departmentId + '"]').attr('data-location-id', voucher.locationId);
      }
      this.updateDepartmentProductsDisplay(voucher.departmentId, voucher.locationId);
      
      // Set selected products
      if (voucher.productIds) {
        this.selectedProductIds = voucher.productIds.slice();
        if (this.voucherId) {
          // When editing, always show the panel and display products in read-only format
          $('#qualified-products-panel').show();
          this.displayVoucherProducts(voucher.productIds);
        } else {
          this.updateSelectedProductsSummary();
        }
      } else if (this.voucherId) {
        // When editing, show panel even if no products
        $('#qualified-products-panel').show();
        this.displayVoucherProducts([]);
      }
    } else if (voucher.departmentId) {
      // Use department structure
      $('#voucher-department').val(voucher.departmentId);
      if (voucher.locationId) {
        $('#voucher-department option[value="' + voucher.departmentId + '"]').attr('data-location-id', voucher.locationId);
      }
      this.updateDepartmentProductsDisplay(voucher.departmentId, voucher.locationId);
      
      // Set selected products
      if (voucher.productIds) {
        this.selectedProductIds = voucher.productIds.slice();
        if (this.voucherId) {
          // When editing, always show the panel and display products in read-only format
          $('#qualified-products-panel').show();
          this.displayVoucherProducts(voucher.productIds);
        } else {
          this.updateSelectedProductsSummary();
        }
      } else if (this.voucherId) {
        // When editing, show panel even if no products
        $('#qualified-products-panel').show();
        this.displayVoucherProducts([]);
      }
    } else if (this.voucherId) {
      // When editing but no department, still show products if they exist
      if (voucher.productIds && voucher.productIds.length > 0) {
        $('#qualified-products-panel').show();
        this.displayVoucherProducts(voucher.productIds);
      }
    }
  },
  
  displayVoucherProducts: function(productIds) {
    if (!productIds || productIds.length === 0) {
      $('#voucher-products-list').html('<p class="text-muted">No products assigned to this voucher.</p>');
      return;
    }
    
    var products = AppState.products.filter(function(p) {
      return productIds.indexOf(p.id) !== -1;
    });
    
    if (products.length === 0) {
      $('#voucher-products-list').html('<p class="text-muted">No products found.</p>');
      return;
    }
    
    var html = '<div class="list-group">';
    products.forEach(function(product) {
      html += '<div class="list-group-item" style="padding: 10px 15px;">' +
        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
        '<div>' +
        '<strong style="font-size: 13px; color: #333;">' + Helpers.escapeHtml(product.name || 'Unnamed Product') + '</strong>' +
        (product.surewerxSku ? '<br><span class="text-muted" style="font-size: 11px;">SKU: ' + Helpers.escapeHtml(product.surewerxSku) + '</span>' : '') +
        (product.category ? '<br><span class="text-muted" style="font-size: 11px;">Category: ' + Helpers.escapeHtml(product.category) + '</span>' : '') +
        '</div>' +
        (product.price ? '<div style="text-align: right;">' +
        '<span style="font-weight: 600; color: #2c3e50; font-size: 13px;">' + Helpers.formatCurrency(product.price) + '</span>' +
        '</div>' : '') +
        '</div>' +
        '</div>';
    });
    html += '</div>';
    
    $('#voucher-products-list').html(html);
  },
  
  attachEvents: function() {
    var self = this;
    
    // Back to vouchers button
    $(document).on('click', '#back-to-vouchers', function() {
      App.navigate('customer-detail', { customerId: self.customerId, tab: 'vouchers' });
    });
    
    // Cancel button
    $(document).on('click', '#cancel-voucher-form', function() {
      // Clear sessionStorage when cancelling
      sessionStorage.removeItem('voucherFormData');
      sessionStorage.removeItem('voucherSelectedProducts');
      App.navigate('customer-detail', { customerId: self.customerId, tab: 'vouchers' });
    });
    
    
    // Department selection
    $(document).on('change', '#voucher-department', function() {
      var departmentId = $(this).val();
      var selectedOption = $(this).find('option:selected');
      var locationId = selectedOption.data('location-id');
      self.updateDepartmentProductsDisplay(departmentId, locationId);
    });
    
    // Select qualified products button
    $(document).on('click', '#select-qualified-products-btn', function() {
      var departmentId = $('#voucher-department').val();
      if (!departmentId) {
        Helpers.showAlert('Please select a department first', 'warning');
        return;
      }
      
      var selectedOption = $('#voucher-department option:selected');
      var locationId = selectedOption.data('location-id');
      // Store current form data temporarily (for both new and edit)
      var formData = {
        name: $('#voucher-name').val(),
        description: $('#voucher-description').val(),
        amount: $('#voucher-amount').val(),
        startDate: $('#voucher-start-date').val(),
        endDate: $('#voucher-end-date').val(),
        isActive: $('#voucher-active').prop('checked'),
        rolloverEnabled: $('#voucher-rollover').prop('checked'),
        departmentId: departmentId,
        locationId: locationId || null
      };
      
      // Store in sessionStorage to preserve form data
      sessionStorage.setItem('voucherFormData', JSON.stringify(formData));
      sessionStorage.setItem('voucherSelectedProducts', JSON.stringify(self.selectedProductIds));
      
      // Navigate to product selection page
      var url = 'voucher-product-selection.html?customerId=' + encodeURIComponent(self.customerId);
      if (self.voucherId) {
        url += '&voucherId=' + encodeURIComponent(self.voucherId);
      }
      url += '&departmentId=' + encodeURIComponent(departmentId);
      if (locationId) {
        url += '&locationId=' + encodeURIComponent(locationId);
      }
      window.location.href = url;
    });
    
    // Form submission
    $(document).on('submit', '#voucher-form', function(e) {
      e.preventDefault();
      self.handleSubmit();
    });
  },
  
  updateDepartmentProductsDisplay: function(departmentId, locationId) {
    var self = this;
    if (!departmentId) {
      $('#qualified-products-panel').hide();
      return;
    }
    
    var partner = AppState.getCustomerById(this.customerId);
    var department = null;
    
    // Use department structure (locations -> departments)
    if (locationId && partner.locations && partner.locations.length > 0) {
      var location = partner.locations.find(function(l) { return l.id === locationId; });
      if (location && location.departments) {
        department = location.departments.find(function(d) { return d.id === departmentId; });
      }
    }
    
    // Fallback: search all locations if locationId not provided
    if (!department && partner.locations && partner.locations.length > 0) {
      for (var i = 0; i < partner.locations.length; i++) {
        var loc = partner.locations[i];
        if (loc.departments) {
          department = loc.departments.find(function(d) { return d.id === departmentId; });
          if (department) {
            locationId = loc.id;
            // Update the select option with locationId
            $('#voucher-department option[value="' + departmentId + '"]').attr('data-location-id', locationId);
            break;
          }
        }
      }
    }
    
    // Fallback to old groups structure if locations don't exist
    if (!department && partner.groups && partner.groups.length > 0) {
      department = partner.groups.find(function(g) { return g.id === departmentId; });
    }
    
    if (!department && !this.voucherId) {
      $('#qualified-products-panel').hide();
      return;
    }
    
    // Show qualified products panel
    $('#qualified-products-panel').show();
    
    // Only scroll to qualified products section for new vouchers
    if (!this.voucherId) {
      var $panel = $('#qualified-products-panel');
      if ($panel.length) {
        $('html, body').animate({
          scrollTop: $panel.offset().top - 80
        }, 300);
      }
    }
    
    // Only load selected products from sessionStorage if we're returning from product selection page
    // Don't load stale sessionStorage data when user just selects a department for a new voucher
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
      // For new vouchers, ensure selectedProductIds is empty when selecting a department
      this.selectedProductIds = [];
    }
    
    // Update selected products summary (only for new vouchers)
    if (!this.voucherId) {
      this.updateSelectedProductsSummary();
    }
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
    
    if (this.voucherId) {
      // When editing, only allow updating active/inactive status
      var isActive = $('#voucher-active').prop('checked');
      
      UIHelpers.showLoadingSpinner('Updating voucher status...');
      
      setTimeout(function() {
        var updatedVouchers = partner.vouchers.map(function(v) {
          if (v.id === self.voucherId) {
            return Object.assign({}, v, { isActive: isActive });
          }
          return v;
        });
        
        AppState.updateCustomer(self.customerId, {
          vouchers: updatedVouchers,
          activeVouchers: updatedVouchers.filter(function(v) { return v.isActive; }).length
        });
        
        UIHelpers.hideLoadingSpinner();
        Helpers.showAlert('Voucher status updated successfully', 'success');
        App.navigate('customer-detail', { customerId: self.customerId, tab: 'vouchers' });
      }, 500);
      
      return;
    }
    
    // Get form values for new voucher
    var name = $('#voucher-name').val().trim();
    var description = $('#voucher-description').val().trim();
    var defaultAmount = parseFloat($('#voucher-amount').val());
    var startDate = $('#voucher-start-date').val();
    var endDate = $('#voucher-end-date').val();
    var isActive = $('#voucher-active').prop('checked');
    var rolloverEnabled = $('#voucher-rollover').prop('checked');
    var departmentId = $('#voucher-department').val();
    var selectedOption = $('#voucher-department option:selected');
    var locationId = selectedOption.data('location-id');
    
    // Validation
    if (!name || !defaultAmount || !startDate || !endDate) {
      Helpers.showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    if (!departmentId) {
      Helpers.showAlert('Please select a department for this voucher', 'warning');
      return;
    }
    
    // Get department
    var department = null;
    if (locationId && partner.locations) {
      var location = partner.locations.find(function(l) { return l.id === locationId; });
      if (location && location.departments) {
        department = location.departments.find(function(d) { return d.id === departmentId; });
      }
    }
    
    // Fallback to old groups structure
    if (!department && partner.groups) {
      var group = partner.groups.find(function(g) { return g.id === departmentId; });
      if (group) {
        department = group;
      }
    }
    
    if (!department) {
      Helpers.showAlert('Selected department not found', 'warning');
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
    
    // VALIDATION: Check for duplicate product assignments in other ACTIVE vouchers within same department
    var existingActiveVouchers = partner.vouchers.filter(function(v) {
      // Only check ACTIVE vouchers assigned to the same department
      if (v.departmentId && v.departmentId === departmentId) {
        if (locationId && v.locationId) {
          return v.locationId === locationId;
        }
        return !locationId && !v.locationId;
      }
      return false;
    });
    
    var duplicateProducts = [];
    existingActiveVouchers.forEach(function(voucher) {
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
      errorMsg += '\\nEach product can only be assigned to one active voucher per department at a time.';
      Helpers.showAlert(errorMsg, 'warning');
      return;
    }
    
    UIHelpers.showLoadingSpinner('Creating voucher...');
    
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
        departmentId: departmentId,
        locationId: locationId || null
      };
      
      // Create new voucher
      var newVoucher = Object.assign({
        id: 'voucher_' + Date.now()
      }, voucherData);
      
      var updatedVouchers = partner.vouchers.concat([newVoucher]);
      
      // Update employees in the selected department
      var updatedEmployees = partner.employees.map(function(emp) {
        // Check if employee belongs to this department (new structure)
        var matchesDepartment = false;
        if (emp.departmentId === departmentId) {
          if (locationId && emp.locationId) {
            matchesDepartment = emp.locationId === locationId;
          } else if (!locationId && !emp.locationId) {
            matchesDepartment = true;
          }
        }
        
        if (matchesDepartment) {
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
    }, 500);
  },
  
  updateActiveNav: function(view) {
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="' + view + '"]').addClass('active');
  }
};
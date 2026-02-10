// Voucher Product Selection Component
var VoucherProductSelectionComponent = {
  customerId: null,
  voucherId: null,
  departmentId: null,
  locationId: null,
  partner: null,
  department: null,
  selectedProductIds: [],
  availableProducts: [],
  searchQuery: '',
  
  init: function(customerId, voucherId, departmentId, locationId) {
    this.customerId = customerId;
    this.voucherId = voucherId || null;
    this.departmentId = departmentId;
    this.locationId = locationId || null;
    
    // Refresh partner data to get latest state
    this.partner = AppState.customers.find(function(p) { return p.id === customerId; });
    
    if (!this.partner) {
      Helpers.showAlert('Partner not found', 'danger');
      App.navigate('dashboard');
      return;
    }
    
    // Try to find department in new structure (locations -> departments)
    if (this.locationId && this.partner.locations && this.partner.locations.length > 0) {
      var location = this.partner.locations.find(function(l) { return l.id === this.locationId; }.bind(this));
      if (location && location.departments) {
        this.department = location.departments.find(function(d) { return d.id === this.departmentId; }.bind(this));
      }
    }
    
    // Fallback: search all locations if locationId not provided
    if (!this.department && this.partner.locations && this.partner.locations.length > 0) {
      for (var i = 0; i < this.partner.locations.length; i++) {
        var loc = this.partner.locations[i];
        if (loc.departments) {
          this.department = loc.departments.find(function(d) { return d.id === this.departmentId; }.bind(this));
          if (this.department) {
            this.locationId = loc.id;
            break;
          }
        }
      }
    }
    
    // Fallback to old groups structure
    if (!this.department && this.partner.groups && this.partner.groups.length > 0) {
      var group = this.partner.groups.find(function(g) { return g.id === this.departmentId; }.bind(this));
      if (group) {
        this.department = group;
      }
    }
    
    if (!this.department) {
      Helpers.showAlert('Department not found', 'danger');
      this.goBackToVoucherForm();
      return;
    }
    
    // Get all available products (all products the user has visibility into)
    this.availableProducts = AppState.products.slice();
    
    // Load previously selected products from sessionStorage or voucher
    var savedProducts = sessionStorage.getItem('voucherSelectedProducts');
    if (savedProducts) {
      try {
        var savedIds = JSON.parse(savedProducts);
        // Filter to only include products that exist in available products
        this.selectedProductIds = savedIds.filter(function(id) {
          return this.availableProducts.some(function(p) { return p.id === id; });
        }.bind(this));
      } catch (e) {
        console.error('Error parsing saved products:', e);
      }
    }
    
    // If editing existing voucher, load its products
    if (this.voucherId) {
      var voucher = this.partner.vouchers.find(function(v) { return v.id === this.voucherId; }.bind(this));
      if (voucher && voucher.productIds) {
        // Filter to only include products that exist in available products
        this.selectedProductIds = voucher.productIds.filter(function(id) {
          return this.availableProducts.some(function(p) { return p.id === id; });
        }.bind(this));
      }
    }
    
    this.searchQuery = '';
    
    this.render();
    this.attachEvents();
  },
  
  render: function() {
    var html = '<div>' +
      Templates.header() +
      '<div class="container">' +
      '<div class="row mb-4">' +
      '<div class="col-md-12">' +
      '<button class="btn btn-default mb-3" id="back-to-voucher-form">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to Voucher Form' +
      '</button>' +
      '<h2>Select Qualified Products</h2>' +
      '<p class="text-muted">Select which products this voucher can be applied to. All products you have visibility into are shown below.</p>' +
      '</div>' +
      '</div>' +
      
      '<div id="selected-products-section" style="display: none; margin-bottom: 20px;">' +
      '<div class="panel panel-success">' +
      '<div class="panel-heading">' +
      '<h4 class="panel-title"><span class="glyphicon glyphicon-ok-circle"></span> Selected Products (<span id="selected-count-header">0</span>)</h4>' +
      '</div>' +
      '<div class="panel-body">' +
      '<div id="selected-products-list" style="max-height: 200px; overflow-y: auto;"></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      
      '<div class="row mb-4">' +
      '<div class="col-md-12">' +
      '<div class="input-group">' +
      '<span class="input-group-addon"><span class="glyphicon glyphicon-search"></span></span>' +
      '<input type="text" class="form-control" id="product-search" placeholder="Search by product name, category, or SKU..." value="' + Helpers.escapeHtml(this.searchQuery) + '">' +
      '</div>' +
      '</div>' +
      '</div>' +
      
      '<div class="well well-sm" style="margin-bottom: 15px;">' +
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<strong><span class="glyphicon glyphicon-ok-circle text-success"></span> <span id="selected-count">' + this.selectedProductIds.length + '</span> product(s) selected</strong>' +
      '</div>' +
      '<div class="col-md-6 text-right">' +
      '<button type="button" class="btn btn-xs btn-default" id="select-all-products">Select All</button> ' +
      '<button type="button" class="btn btn-xs btn-default" id="deselect-all-products">Deselect All</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      
      '<div id="products-table-container">' +
      this.renderProductsTable() +
      '</div>' +
      
      '</div>' +
      '</div>' +
      
      '<div style="position: fixed; bottom: 0; left: 0; right: 0; background-color: #fff; padding: 15px; border-top: 2px solid #e0e0e0; box-shadow: 0 -2px 5px rgba(0,0,0,0.1); z-index: 1000;">' +
      '<div class="container">' +
      '<div class="row">' +
      '<div class="col-md-12 text-right">' +
      '<button type="button" class="btn btn-default" id="cancel-btn">Cancel</button> ' +
      '<button type="button" class="btn btn-primary" id="save-btn">Save Selected Products</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div style="height: 70px;"></div>';
    
    $('#app-container').html(html);
    this.updateActiveNav('dashboard');
    this.renderSelectedProductsSection();
  },
  
  getFilteredProducts: function() {
    var products = this.availableProducts;
    var searchLower = this.searchQuery.toLowerCase();
    
    var filtered = products.filter(function(product) {
      return !searchLower ||
        product.name.toLowerCase().indexOf(searchLower) > -1 ||
        product.category.toLowerCase().indexOf(searchLower) > -1 ||
        product.surewerxSku.toLowerCase().indexOf(searchLower) > -1 ||
        (product.customSku && product.customSku.toLowerCase().indexOf(searchLower) > -1);
    }.bind(this));
    
    return filtered;
  },
  
  renderSelectedProductsSection: function() {
    if (this.selectedProductIds.length === 0) {
      $('#selected-products-section').hide();
      return;
    }
    
    $('#selected-count-header').text(this.selectedProductIds.length);
    
    var html = '<div class="table-responsive">' +
      '<table class="table table-condensed" style="margin-bottom: 0;">' +
      '<thead>' +
      '<tr>' +
      '<th>Product Name</th>' +
      '<th>SureWerx SKU</th>' +
      '<th>Category</th>' +
      '<th>Price</th>' +
      '<th style="width: 80px;">Action</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>';
    
    this.selectedProductIds.forEach(function(productId) {
      var product = this.availableProducts.find(function(p) { return p.id === productId; });
      if (product) {
        html += '<tr>' +
          '<td>' + Helpers.escapeHtml(product.name) + '</td>' +
          '<td><code>' + Helpers.escapeHtml(product.surewerxSku) + '</code></td>' +
          '<td><span class="label label-default">' + Helpers.escapeHtml(product.category) + '</span></td>' +
          '<td>' + Helpers.formatCurrency(product.price) + '</td>' +
          '<td><button type="button" class="btn btn-xs btn-danger remove-selected-product" data-product-id="' + product.id + '">Remove</button></td>' +
          '</tr>';
      }
    }.bind(this));
    
    html += '</tbody></table></div>';
    
    $('#selected-products-list').html(html);
    $('#selected-products-section').show();
  },
  
  renderProductsTable: function() {
    var filteredProducts = this.getFilteredProducts();
    
    if (filteredProducts.length === 0) {
      return '<div class="panel panel-default">' +
        '<div class="panel-body text-center text-muted" style="padding: 40px;">' +
        '<p>No products found matching your search.</p>' +
        '</div>' +
        '</div>';
    }
    
    var html = '<div class="table-responsive">' +
      '<table class="table table-hover">' +
      '<thead>' +
      '<tr>' +
      '<th style="width: 40px;"><input type="checkbox" id="select-all-checkbox"></th>' +
      '<th>Product Name</th>' +
      '<th>SureWerx SKU</th>' +
      '<th>Category</th>' +
      '<th>Price</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>';
    
    filteredProducts.forEach(function(product) {
      var isSelected = this.selectedProductIds.indexOf(product.id) !== -1;
      var conflict = this.checkProductConflict(product.id);
      var isDisabled = conflict !== null;
      var rowStyle = isDisabled ? 'cursor: not-allowed; opacity: 0.6;' : 'cursor: pointer;';
      var conflictInfo = '';
      
      if (isDisabled && conflict) {
        // Extract voucher name from conflict message or find it directly
        var activeVouchers = this.partner.vouchers.filter(function(v) {
          if (this.voucherId && v.id === this.voucherId) {
            return false;
          }
          // Check if voucher is assigned to this department
          var matchesDepartment = false;
          if (v.departmentId === this.departmentId) {
            if (this.locationId && v.locationId) {
              matchesDepartment = v.locationId === this.locationId;
            } else if (!this.locationId && !v.locationId) {
              matchesDepartment = true;
            }
          }
          return v.isActive && matchesDepartment && v.productIds && v.productIds.indexOf(product.id) !== -1;
        }.bind(this));
        if (activeVouchers.length > 0) {
          conflictInfo = '<span class="text-muted" style="font-size: 11px; display: block; margin-top: 3px;">Already assigned to: ' + Helpers.escapeHtml(activeVouchers[0].name) + '</span>';
        }
      }
      
      html += '<tr class="product-row' + (isDisabled ? ' disabled-product' : '') + '" data-product-id="' + product.id + '" style="' + rowStyle + '">' +
        '<td><input type="checkbox" class="product-checkbox" data-product-id="' + product.id + '" ' + (isSelected ? 'checked' : '') + (isDisabled ? ' disabled' : '') + '></td>' +
        '<td>' + Helpers.escapeHtml(product.name) + conflictInfo + '</td>' +
        '<td><code>' + Helpers.escapeHtml(product.surewerxSku) + '</code></td>' +
        '<td><span class="label label-default">' + Helpers.escapeHtml(product.category) + '</span></td>' +
        '<td>' + Helpers.formatCurrency(product.price) + '</td>' +
        '</tr>';
    }.bind(this));
    
    html += '</tbody></table></div>';
    
    return html;
  },
  
  attachEvents: function() {
    var self = this;
    
    // Back button
    $(document).on('click', '#back-to-voucher-form', function() {
      self.goBackToVoucherForm();
    });
    
    // Cancel button
    $(document).on('click', '#cancel-btn', function() {
      self.goBackToVoucherForm();
    });
    
    // Save button
    $(document).on('click', '#save-btn', function() {
      if (self.selectedProductIds.length === 0) {
        Helpers.showAlert('Please select at least one product', 'warning');
        return;
      }
      
      // Save selected products to sessionStorage
      sessionStorage.setItem('voucherSelectedProducts', JSON.stringify(self.selectedProductIds));
      
      // Navigate back to voucher form
      self.goBackToVoucherForm();
    });
    
    // Product search
    $(document).on('input', '#product-search', function() {
      self.searchQuery = $(this).val();
      self.updateProductsTable();
    });
    
    // Select/Deselect all checkbox
    $(document).on('change', '#select-all-checkbox', function() {
      var isChecked = $(this).prop('checked');
      var filteredProducts = self.getFilteredProducts();
      
      if (isChecked) {
        var conflicts = [];
        filteredProducts.forEach(function(product) {
          if (self.selectedProductIds.indexOf(product.id) === -1) {
            var conflict = self.checkProductConflict(product.id);
            if (conflict) {
              conflicts.push(conflict.message);
            } else {
              self.selectedProductIds.push(product.id);
            }
          }
        });
        if (conflicts.length > 0) {
          Helpers.showAlert('Some products could not be selected:\n\n' + conflicts.slice(0, 3).join('\n') + (conflicts.length > 3 ? '\n... and ' + (conflicts.length - 3) + ' more' : ''), 'warning');
        }
      } else {
        filteredProducts.forEach(function(product) {
          var index = self.selectedProductIds.indexOf(product.id);
          if (index > -1) {
            self.selectedProductIds.splice(index, 1);
          }
        });
      }
      
      self.updateProductsTable();
      self.renderSelectedProductsSection();
    });
    
    // Select/Deselect all buttons
    $(document).on('click', '#select-all-products', function() {
      var filteredProducts = self.getFilteredProducts();
      var conflicts = [];
      filteredProducts.forEach(function(product) {
        if (self.selectedProductIds.indexOf(product.id) === -1) {
          var conflict = self.checkProductConflict(product.id);
          if (conflict) {
            conflicts.push(conflict.message);
          } else {
            self.selectedProductIds.push(product.id);
          }
        }
      });
      if (conflicts.length > 0) {
        Helpers.showAlert('Some products could not be selected:\n\n' + conflicts.slice(0, 3).join('\n') + (conflicts.length > 3 ? '\n... and ' + (conflicts.length - 3) + ' more' : ''), 'warning');
      }
      self.updateProductsTable();
      self.renderSelectedProductsSection();
    });
    
    $(document).on('click', '#deselect-all-products', function() {
      var filteredProducts = self.getFilteredProducts();
      filteredProducts.forEach(function(product) {
        var index = self.selectedProductIds.indexOf(product.id);
        if (index > -1) {
          self.selectedProductIds.splice(index, 1);
        }
      });
      self.updateProductsTable();
      self.renderSelectedProductsSection();
    });
    
    // Toggle product selection (click anywhere on row or checkbox)
    $(document).on('click', '.product-row, .product-checkbox', function(e) {
      if ($(e.target).is('input[type="checkbox"]')) {
        e.stopPropagation();
      }
      
      var $row = $(this).closest('.product-row');
      if ($row.hasClass('disabled-product')) {
        // Don't allow selection of disabled products
        return;
      }
      
      var productId = $(this).data('product-id') || $row.data('product-id');
      var index = self.selectedProductIds.indexOf(productId);
      
      if (index > -1) {
        // Deselecting - always allow
        self.selectedProductIds.splice(index, 1);
      } else {
        // Selecting - check if product is already assigned to an active voucher
        var conflict = self.checkProductConflict(productId);
        if (conflict) {
          Helpers.showAlert(conflict.message, 'warning');
          return;
        }
        self.selectedProductIds.push(productId);
      }
      
      self.updateProductsTable();
      self.renderSelectedProductsSection();
    });
    
    // Remove selected product from the selected products section
    $(document).on('click', '.remove-selected-product', function() {
      var productId = $(this).data('product-id');
      var index = self.selectedProductIds.indexOf(productId);
      
      if (index > -1) {
        self.selectedProductIds.splice(index, 1);
        self.updateProductsTable();
        self.renderSelectedProductsSection();
      }
    });
  },
  
  updateProductsTable: function() {
    $('#products-table-container').html(this.renderProductsTable());
    $('#selected-count').text(this.selectedProductIds.length);
    this.renderSelectedProductsSection();
    
    // Update select all checkbox state
    var filteredProducts = this.getFilteredProducts();
    var allSelected = filteredProducts.length > 0 && filteredProducts.every(function(product) {
      return this.selectedProductIds.indexOf(product.id) !== -1;
    }.bind(this));
    $('#select-all-checkbox').prop('checked', allSelected);
  },
  
  goBackToVoucherForm: function() {
    var url = 'voucher-form.html?customerId=' + encodeURIComponent(this.customerId);
    if (this.voucherId) {
      url += '&voucherId=' + encodeURIComponent(this.voucherId);
    }
    window.location.href = url;
  },
  
  checkProductConflict: function(productId) {
    // Check if product is already assigned to an active voucher for this department
    // Exclude the current voucher if editing
    var activeVouchers = this.partner.vouchers.filter(function(v) {
      // Exclude current voucher if editing
      if (this.voucherId && v.id === this.voucherId) {
        return false;
      }
      // Check if voucher is assigned to this department
      var matchesDepartment = false;
      if (v.departmentId === this.departmentId) {
        if (this.locationId && v.locationId) {
          matchesDepartment = v.locationId === this.locationId;
        } else if (!this.locationId && !v.locationId) {
          matchesDepartment = true;
        }
      }
      // Check if voucher is active, assigned to this department, and has this product
      return v.isActive && matchesDepartment && v.productIds && v.productIds.indexOf(productId) !== -1;
    }.bind(this));
    
    if (activeVouchers.length > 0) {
      var voucher = activeVouchers[0];
      var product = AppState.products.find(function(p) { return p.id === productId; });
      var productName = product ? product.name : 'This product';
      
      return {
        hasConflict: true,
        message: productName + ' is already assigned to the active voucher "' + voucher.name + '". Each product can only be assigned to one active voucher per user group at a time.'
      };
    }
    
    return null;
  },
  
  updateActiveNav: function(view) {
    $('.nav-link').removeClass('active');
    if (view) {
      $('.nav-link[data-nav="' + view + '"]').addClass('active');
    }
  }
};


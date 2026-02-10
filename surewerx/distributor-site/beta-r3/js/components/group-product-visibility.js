// Group Product Visibility Component - Similar to Product Management
var GroupProductVisibilityComponent = {
  customerId: null,
  groupId: null,
  partner: null,
  group: null,
  selectedProductIds: [],
  searchTerm: '',
  
  init: function(customerId, groupId, locationId) {
    this.customerId = customerId;
    this.groupId = groupId;
    this.locationId = locationId || null;
    
    // Refresh partner data to get latest state
    this.partner = AppState.customers.find(function(p) { return p.id === customerId; });
    
    if (!this.partner) {
      Helpers.showAlert('Partner not found', 'danger');
      App.navigate('dashboard');
      return;
    }
    
    // Try new structure first (locations -> departments)
    this.group = null;
    if (this.locationId && this.partner.locations) {
      var location = this.partner.locations.find(function(l) { return l.id === this.locationId; }.bind(this));
      if (location && location.departments) {
        this.group = location.departments.find(function(d) { return d.id === groupId; });
      }
    }
    
    // Fallback to old groups structure
    if (!this.group && this.partner.groups) {
      this.group = this.partner.groups.find(function(g) { return g.id === groupId; });
    }
    
    if (!this.group) {
      Helpers.showAlert('Department not found', 'danger');
      App.navigate('customer-detail', { customerId: customerId, tab: 'departments' });
      return;
    }
    
    // Load current product selections from the group/department
    this.selectedProductIds = this.group.productIds ? this.group.productIds.slice() : [];
    this.searchTerm = '';
    
    this.render();
    this.attachEvents();
  },
  
  render: function() {
    var html = '<div>' +
      Templates.header() +
      '<div class="container">' +
      '<div class="row mb-4">' +
      '<div class="col-md-12">' +
      '<button class="btn btn-default mb-3" id="back-to-group-form">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to Departments' +
      '</button>' +
      '<h2>Product Visibility</h2>' +
      '<p class="text-muted">Select which products the department "' + Helpers.escapeHtml(this.group.name) + '" can access</p>' +
      '</div>' +
      '</div>' +
      
      '<div class="row mb-4">' +
      '<div class="col-md-8">' +
      '<div class="input-group">' +
      '<span class="input-group-addon"><span class="glyphicon glyphicon-search"></span></span>' +
      '<input type="text" class="form-control" id="product-search" placeholder="Search by product name, category, or SKU..." value="' + Helpers.escapeHtml(this.searchTerm) + '">' +
      '<span class="input-group-btn">' +
      '<button class="btn btn-primary" type="button" id="search-products-btn">' +
      '<span class="glyphicon glyphicon-search"></span> Search' +
      '</button>' +
      '</span>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-4">' +
      '<button class="btn btn-default" type="button" id="import-products-btn" style="margin-bottom: 10px; display: block; width: 100%;">' +
      '<span class="glyphicon glyphicon-upload"></span> Import Products' +
      '</button>' +
      '<button class="btn btn-default" type="button" id="show-assigned-btn" style="display: none; width: 100%;">' +
      '<span class="glyphicon glyphicon-list"></span> Show Assigned Products' +
      '</button>' +
      '</div>' +
      '</div>' +
      
      '<div id="products-table-container">' +
      this.renderProductsTable() +
      '</div>' +
      
      '</div>' +
      '</div>' +
      // Fixed footer actions (match voucher Select Qualified Products UX)
      '<div style="position: fixed; bottom: 0; left: 0; right: 0; background-color: #fff; padding: 15px; border-top: 2px solid #e0e0e0; box-shadow: 0 -2px 5px rgba(0,0,0,0.1); z-index: 1000;">' +
      '<div class="container">' +
      '<div class="row">' +
      '<div class="col-md-12 text-right">' +
      '<button type="button" class="btn btn-default" id="cancel-btn">Cancel</button> ' +
      '<button type="button" class="btn btn-primary" id="save-btn">Save Product Visibility</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      // Spacer so content above doesn't hide behind fixed footer
      '<div style="height: 70px;"></div>';
    
    $('#app-container').html(html);
    this.updateActiveNav('dashboard');
  },
  
  renderProductsTable: function() {
    var filteredProducts = this.getFilteredProducts();
    var hasSearchTerm = this.searchTerm && this.searchTerm.trim() !== '';
    var hasSelectedProducts = this.selectedProductIds.length > 0;
    
    if (filteredProducts.length === 0) {
      if (hasSearchTerm) {
        // Search returned no results - show button to view assigned products
        return '<div class="panel panel-default">' +
          '<div class="panel-body text-center text-muted" style="padding: 40px;">' +
          '<p>No products found matching your search.</p>' +
          (hasSelectedProducts ? '<p style="margin-top: 15px;"><button class="btn btn-default" id="show-assigned-from-empty">Show Assigned Products</button></p>' : '') +
          '</div>' +
          '</div>';
      } else {
        return '<div class="panel panel-default">' +
          '<div class="panel-body text-center text-muted" style="padding: 40px;">' +
          '<p>No products selected. Use the search box to find and add products.</p>' +
          '</div>' +
          '</div>';
      }
    }
    
    var html = '<div class="panel panel-default">' +
      '<table class="table table-hover">' +
      '<thead>' +
      '<tr>' +
      '<th style="width: 30px;">' +
      '<input type="checkbox" id="select-all-products">' +
      '</th>' +
      '<th>Product Name</th>' +
      '<th>SureWerx SKU</th>' +
      '<th>Category</th>' +
      '<th>Base Price</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody id="products-table-body">';
    
    filteredProducts.forEach(function(product) {
      var isSelected = this.selectedProductIds.indexOf(product.id) !== -1;
      html += '<tr class="selectable-row" data-product-id="' + product.id + '" style="cursor: pointer;">' +
        '<td>' +
        '<input type="checkbox" class="product-checkbox" data-product-id="' + product.id + '" ' + (isSelected ? 'checked' : '') + '>' +
        '</td>' +
        '<td>' + Helpers.escapeHtml(product.name) + '</td>' +
        '<td><code>' + Helpers.escapeHtml(product.surewerxSku) + '</code></td>' +
        '<td><span class="label label-default">' + Helpers.escapeHtml(product.category) + '</span></td>' +
        '<td>' + Helpers.formatCurrency(product.price) + '</td>' +
        '</tr>';
    }.bind(this));
    
    html += '</tbody></table></div>';
    
    return html;
  },
  
  getFilteredProducts: function() {
    var products = AppState.products;
    
    // If no search term, only show products that are already selected
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      return products.filter(function(product) {
        return this.selectedProductIds.indexOf(product.id) !== -1;
      }.bind(this));
    }
    
    // If search term exists, show all products matching the search
    var searchLower = this.searchTerm.toLowerCase();
    
    return products.filter(function(product) {
      return product.name.toLowerCase().indexOf(searchLower) > -1 ||
        product.category.toLowerCase().indexOf(searchLower) > -1 ||
        product.surewerxSku.toLowerCase().indexOf(searchLower) > -1 ||
        (product.customSku && product.customSku.toLowerCase().indexOf(searchLower) > -1);
    });
  },
  
  showImportModal: function() {
    var self = this;
    
    var modalHtml = '<div class="modal fade" id="import-products-modal" tabindex="-1">' +
      '<div class="modal-dialog">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Import Products</h4>' +
      '</div>' +
      '<div class="modal-body">' +
      '<p>Import products by uploading a CSV file with product SKUs. The CSV should have a header row and one column: <strong>SureWerx SKU</strong>.</p>' +
      '<div style="margin-bottom: 15px;">' +
      '<button type="button" class="btn btn-default btn-sm" id="download-import-template-btn">' +
      '<span class="glyphicon glyphicon-download"></span> Download Template' +
      '</button>' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="import-file">Select CSV File</label>' +
      '<input type="file" class="form-control" id="import-file" accept=".csv">' +
      '</div>' +
      '<div id="import-progress" style="display: none; margin-top: 15px;">' +
      '<div class="progress">' +
      '<div class="progress-bar progress-bar-striped active" role="progressbar" style="width: 100%">Processing...</div>' +
      '</div>' +
      '</div>' +
      '<div id="import-results" style="display: none; margin-top: 15px;"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="button" class="btn btn-primary" id="process-import-btn" disabled>Import Products</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#import-products-modal').modal('show');
    
    // File input change
    $(document).off('change', '#import-file').on('change', '#import-file', function() {
      var file = this.files[0];
      if (file) {
        $('#process-import-btn').prop('disabled', false);
      } else {
        $('#process-import-btn').prop('disabled', true);
      }
    });
    
    // Download template
    $(document).off('click', '#download-import-template-btn').on('click', '#download-import-template-btn', function() {
      self.downloadImportTemplate();
    });
    
    // Process import
    $(document).off('click', '#process-import-btn').on('click', '#process-import-btn', function() {
      var file = document.getElementById('import-file').files[0];
      if (!file) {
        Helpers.showAlert('Please select a file', 'warning');
        return;
      }
      
      var reader = new FileReader();
      reader.onload = function(e) {
        self.processImport(e.target.result);
      };
      reader.readAsText(file);
    });
    
    // Clean up on close
    $('#import-products-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  downloadImportTemplate: function() {
    var csv = 'SureWerx SKU\n';
    // Add a few example SKUs from existing products
    var exampleProducts = AppState.products.slice(0, 3);
    exampleProducts.forEach(function(p) {
      csv += p.surewerxSku + '\n';
    });
    
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'product_visibility_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    Helpers.showAlert('Template downloaded successfully', 'success');
  },
  
  processImport: function(csv) {
    var self = this;
    $('#import-progress').show();
    $('#import-results').hide();
    $('#process-import-btn').prop('disabled', true);
    
    var lines = csv.split('\n').filter(function(line) { return line.trim(); });
    if (lines.length < 2) {
      $('#import-progress').hide();
      Helpers.showAlert('CSV file must have at least a header row and one data row', 'error');
      $('#process-import-btn').prop('disabled', false);
      return;
    }
    
    // Skip header row
    var dataLines = lines.slice(1);
    var successCount = 0;
    var errorCount = 0;
    var errors = [];
    var addedProductIds = [];
    
    dataLines.forEach(function(line, index) {
      var values = line.split(',').map(function(s) { return s.trim().replace(/^"|"$/g, ''); });
      
      if (values.length < 1) {
        errorCount++;
        errors.push('Row ' + (index + 2) + ': Invalid format - must have SureWerx SKU');
        return;
      }
      
      var surewerxSku = values[0];
      
      if (!surewerxSku) {
        errorCount++;
        errors.push('Row ' + (index + 2) + ': Missing SureWerx SKU');
        return;
      }
      
      // Find product by SureWerx SKU
      var product = AppState.products.find(function(p) { 
        return p.surewerxSku && p.surewerxSku.toLowerCase() === surewerxSku.toLowerCase(); 
      });
      
      if (!product) {
        errorCount++;
        errors.push('Row ' + (index + 2) + ': Product with SureWerx SKU "' + surewerxSku + '" not found');
        return;
      }
      
      // Add product to selection if not already selected
      if (self.selectedProductIds.indexOf(product.id) === -1) {
        self.selectedProductIds.push(product.id);
        addedProductIds.push(product.id);
        successCount++;
      } else {
        // Product already selected, count as success but don't add again
        successCount++;
      }
    });
    
    $('#import-progress').hide();
    
    // Show results
    var resultsHtml = '<div class="alert alert-' + (errorCount === 0 ? 'success' : 'warning') + '">' +
      '<strong>Import Complete</strong><br>' +
      'Successfully processed: ' + successCount + ' product(s)<br>';
    
    if (addedProductIds.length > 0) {
      resultsHtml += 'New products added: ' + addedProductIds.length + '<br>';
    }
    
    if (errorCount > 0) {
      resultsHtml += 'Errors: ' + errorCount + '<br>';
    }
    
    resultsHtml += '</div>';
    
    if (errors.length > 0) {
      resultsHtml += '<div class="alert alert-danger" style="max-height: 200px; overflow-y: auto;">' +
        '<strong>Errors:</strong><ul style="margin-bottom: 0;">';
      errors.slice(0, 10).forEach(function(error) {
        resultsHtml += '<li>' + Helpers.escapeHtml(error) + '</li>';
      });
      if (errors.length > 10) {
        resultsHtml += '<li>... and ' + (errors.length - 10) + ' more error(s)</li>';
      }
      resultsHtml += '</ul></div>';
    }
    
    $('#import-results').html(resultsHtml).show();
    $('#process-import-btn').prop('disabled', false);
    
    // Update the products table
    this.updateProductsTable();
    this.updateSelectedInfo();
    
    if (errorCount === 0) {
      // Auto-close after 2 seconds if no errors
      setTimeout(function() {
        $('#import-products-modal').modal('hide');
      }, 2000);
    }
  },
  
  updateSelectedInfo: function() {
    // This method can be used to update any selected count display if needed
    // Currently the count is shown in the table header via select-all checkbox
  },
  
  attachEvents: function() {
    var self = this;
    
    // Back button
    $(document).on('click', '#back-to-group-form', function() {
      App.navigate('customer-detail', { customerId: self.customerId, tab: 'departments' });
    });
    
    // Cancel button
    $(document).on('click', '#cancel-btn', function() {
      App.navigate('customer-detail', { customerId: self.customerId, tab: 'departments' });
    });
    
    // Search button
    $(document).on('click', '#search-products-btn', function() {
      self.searchTerm = $('#product-search').val();
      self.updateProductsTable();
      self.updateShowAssignedButton();
    });
    
    // Allow Enter key to trigger search
    $(document).on('keypress', '#product-search', function(e) {
      if (e.which === 13) {
        e.preventDefault();
        $('#search-products-btn').click();
      }
    });
    
    // Show assigned products button (in header)
    $(document).on('click', '#show-assigned-btn', function(e) {
      e.preventDefault();
      e.stopPropagation();
      self.searchTerm = '';
      $('#product-search').val('');
      self.updateProductsTable();
      self.updateShowAssignedButton();
    });
    
    // Show assigned products button (in empty state message)
    $(document).on('click', '#show-assigned-from-empty', function(e) {
      e.preventDefault();
      e.stopPropagation();
      self.searchTerm = '';
      $('#product-search').val('');
      self.updateProductsTable();
      self.updateShowAssignedButton();
    });
    
    // Select all products
    $(document).on('change', '#select-all-products', function() {
      var filteredProducts = self.getFilteredProducts();
      var allSelected = filteredProducts.every(function(p) {
        return self.selectedProductIds.indexOf(p.id) !== -1;
      });
      
      if (allSelected) {
        // Deselect all filtered products
        filteredProducts.forEach(function(p) {
          var index = self.selectedProductIds.indexOf(p.id);
          if (index > -1) {
            self.selectedProductIds.splice(index, 1);
          }
        });
      } else {
        // Select all filtered products
        filteredProducts.forEach(function(p) {
          if (self.selectedProductIds.indexOf(p.id) === -1) {
            self.selectedProductIds.push(p.id);
          }
        });
      }
      
      self.updateProductsTable();
      self.updateSelectedInfo();
    });
    
    // Individual product checkbox - prevent row click from triggering twice
    $(document).on('change', '.product-checkbox', function(e) {
      e.stopPropagation();
      var productId = $(this).data('product-id');
      var isChecked = $(this).prop('checked');
      
      if (isChecked) {
        if (self.selectedProductIds.indexOf(productId) === -1) {
          self.selectedProductIds.push(productId);
        }
      } else {
        var index = self.selectedProductIds.indexOf(productId);
        if (index > -1) {
          self.selectedProductIds.splice(index, 1);
        }
      }
      
      self.updateSelectedInfo();
      self.updateSelectAllCheckbox();
    });
    
    // Click anywhere on row to toggle checkbox
    $(document).on('click', '.selectable-row', function(e) {
      // Don't trigger if clicking on the checkbox itself or action buttons
      if ($(e.target).is('input[type="checkbox"], button, a, .btn')) {
        return;
      }
      var productId = $(this).data('product-id');
      var $checkbox = $(this).find('.product-checkbox');
      $checkbox.prop('checked', !$checkbox.prop('checked')).trigger('change');
    });
    
    // Save button
    $(document).on('click', '#save-btn', function() {
      self.saveProductVisibility();
    });
    
    // Import products button
    $(document).on('click', '#import-products-btn', function() {
      self.showImportModal();
    });
  },
  
  updateProductsTable: function() {
    $('#products-table-container').html(this.renderProductsTable());
    this.updateSelectAllCheckbox();
    this.updateShowAssignedButton();
  },
  
  updateShowAssignedButton: function() {
    var hasSearchTerm = this.searchTerm && this.searchTerm.trim() !== '';
    var filteredProducts = this.getFilteredProducts();
    
    // Only show header button if there's a search term AND there are filtered results
    // If search returns no results, the button will appear in the empty state message instead
    if (hasSearchTerm && filteredProducts.length > 0) {
      $('#show-assigned-btn').show();
    } else {
      $('#show-assigned-btn').hide();
    }
  },
  
  updateSelectAllCheckbox: function() {
    var filteredProducts = this.getFilteredProducts();
    if (filteredProducts.length === 0) {
      $('#select-all-products').prop('checked', false);
      $('#select-all-products').prop('indeterminate', false);
      return;
    }
    
    var selectedCount = filteredProducts.filter(function(p) {
      return this.selectedProductIds.indexOf(p.id) !== -1;
    }.bind(this)).length;
    
    $('#select-all-products').prop('checked', selectedCount === filteredProducts.length);
    $('#select-all-products').prop('indeterminate', selectedCount > 0 && selectedCount < filteredProducts.length);
  },
  
  saveProductVisibility: function() {
    // Try new structure first (locations -> departments)
    if (this.locationId && this.partner.locations) {
      var location = this.partner.locations.find(function(l) { return l.id === this.locationId; }.bind(this));
      if (location && location.departments) {
        var updatedDepartments = location.departments.map(function(d) {
          if (d.id === this.groupId) {
            return Object.assign({}, d, { productIds: this.selectedProductIds });
          }
          return d;
        }.bind(this));
        
        var updatedLocations = this.partner.locations.map(function(l) {
          if (l.id === this.locationId) {
            return Object.assign({}, l, { departments: updatedDepartments });
          }
          return l;
        }.bind(this));
        
        AppState.updateCustomer(this.customerId, { locations: updatedLocations });
        Helpers.showAlert('Product visibility updated successfully', 'success');
        App.navigate('customer-detail', { customerId: this.customerId, tab: 'departments' });
        return;
      }
    }
    
    // Fallback to old groups structure
    if (this.partner.groups) {
      var updatedGroups = this.partner.groups.map(function(g) {
        if (g.id === this.groupId) {
          return Object.assign({}, g, { productIds: this.selectedProductIds });
        }
        return g;
      }.bind(this));
      
        AppState.updateCustomer(this.customerId, { groups: updatedGroups });
      Helpers.showAlert('Product visibility updated successfully', 'success');
      App.navigate('customer-detail', { customerId: this.customerId, tab: 'departments' });
    }
  },
  
  updateActiveNav: function(view) {
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="' + view + '"]').addClass('active');
  }
};


// Products Management Component

var ProductsComponent = {
  searchTerm: '',
  categoryFilter: 'all',
  editingProduct: null,
  displayCount: 20, // Initial number of products to display
  incrementCount: 20, // Number to load on each scroll
  hasSearched: false,
  
  init: function() {
    this.displayCount = 20; // Reset display count
    this.hasSearched = false; // Reset search state
    this.render();
    this.attachEvents();
    this.attachScrollListener();
  },
  
  render: function() {
    var html = '<div>' +
      Templates.header() +
      '<div class="container">' +
      '<div class="row mb-4">' +
      '<div class="col-md-12">' +
      '<button class="btn btn-default mb-3" id="back-to-dashboard">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to Dashboard' +
      '</button>' +
      '<h2>Product Management</h2>' +
      '<p class="text-muted">Associate your own unique SKU with each SureWerx SKU. Distributor SKUs will appear in reporting.</p>' +
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
      '<div class="col-md-2">' +
      '<button class="btn btn-primary" type="button" id="import-skus-btn" style="width: 100%;">' +
      '<span class="glyphicon glyphicon-upload"></span> Import SKUs' +
      '</button>' +
      '</div>' +
      '</div>' +
      
      this.renderProductsTable() +
      
      '</div>' +
      '</div>';
    
    $('#app-container').html(html);
    this.updateActiveNav('products');
  },
  
  attachEvents: function() {
    var self = this;
    
    // Back button
    $(document).on('click', '#back-to-dashboard', function() {
      App.navigate('dashboard');
    });
    
    // Search button
    $(document).on('click', '#search-products-btn', function() {
      self.performSearch();
    });
    
    // Allow Enter key to trigger search
    $(document).on('keypress', '#product-search', function(e) {
      if (e.which === 13) { // Enter key
        e.preventDefault();
        self.performSearch();
      }
    });
    
    // Edit SKU button
    $(document).on('click', '.edit-sku-btn', function(e) {
      e.stopPropagation(); // Prevent row click from triggering
      var productId = $(this).data('product-id');
      var product = AppState.products.find(function(p) { return p.id === productId; });
      if (product) {
        self.showEditSkuModal(product);
      }
    });
    
    // Click on product row to open edit SKU modal
    $(document).on('click', '.product-row[data-product-id]', function(e) {
      // Don't trigger if clicking on a button or link
      if ($(e.target).closest('button, .btn, a').length > 0) {
        return;
      }
      
      var $row = $(this);
      var productId = $row.data('product-id');
      var product = AppState.products.find(function(p) { return p.id === productId; });
      
      if (product) {
        self.showEditSkuModal(product);
      }
    });
    
    // Import SKUs button
    $(document).on('click', '#import-skus-btn', function() {
      self.showImportSkusModal();
    });
  },
  
  attachScrollListener: function() {
    var self = this;
    var isLoading = false;
    
    $(window).on('scroll', function() {
      if (isLoading) return;
      
      if ($(window).scrollTop() + $(window).height() >= $(document).height() - 100) {
        var filteredProducts = self.getFilteredProducts();
        if (self.displayCount < filteredProducts.length) {
          isLoading = true;
          self.displayCount += self.incrementCount;
          self.updateProductsTable();
          setTimeout(function() {
            isLoading = false;
          }, 200);
        }
      }
    });
  },
  
  updateActiveNav: function(view) {
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="' + view + '"]').addClass('active');
  },
  
  getCategories: function() {
    var categories = [];
    AppState.products.forEach(function(p) {
      if (categories.indexOf(p.category) === -1) {
        categories.push(p.category);
      }
    });
    return categories.sort();
  },
  
  performSearch: function() {
    this.searchTerm = $('#product-search').val() || '';
    this.displayCount = 20; // Reset display count on search
    this.hasSearched = true; // Mark that a search has been performed
    this.updateProductsTable();
  },
  
  getFilteredProducts: function() {
    var products = AppState.products;
    var searchLower = this.searchTerm ? this.searchTerm.toLowerCase().trim() : '';
    
    // If no search term, return empty array (user must search)
    if (!searchLower) {
      return [];
    }
    
    return products.filter(function(product) {
      var matchesSearch = 
        product.name.toLowerCase().indexOf(searchLower) > -1 ||
        product.category.toLowerCase().indexOf(searchLower) > -1 ||
        product.surewerxSku.toLowerCase().indexOf(searchLower) > -1 ||
        (product.customSku && product.customSku.toLowerCase().indexOf(searchLower) > -1);
      
      return matchesSearch;
    }.bind(this));
  },
  
  renderProductsTable: function() {
    // If no search has been performed, show initial message
    if (!this.hasSearched) {
      return '<div class="panel panel-default">' +
        '<div class="panel-heading">' +
        '<h3 class="panel-title">Products</h3>' +
        '</div>' +
        '<div class="panel-body text-center text-muted" style="padding: 40px;">' +
        '<p style="font-size: 16px; margin-bottom: 10px;">Search for products to assign distributor SKUs</p>' +
        '<p style="font-size: 14px;">Enter a product name, category, or SKU in the search box above and click Search to get started.</p>' +
        '</div>' +
        '</div>';
    }
    
    var filteredProducts = this.getFilteredProducts();
    var displayedProducts = filteredProducts.slice(0, this.displayCount);
    var hasMore = filteredProducts.length > this.displayCount;
    
    return '<div class="panel panel-default">' +
      '<table class="table table-hover">' +
      '<thead>' +
      '<tr>' +
      '<th>Product Name</th>' +
      '<th>SureWerx SKU</th>' +
      '<th>Distributor SKU</th>' +
      '<th>Category</th>' +
      '<th>Base Price</th>' +
      '<th class="text-right">Actions</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody id="products-table-body">' +
      (filteredProducts.length === 0 ?
        '<tr><td colspan="6" class="text-center text-muted">No products found matching your search.</td></tr>' :
        displayedProducts.map(function(product) {
          return '<tr class="product-row" data-product-id="' + product.id + '" style="cursor: pointer;">' +
            '<td>' + Helpers.escapeHtml(product.name) + '</td>' +
            '<td>' + Helpers.escapeHtml(product.surewerxSku) + '</td>' +
            '<td>' + (product.customSku ? 
              '<strong>' + Helpers.escapeHtml(product.customSku) + '</strong>' : 
              '<span class="text-muted">Not set</span>') + '</td>' +
            '<td><span class="label label-default">' + Helpers.escapeHtml(product.category) + '</span></td>' +
            '<td>' + Helpers.formatCurrency(product.price) + '</td>' +
            '<td class="text-right">' +
            '<button class="btn btn-sm btn-default edit-sku-btn" data-product-id="' + product.id + '">' +
            '<span class="glyphicon glyphicon-pencil"></span> ' + (product.customSku ? 'Edit' : 'Add') + ' SKU' +
            '</button>' +
            '</td>' +
            '</tr>';
        }).join('')) +
      (hasMore ? 
        '<tr id="loading-more-row">' +
        '<td colspan="6" class="text-center text-muted" style="padding: 20px;">' +
        '<span class="glyphicon glyphicon-refresh"></span> Scroll down to load more products...' +
        '</td>' +
        '</tr>' : '') +
      '</tbody>' +
      '</table>' +
      '</div>';
  },
  
  updateProductsTable: function() {
    // Replace the entire panel (works for both initial message and table)
    $('.panel-default').last().replaceWith(this.renderProductsTable());
  },
  
  showEditSkuModal: function(product) {
    this.editingProduct = product;
    
    var modalHtml = '<div class="modal fade" id="edit-sku-modal" tabindex="-1">' +
      '<div class="modal-dialog">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Distributor SKU Number</h4>' +
      '</div>' +
      '<form id="edit-sku-form">' +
      '<div class="modal-body">' +
      '<p class="text-muted">Add your own SKU number for <strong>' + Helpers.escapeHtml(product.name) + '</strong>. This will apply to all partners, user groups, and vouchers.</p>' +
      '<div class="well">' +
      '<div class="row">' +
      '<div class="col-xs-6 text-muted">SureWerx SKU:</div>' +
      '<div class="col-xs-6 text-right"><strong>' + Helpers.escapeHtml(product.surewerxSku) + '</strong></div>' +
      '</div>' +
      (product.customSku ?
        '<div class="row mt-2">' +
        '<div class="col-xs-6 text-muted">Current Distributor SKU:</div>' +
        '<div class="col-xs-6 text-right"><strong><span class="text-primary">' + Helpers.escapeHtml(product.customSku) + '</span></strong></div>' +
        '</div>' : '') +
      '</div>' +
      '<div class="form-group">' +
      '<label>Distributor SKU</label>' +
      '<input type="text" class="form-control" id="custom-sku-input" value="' + Helpers.escapeHtml(product.customSku || '') + '" placeholder="Enter your distributor SKU">' +
      '<small class="text-muted">Leave blank to remove distributor SKU</small>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Save SKU</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#edit-sku-modal').modal('show');
    
    var self = this;
    $(document).off('submit', '#edit-sku-form').on('submit', '#edit-sku-form', function(e) {
      e.preventDefault();
      
      var newSku = $('#custom-sku-input').val().trim();
      
      // Update the product
      var productIndex = AppState.products.findIndex(function(p) { return p.id === product.id; });
      if (productIndex > -1) {
        if (newSku) {
          AppState.products[productIndex].customSku = newSku;
        } else {
          delete AppState.products[productIndex].customSku;
        }
        AppState.saveToStorage();
      }
      
      $('#edit-sku-modal').modal('hide');
      self.updateProductsTable();
      Helpers.showAlert('Product SKU updated successfully', 'success');
    });
    
    $('#edit-sku-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  showImportSkusModal: function() {
    var self = this;
    
    var modalHtml = '<div class="modal fade" id="import-skus-modal" tabindex="-1">' +
      '<div class="modal-dialog modal-lg">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Import Distributor SKUs</h4>' +
      '</div>' +
      '<div class="modal-body">' +
      '<div class="alert alert-info">' +
      '<h5 style="margin-top: 0;"><span class="glyphicon glyphicon-info-sign"></span> CSV Format</h5>' +
      '<p>Your CSV file should have the following columns:</p>' +
      '<ul>' +
      '<li><strong>SureWerx SKU</strong> (required) - The SureWerx SKU to identify the product</li>' +
      '<li><strong>Distributor SKU</strong> (required) - The distributor SKU to assign to the product</li>' +
      '</ul>' +
      '<p class="mb-0"><strong>Note:</strong> If a product already has a distributor SKU, it will be updated. Leave Distributor SKU blank to remove an existing distributor SKU.</p>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Download Template</label>' +
      '<div>' +
      '<button type="button" class="btn btn-default" id="download-sku-template-btn">' +
      '<span class="glyphicon glyphicon-download"></span> Download CSV Template' +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="sku-file-input">Select CSV File</label>' +
      '<input type="file" class="form-control" id="sku-file-input" accept=".csv" style="padding: 5px;">' +
      '<small class="text-muted">Select a CSV file to import distributor SKUs</small>' +
      '</div>' +
      '<div id="sku-import-progress" style="display: none; margin-top: 15px;">' +
      '<div class="progress">' +
      '<div class="progress-bar progress-bar-striped active" role="progressbar" style="width: 100%;">' +
      'Processing file...' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div id="sku-import-results" style="display: none; margin-top: 15px;"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
      '<button type="button" class="btn btn-primary" id="process-sku-import-btn" disabled>Process Import</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#import-skus-modal').modal('show');
    
    var selectedFile = null;
    
    // Download template
    $(document).off('click', '#download-sku-template-btn').on('click', '#download-sku-template-btn', function() {
      var csvContent = 'SureWerx SKU,Distributor SKU\nSW-001,DIST-001\nSW-002,DIST-002';
      var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      var link = document.createElement('a');
      var url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'custom_sku_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Helpers.showAlert('Template downloaded successfully', 'success', '#download-sku-template-btn');
    });
    
    // File input change
    $(document).off('change', '#sku-file-input').on('change', '#sku-file-input', function() {
      var file = this.files[0];
      if (file) {
        selectedFile = file;
        $('#process-sku-import-btn').prop('disabled', false);
      } else {
        selectedFile = null;
        $('#process-sku-import-btn').prop('disabled', true);
      }
    });
    
    // Process import
    $(document).off('click', '#process-sku-import-btn').on('click', '#process-sku-import-btn', function() {
      if (!selectedFile) {
        Helpers.showAlert('Please select a CSV file', 'warning', '#sku-file-input');
        return;
      }
      
      self.processSkuImport(selectedFile);
    });
    
    $('#import-skus-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  processSkuImport: function(file) {
    var self = this;
    var reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        var text = e.target.result;
        var lines = text.split('\n').filter(function(line) { return line.trim(); });
        
        if (lines.length < 2) {
          Helpers.showAlert('CSV file is empty or invalid', 'danger', '#sku-file-input');
          return;
        }
        
        // Parse header row to find column indices
        var headerRow = lines[0].split(',').map(function(s) { return s.trim().replace(/^"|"$/g, ''); });
        var surewerxSkuIndex = headerRow.indexOf('SureWerx SKU');
        var customSkuIndex = headerRow.indexOf('Distributor SKU');
        
        if (surewerxSkuIndex === -1) {
          Helpers.showAlert('CSV file must have a "SureWerx SKU" column', 'danger', '#sku-file-input');
          return;
        }
        
        if (customSkuIndex === -1) {
          Helpers.showAlert('CSV file must have a "Distributor SKU" column', 'danger', '#sku-file-input');
          return;
        }
        
        // Skip header row
        var dataLines = lines.slice(1);
        var successCount = 0;
        var errorCount = 0;
        var errors = [];
        var updatedCount = 0;
        var removedCount = 0;
        
        $('#sku-import-progress').show();
        $('#sku-import-results').hide();
        $('#process-sku-import-btn').prop('disabled', true);
        
        dataLines.forEach(function(line, index) {
          var values = line.split(',').map(function(s) { return s.trim().replace(/^"|"$/g, ''); });
          
          if (values.length <= surewerxSkuIndex) {
            errorCount++;
            errors.push('Row ' + (index + 2) + ': Missing SureWerx SKU');
            return;
          }
          
          var surewerxSku = values[surewerxSkuIndex];
          var customSku = values.length > customSkuIndex ? values[customSkuIndex].trim() : '';
          
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
          
          // Update or remove distributor SKU
          var productIndex = AppState.products.findIndex(function(p) { return p.id === product.id; });
          if (productIndex > -1) {
            var hadCustomSku = !!AppState.products[productIndex].customSku;
            
            if (customSku) {
              AppState.products[productIndex].customSku = customSku;
              if (hadCustomSku) {
                updatedCount++;
              } else {
                successCount++;
              }
            } else {
              // Remove distributor SKU if blank
              if (hadCustomSku) {
                delete AppState.products[productIndex].customSku;
                removedCount++;
              } else {
                // No change needed
                successCount++;
              }
            }
          }
        });
        
        // Save to storage
        AppState.saveToStorage();
        
        $('#sku-import-progress').hide();
        
        // Show results
        var resultsHtml = '<div class="alert alert-' +
          (errorCount === 0 ? 'success' : 'warning') + '">' +
          '<h5 style="margin-top: 0;"><span class="glyphicon glyphicon-' +
          (errorCount === 0 ? 'ok' : 'warning-sign') + '"></span> Import Results</h5>' +
          '<p><strong>Total rows processed:</strong> ' + dataLines.length + '</p>' +
          '<ul style="margin-bottom: 0;">' +
          '<li><strong>Successfully added:</strong> ' + successCount + '</li>' +
          (updatedCount > 0 ? '<li><strong>Updated:</strong> ' + updatedCount + '</li>' : '') +
          (removedCount > 0 ? '<li><strong>Removed:</strong> ' + removedCount + '</li>' : '') +
          (errorCount > 0 ? '<li><strong>Errors:</strong> ' + errorCount + '</li>' : '') +
          '</ul>' +
          '</div>';
        
        if (errors.length > 0) {
          resultsHtml += '<div class="alert alert-danger" style="max-height: 200px; overflow-y: auto;">' +
            '<h5 style="margin-top: 0;">Errors:</h5>' +
            '<ul style="margin-bottom: 0;">' +
            errors.map(function(error) {
              return '<li>' + Helpers.escapeHtml(error) + '</li>';
            }).join('') +
            '</ul>' +
            '</div>';
        }
        
        $('#sku-import-results').html(resultsHtml).show();
        $('#process-sku-import-btn').prop('disabled', false);
        
        // Refresh the products table
        self.updateProductsTable();
        
        if (errorCount === 0) {
          Helpers.showAlert('Distributor SKUs imported successfully', 'success');
        }
      } catch (error) {
        $('#sku-import-progress').hide();
        $('#process-sku-import-btn').prop('disabled', false);
        Helpers.showAlert('Error processing file: ' + error.message, 'danger', '#sku-file-input');
      }
    };
    
    reader.onerror = function() {
      $('#sku-import-progress').hide();
      $('#process-sku-import-btn').prop('disabled', false);
      Helpers.showAlert('Error reading file', 'danger', '#sku-file-input');
    };
    
    reader.readAsText(file);
  }
};

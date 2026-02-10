// User Group Form Component - Full Page
var UserGroupFormComponent = {
  customerId: null,
  groupId: null,
  partner: null,
  group: null,
  selectedProductIds: [],
  
  init: function(customerId, groupId) {
    this.customerId = customerId;
    this.groupId = groupId || null;
    
    // Refresh partner data to get latest state
    this.partner = AppState.customers.find(function(p) { return p.id === customerId; });
    
    if (!this.partner) {
      Helpers.showAlert('Partner not found', 'danger');
      App.navigate('dashboard');
      return;
    }
    
    // Refresh group data to get latest product selections
    this.group = groupId ? this.partner.groups.find(function(g) { return g.id === groupId; }) : null;
    this.selectedProductIds = this.group ? (this.group.productIds ? this.group.productIds.slice() : []) : [];
    
    this.render();
    this.attachEvents();
    this.updateSelectedDisplay();
  },
  
  render: function() {
    var self = this;
    var isEdit = !!this.group;
    
    var html = Templates.header() +
      '<div class="container">' +
      
      // Back button
      '<button class="btn btn-default" id="back-to-partner" style="margin-bottom: 20px;">' +
      '<span class="glyphicon glyphicon-chevron-left"></span> Back to User Groups' +
      '</button>' +
      
      // Page Title
      '<div style="margin-bottom: 30px;">' +
      '<h2>' + (isEdit ? 'Edit User Group' : 'Create User Group') + '</h2>' +
      '<p class="text-muted">' + 
      (isEdit ? 'Update group information and product visibility' : 'Create a new user group and assign product visibility') +
      '</p>' +
      '</div>' +
      
      // Form Card
      '<div class="panel panel-default">' +
      '<div class="panel-body" style="padding: 30px;">' +
      '<form id="user-group-form">' +
      
      // Basic Information Section
      '<div style="margin-bottom: 30px;">' +
      '<h4 style="margin-bottom: 20px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">Basic Information</h4>' +
      
      '<div class="form-group">' +
      '<label for="group-name">Group Name <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="group-name" ' +
      'placeholder="e.g., Engineering Team, Sales Department" ' +
      'value="' + (this.group ? Helpers.escapeHtml(this.group.name) : '') + '" required>' +
      '</div>' +
      
      '<div class="form-group">' +
      '<label for="group-location-id">Location ID <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="group-location-id" ' +
      'placeholder="e.g., LOC-001, WH-A, NY-001" ' +
      'value="' + (this.group ? Helpers.escapeHtml(this.group.locationId || '') : '') + '" required>' +
      '</div>' +
      
      '<div class="form-group">' +
      '<label for="group-location">Location Name <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="group-location" ' +
      'placeholder="e.g., New York Office, Warehouse A, Remote" ' +
      'value="' + (this.group ? Helpers.escapeHtml(this.group.location || '') : '') + '" required>' +
      '</div>' +
      
      '<div class="form-group">' +
      '<label for="group-department">Department <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="group-department" ' +
      'placeholder="e.g., Engineering, Sales, Operations" ' +
      'value="' + (this.group ? Helpers.escapeHtml(this.group.department || '') : '') + '" required>' +
      '</div>' +
      
      '<div class="form-group">' +
      '<label for="group-address-line1">Address Line 1 <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="group-address-line1" ' +
      'placeholder="e.g., 123 Main St" ' +
      'value="' + (this.group ? Helpers.escapeHtml(this.group.addressLine1 || '') : '') + '" required>' +
      '</div>' +
      
      '<div class="row">' +
      '<div class="col-md-6">' +
      '<div class="form-group">' +
      '<label for="group-address-city">City <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="group-address-city" ' +
      'placeholder="e.g., New York" ' +
      'value="' + (this.group ? Helpers.escapeHtml(this.group.addressCity || '') : '') + '" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3">' +
      '<div class="form-group">' +
      '<label for="group-address-state">State <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="group-address-state" ' +
      'placeholder="e.g., NY" ' +
      'value="' + (this.group ? Helpers.escapeHtml(this.group.addressState || '') : '') + '" required>' +
      '</div>' +
      '</div>' +
      '<div class="col-md-3">' +
      '<div class="form-group">' +
      '<label for="group-address-zip">Zip <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="group-address-zip" ' +
      'placeholder="e.g., 10001" ' +
      'value="' + (this.group ? Helpers.escapeHtml(this.group.addressZip || '') : '') + '" required>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      
      // Product Visibility Section
      '<div style="margin-bottom: 30px; padding-top: 30px; border-top: 1px solid #e0e0e0;">' +
      '<div style="margin-bottom: 15px;">' +
      '<h4 style="margin: 0 0 5px 0;">Product Visibility</h4>' +
      '<p class="text-muted" style="margin: 0; font-size: 13px;">Select which products this user group can access</p>' +
      '</div>' +
      
      (isEdit ? 
        // For existing groups, show count and button to manage
        '<div id="selected-products-display" style="margin-bottom: 15px; padding: 15px; background-color: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px;' + (this.selectedProductIds.length === 0 ? ' display: none;' : '') + '">' +
        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
        '<div>' +
        '<strong><span id="selected-count">' + this.selectedProductIds.length + '</span> product(s) selected</strong>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-primary" id="manage-product-visibility-btn">' +
        '<span class="glyphicon glyphicon-cog"></span> Manage Product Visibility' +
        '</button>' :
        // For new groups, show message
        '<div class="alert alert-info">' +
        '<p style="margin: 0;">Save the user group first, then you can manage product visibility.</p>' +
        '</div>') +
      '</div>' +
      
      // Form Actions
      '<div style="display: flex; gap: 10px; padding-top: 20px;">' +
      '<button type="button" class="btn btn-default" id="cancel-group-form">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Save Changes' : 'Create Group') + '</button>' +
      '</div>' +
      
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('#app-container').html(html);
  },
  
  attachEvents: function() {
    var self = this;
    
    // Back button
    $('#back-to-partner').on('click', function() {
      App.navigate('customer-detail', { customerId: self.customerId, tab: 'groups' });
    });
    
    // Cancel button
    $('#cancel-group-form').on('click', function() {
      App.navigate('customer-detail', { customerId: self.customerId, tab: 'groups' });
    });
    
    // Form submission
    $('#user-group-form').on('submit', function(e) {
      e.preventDefault();
      self.handleSubmit();
    });
    
    // Manage product visibility button
    $('#manage-product-visibility-btn').on('click', function() {
      App.navigate('group-product-visibility', { customerId: self.customerId, groupId: self.groupId });
    });
  },
  
  updateSelectedDisplay: function() {
    if (this.selectedProductIds.length === 0) {
      $('#selected-products-display').hide();
    } else {
      $('#selected-products-display').show();
      $('#selected-count').text(this.selectedProductIds.length);
    }
  },
  
  handleSubmit: function() {
    var self = this;
    
    var name = $('#group-name').val().trim();
    if (!name) {
      Helpers.showAlert('Group name is required', 'warning');
      return;
    }
    
    var department = $('#group-department').val().trim();
    if (!department) {
      Helpers.showAlert('Department is required', 'warning');
      return;
    }
    
    var location = $('#group-location').val().trim();
    if (!location) {
      Helpers.showAlert('Location Name is required', 'warning');
      return;
    }
    
    var locationId = $('#group-location-id').val().trim();
    if (!locationId) {
      Helpers.showAlert('Location ID is required', 'warning');
      return;
    }
    
    var addressLine1 = $('#group-address-line1').val().trim();
    if (!addressLine1) {
      Helpers.showAlert('Address Line 1 is required', 'warning');
      return;
    }
    
    var addressCity = $('#group-address-city').val().trim();
    if (!addressCity) {
      Helpers.showAlert('City is required', 'warning');
      return;
    }
    
    var addressState = $('#group-address-state').val().trim();
    if (!addressState) {
      Helpers.showAlert('State is required', 'warning');
      return;
    }
    
    var addressZip = $('#group-address-zip').val().trim();
    if (!addressZip) {
      Helpers.showAlert('Zip is required', 'warning');
      return;
    }
    
    // Get current productIds from the group (they may have been updated on the product visibility page)
    var currentGroup = this.partner.groups.find(function(g) { return g.id === self.groupId; });
    var productIds = currentGroup ? (currentGroup.productIds || []) : this.selectedProductIds;
    
    var groupData = {
      name: name,
      department: department,
      location: location,
      locationId: locationId,
      addressLine1: addressLine1,
      addressCity: addressCity,
      addressState: addressState,
      addressZip: addressZip,
      // Keep locationAddress for backward compatibility (combine the address fields)
      locationAddress: addressLine1 + ', ' + addressCity + ', ' + addressState + ' ' + addressZip,
      productIds: productIds
    };
    
    if (this.group) {
      // Edit existing group
      var updatedGroups = this.partner.groups.map(function(g) {
        if (g.id === self.group.id) {
          return Object.assign({}, g, groupData);
        }
        return g;
      });
      
      AppState.updateCustomer(this.customerId, { groups: updatedGroups });
      Helpers.showAlert('Group updated successfully', 'success');
    } else {
      // Create new group
      var newGroup = Object.assign({}, groupData, {
        id: Helpers.generateId(),
        employeeCount: 0
      });
      
      var updatedGroups = this.partner.groups.concat([newGroup]);
      AppState.updateCustomer(this.customerId, { groups: updatedGroups });
      Helpers.showAlert('Group created successfully', 'success');
      
      // Redirect to edit mode so user can manage product visibility
      App.navigate('partner-group-form', { customerId: this.customerId, groupId: newGroup.id });
      return;
    }
    
    App.navigate('customer-detail', { customerId: this.customerId, tab: 'groups' });
  }
};
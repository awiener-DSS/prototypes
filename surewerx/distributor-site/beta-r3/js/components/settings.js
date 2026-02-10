// Distributor Settings Component

var SettingsComponent = {
  formData: {
    distributorName: '',
    distributorLogo: null
  },
  editingBranchId: null, // ID of branch being edited, null if adding new
  
  init: function() {
    // Load current distributor settings from AppState
    this.formData.distributorName = AppState.distributorName || 'My Distributor';
    this.formData.distributorLogo = AppState.distributorLogo || null;
    this.editingBranchId = null;
    
    this.render();
    this.attachEvents();
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
      '<h2>Distributor Settings</h2>' +
      '<p class="text-muted">Manage your distributor settings and users</p>' +
      '</div>' +
      '</div>' +
      
      '<div class="panel panel-default">' +
      '<div class="panel-body">' +
      '<form id="settings-form">' +
      '<div class="form-group">' +
      '<label for="distributor-name">Distributor Name</label>' +
      '<input type="text" class="form-control" id="distributor-name" value="' + Helpers.escapeHtml(this.formData.distributorName) + '" placeholder="Enter distributor name">' +
      '</div>' +
      
      '<div class="form-group">' +
      '<label>Logo</label>' +
      '<div class="mb-3">' +
      (this.formData.distributorLogo ?
        '<div style="position: relative; display: inline-block;">' +
        '<img src="' + this.formData.distributorLogo + '" alt="Distributor logo" style="max-height: 80px; max-width: 200px; border: 1px solid #ddd; border-radius: 4px; padding: 4px;' + (this.formData.distributorLogo === 'images/Fastenal_logo.png' ? ' background-color: #000;' : '') + '">' +
        '<button type="button" class="btn btn-danger btn-xs" id="remove-logo-btn" style="position: absolute; top: -5px; right: -5px; border-radius: 50%;">' +
        '<span class="glyphicon glyphicon-remove"></span>' +
        '</button>' +
        '</div>' :
        '<div style="display: inline-block; width: 100%; max-width: 400px; height: 120px; border: 2px dashed #ddd; border-radius: 4px; background-color: #f9f9f9; display: flex; align-items: center; justify-content: center;">' +
        '<div class="text-center text-muted">' +
        '<span class="glyphicon glyphicon-picture" style="font-size: 32px; display: block; margin-bottom: 10px;"></span>' +
        '<p>No logo uploaded</p>' +
        '</div>' +
        '</div>') +
      '</div>' +
      '<div>' +
      '<input type="file" id="logo-upload-input" accept="image/*" style="display: none;">' +
      '<button type="button" class="btn btn-default" id="upload-logo-btn">' +
      '<span class="glyphicon glyphicon-upload"></span> ' + (this.formData.distributorLogo ? 'Change Logo' : 'Upload Logo') +
      '</button>' +
      '<p class="help-block">Recommended: PNG or JPG, max 5MB</p>' +
      '</div>' +
      '</div>' +
      
      '<div class="form-group text-right">' +
      '<button type="button" class="btn btn-default" id="cancel-settings-btn">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Save Changes</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      
      // Branch Locations Section
      '<div class="panel panel-default" style="margin-top: 20px;">' +
      '<div class="panel-heading">' +
      '<h3 class="panel-title">Branch Locations</h3>' +
      '</div>' +
      '<div class="panel-body">' +
      '<div class="clearfix" style="margin-bottom: 15px;">' +
      '<p class="text-muted pull-left" style="margin: 0; padding-top: 7px;">Manage branch locations for your distributor</p>' +
      '<button type="button" class="btn btn-primary pull-right" id="add-branch-location-btn">' +
      '<span class="glyphicon glyphicon-plus"></span> Add Branch Location' +
      '</button>' +
      '</div>' +
      this.renderBranchLocationsList() +
      '</div>' +
      '</div>' +
      
      '</div>' +
      '</div>';
    
    $('#app-container').html(html);
    this.updateActiveNav('settings');
  },
  
  attachEvents: function() {
    var self = this;
    
    // Back/Cancel buttons
    $(document).on('click', '#back-to-dashboard, #cancel-settings-btn', function() {
      App.navigate('dashboard');
    });
    
    // Distributor name input
    $(document).on('input', '#distributor-name', function() {
      self.formData.distributorName = $(this).val();
    });
    
    // Upload logo button
    $(document).on('click', '#upload-logo-btn', function() {
      $('#logo-upload-input').click();
    });
    
    // Handle logo upload
    $(document).on('change', '#logo-upload-input', function(e) {
      self.handleLogoUpload(e);
    });
    
    // Remove logo button
    $(document).on('click', '#remove-logo-btn', function() {
      // Remove the logo (set to null)
      self.formData.distributorLogo = null;
      self.render();
    });
    
    // Save form
    $(document).on('submit', '#settings-form', function(e) {
      e.preventDefault();
      self.handleSave();
    });
    
    // Add branch location button
    $(document).on('click', '#add-branch-location-btn', function() {
      self.editingBranchId = null;
      self.showBranchLocationModal(null);
    });
    
    // Edit branch location
    $(document).on('click', '.edit-branch-btn', function() {
      var branchId = $(this).data('branch-id');
      self.editingBranchId = branchId;
      self.showBranchLocationModal(branchId);
    });
    
    // Delete branch location
    $(document).on('click', '.delete-branch-btn', function() {
      var branchId = $(this).data('branch-id');
      self.handleDeleteBranchLocation(branchId);
    });
  },
  
  updateActiveNav: function(view) {
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="' + view + '"]').addClass('active');
  },
  
  handleLogoUpload: function(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      Helpers.showAlert('Logo file size must be less than 5MB', 'danger');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      Helpers.showAlert('Please upload an image file', 'danger');
      return;
    }
    
    var reader = new FileReader();
    var self = this;
    reader.onload = function(event) {
      self.formData.distributorLogo = event.target.result;
      self.render();
    };
    reader.readAsDataURL(file);
  },
  
  handleSave: function() {
    // Save to AppState
    AppState.distributorName = this.formData.distributorName;
    AppState.distributorLogo = this.formData.distributorLogo;
    AppState.saveToStorage();
    
    Helpers.showAlert('Distributor settings updated successfully', 'success');
    App.navigate('dashboard');
  },
  
  renderBranchLocationsList: function() {
    var branches = AppState.branchLocations || [];
    if (branches.length === 0) {
      return '<p class="text-muted">No branch locations added yet.</p>';
    }
    
    var html = '<table class="table table-striped">' +
      '<thead>' +
      '<tr>' +
      '<th>Branch ID</th>' +
      '<th>Branch Address</th>' +
      '<th style="width: 120px;">Actions</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>';
    
    var self = this;
    branches.forEach(function(branch) {
      html += '<tr>' +
        '<td>' + Helpers.escapeHtml(branch.branchId) + '</td>' +
        '<td>' + Helpers.escapeHtml(branch.branchAddress) + '</td>' +
        '<td>' +
        '<button type="button" class="btn btn-xs btn-default edit-branch-btn" data-branch-id="' + branch.id + '" title="Edit">' +
        '<span class="glyphicon glyphicon-pencil"></span>' +
        '</button> ' +
        '<button type="button" class="btn btn-xs btn-danger delete-branch-btn" data-branch-id="' + branch.id + '" title="Delete">' +
        '<span class="glyphicon glyphicon-trash"></span>' +
        '</button>' +
        '</td>' +
        '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
  },
  
  showBranchLocationModal: function(branchId) {
    var self = this;
    var branch = null;
    var isEdit = !!branchId;
    
    if (isEdit) {
      branch = AppState.branchLocations.find(function(b) { return b.id === branchId; });
      if (!branch) {
        Helpers.showAlert('Branch location not found', 'danger');
        return;
      }
    }
    
    // Remove existing modal if present
    $('#branch-location-modal').remove();
    
    var modalHtml = '<div class="modal fade" id="branch-location-modal" tabindex="-1" role="dialog">' +
      '<div class="modal-dialog" role="document">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span>' +
      '</button>' +
      '<h4 class="modal-title">' + (isEdit ? 'Edit Branch Location' : 'Add Branch Location') + '</h4>' +
      '</div>' +
      '<form id="branch-location-form">' +
      '<div class="modal-body">' +
      '<div class="form-group">' +
      '<label for="modal-branch-id">Branch ID</label>' +
      '<input type="text" class="form-control" id="modal-branch-id" value="' + (branch ? Helpers.escapeHtml(branch.branchId) : '') + '" placeholder="Enter branch ID" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="modal-branch-address">Branch Address</label>' +
      '<textarea class="form-control" id="modal-branch-address" rows="3" placeholder="Enter branch address" required>' + (branch ? Helpers.escapeHtml(branch.branchAddress) : '') + '</textarea>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Update Branch Location' : 'Add Branch Location') + '</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    
    // Handle form submit
    $(document).off('submit', '#branch-location-form').on('submit', '#branch-location-form', function(e) {
      e.preventDefault();
      var branchIdValue = $('#modal-branch-id').val();
      var branchAddressValue = $('#modal-branch-address').val();
      
      if (isEdit) {
        self.handleUpdateBranchLocation(branchId, branchIdValue, branchAddressValue);
      } else {
        self.handleAddBranchLocation(branchIdValue, branchAddressValue);
      }
      
      $('#branch-location-modal').modal('hide');
    });
    
    // Cleanup on hide
    $('#branch-location-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
    
    // Show modal
    $('#branch-location-modal').modal('show');
  },
  
  handleAddBranchLocation: function(branchId, branchAddress) {
    if (!branchId || !branchAddress) {
      Helpers.showAlert('Please fill in both Branch ID and Branch Address', 'warning');
      return;
    }
    
    var newBranch = {
      id: Helpers.generateId(),
      branchId: branchId.trim(),
      branchAddress: branchAddress.trim()
    };
    
    AppState.branchLocations = AppState.branchLocations || [];
    AppState.branchLocations.push(newBranch);
    AppState.saveToStorage();
    
    Helpers.showAlert('Branch location added successfully', 'success');
    this.editingBranchId = null;
    this.render();
    // Modal will be closed by the submit handler
  },
  
  handleUpdateBranchLocation: function(branchId, branchIdValue, branchAddress) {
    if (!branchIdValue || !branchAddress) {
      Helpers.showAlert('Please fill in both Branch ID and Branch Address', 'warning');
      return;
    }
    
    var branch = AppState.branchLocations.find(function(b) { return b.id === branchId; });
    if (branch) {
      branch.branchId = branchIdValue.trim();
      branch.branchAddress = branchAddress.trim();
      AppState.saveToStorage();
      Helpers.showAlert('Branch location updated successfully', 'success');
    }
    
    this.editingBranchId = null;
    this.render();
  },
  
  handleDeleteBranchLocation: function(branchId) {
    if (!confirm('Are you sure you want to delete this branch location?')) {
      return;
    }
    
    AppState.branchLocations = AppState.branchLocations.filter(function(b) { return b.id !== branchId; });
    AppState.saveToStorage();
    Helpers.showAlert('Branch location deleted successfully', 'success');
    this.editingBranchId = null;
    this.render();
  }
};

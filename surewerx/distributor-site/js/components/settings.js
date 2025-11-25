// Distributor Settings Component

var SettingsComponent = {
  formData: {
    distributorName: '',
    distributorLogo: null
  },
  
  init: function() {
    // Load current distributor settings from AppState
    this.formData.distributorName = AppState.distributorName || 'My Distributor';
    this.formData.distributorLogo = AppState.distributorLogo || null;
    
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
  }
};

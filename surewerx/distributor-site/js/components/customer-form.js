// Customer Form Component (Multi-step wizard)

var CustomerFormComponent = {
  currentStep: 1,
  totalSteps: 5,
  isEditMode: false,
  editingCustomerId: null,
  defaultTermsAndConditions: 'Net 30 payment terms. Payment is due within 30 days of invoice date. Late payments may be subject to a 1.5% monthly interest charge. All sales are final unless otherwise specified in writing.',
  formData: {
    name: '',
    slug: '',
    status: 'active',
    logo: null,
    employeeFieldConfig: {
      requireEmployeeId: true,
      requireUsername: false,
      requireDateOfBirth: true,
      requireStartDate: false
    },
    paymentMethods: [],
    termsAndConditions: ''
  },
  
  init: function(customer) {
    this.currentStep = 1;
    this.isEditMode = !!customer;
    this.editingCustomerId = customer ? customer.id : null;
    
    if (customer) {
      // Payment methods always default to Credit Card only
      var paymentMethods = ['Credit Card'];
      
      this.formData = {
        name: customer.name,
        slug: customer.slug,
        status: customer.status,
        logo: customer.logoUrl || null,
        employeeFieldConfig: customer.employeeFieldConfig,
        paymentMethods: paymentMethods,
        termsAndConditions: customer.termsAndConditions || ''
      };
    } else {
      this.resetFormData();
    }
    
    this.render();
    this.attachEvents();
  },
  
  resetFormData: function() {
    this.formData = {
      name: '',
      slug: '',
      status: 'active',
      logo: null,
      employeeFieldConfig: {
        requireEmployeeId: true,
        requireUsername: false,
        requireDateOfBirth: true,
        requireStartDate: false
      },
      paymentMethods: ['Credit Card'], // Default to Credit Card for new customers
      termsAndConditions: ''
    };
  },
  
  render: function() {
    $('#app-container').html(Templates.customerFormWizard(this.currentStep, this.formData, this.isEditMode));
    // Always update slug preview after rendering step 1
    if (this.currentStep === 1) {
      this.updateSlugPreview();
    }
  },
  
  attachEvents: function() {
    var self = this;
    
    // Remove all existing event handlers first to prevent duplicates
    $(document).off('click', '#cancel-customer-form');
    $(document).off('click', '#next-step-btn');
    $(document).off('click', '#back-step-btn');
    $(document).off('input change', '#customer-name');
    $(document).off('change', '#customer-status');
    $(document).off('change', '#customer-logo-upload');
    $(document).off('click', '#remove-logo-btn');
    $(document).off('click', '#upload-logo-area');
    $(document).off('change', '#require-employee-id');
    $(document).off('change', '#require-username');
    $(document).off('change', '#require-dob');
    $(document).off('change', '#require-start-date');
    $(document).off('input', '#terms-and-conditions');
    $(document).off('click', '#use-default-terms-btn');
    $(document).off('click', '#save-customer-btn');
    
    // Cancel button
    $(document).on('click', '#cancel-customer-form', function(e) {
      e.preventDefault();
      App.navigate('dashboard');
    });
    
    // Next button
    $(document).on('click', '#next-step-btn', function() {
      if (self.validateStep(self.currentStep)) {
        self.currentStep++;
        self.render();
      }
    });
    
    // Back button
    $(document).on('click', '#back-step-btn', function() {
      self.currentStep--;
      self.render();
    });
    
    // Form field changes
    $(document).on('input change', '#customer-name', function() {
      self.formData.name = $(this).val();
      if (!self.isEditMode) {
        self.formData.slug = self.generateSlug($(this).val());
        self.updateSlugPreview();
      }
    });
    
    $(document).on('change', '#customer-status', function() {
      self.formData.status = $(this).val();
    });
    
    // Logo upload
    $(document).on('change', '#customer-logo-upload', function(e) {
      self.handleLogoUpload(e);
    });
    
    $(document).on('click', '#remove-logo-btn', function() {
      self.formData.logo = null;
      self.render();
    });
    
    $(document).on('click', '#upload-logo-area', function() {
      $('#customer-logo-upload').click();
    });
    
    // Employee field config checkboxes - only allow changes if not in edit mode
    $(document).on('change', '#require-employee-id', function() {
      if (self.isEditMode) {
        // Prevent changes in edit mode - restore original value
        $(this).prop('checked', self.formData.employeeFieldConfig.requireEmployeeId);
        $('#require-username').prop('checked', self.formData.employeeFieldConfig.requireUsername);
        return;
      }
      if ($(this).prop('checked')) {
        self.formData.employeeFieldConfig.requireEmployeeId = true;
        self.formData.employeeFieldConfig.requireUsername = false;
      }
    });
    
    $(document).on('change', '#require-username', function() {
      if (self.isEditMode) {
        // Prevent changes in edit mode - restore original value
        $(this).prop('checked', self.formData.employeeFieldConfig.requireUsername);
        $('#require-employee-id').prop('checked', self.formData.employeeFieldConfig.requireEmployeeId);
        return;
      }
      if ($(this).prop('checked')) {
        self.formData.employeeFieldConfig.requireEmployeeId = false;
        self.formData.employeeFieldConfig.requireUsername = true;
      }
    });
    
    $(document).on('change', '#require-dob', function() {
      if (self.isEditMode) {
        // Prevent changes in edit mode - restore original value
        $(this).prop('checked', self.formData.employeeFieldConfig.requireDateOfBirth);
        $('#require-start-date').prop('checked', self.formData.employeeFieldConfig.requireStartDate);
        return;
      }
      if ($(this).prop('checked')) {
        self.formData.employeeFieldConfig.requireDateOfBirth = true;
        self.formData.employeeFieldConfig.requireStartDate = false;
      }
    });
    
    $(document).on('change', '#require-start-date', function() {
      if (self.isEditMode) {
        // Prevent changes in edit mode - restore original value
        $(this).prop('checked', self.formData.employeeFieldConfig.requireStartDate);
        $('#require-dob').prop('checked', self.formData.employeeFieldConfig.requireDateOfBirth);
        return;
      }
      if ($(this).prop('checked')) {
        self.formData.employeeFieldConfig.requireDateOfBirth = false;
        self.formData.employeeFieldConfig.requireStartDate = true;
      }
    });
    
    // Payment methods are no longer shown in the form - always default to Credit Card
    
    // Terms and conditions
    $(document).on('input', '#terms-and-conditions', function() {
      self.formData.termsAndConditions = $(this).val();
    });
    
    $(document).on('click', '#use-default-terms-btn', function() {
      $('#terms-and-conditions').val(self.defaultTermsAndConditions);
      self.formData.termsAndConditions = self.defaultTermsAndConditions;
    });
    
    // Save button
    $(document).on('click', '#save-customer-btn', function() {
      self.handleSave();
    });
    
    // Step indicator click (only works in edit mode)
    $(document).on('click', '.wizard-step-clickable', function() {
      if (self.isEditMode) {
        var stepId = parseInt($(this).data('step-id'));
        if (stepId && stepId !== self.currentStep) {
          self.jumpToStep(stepId);
        }
      }
    });
  },
  
  jumpToStep: function(step) {
    // In edit mode, allow jumping to any step without validation
    this.currentStep = step;
    this.render();
  },
  
  generateSlug: function(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },
  
  updateSlugPreview: function() {
    var distributorName = AppState.distributorName || 'Premier Distributor Co';
    var distributorSlug = this.generateSlug(distributorName);
    var customerSlug = this.formData.slug || 'customer-name';
    var url = 'www.surewerxdistributor.com/<span style="color: #666;">' + distributorSlug + '</span>/<strong>' + customerSlug + '</strong>';
    $('#slug-preview').html(url);
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
      self.formData.logo = event.target.result;
      self.render();
    };
    reader.readAsDataURL(file);
  },
  
  validateStep: function(step) {
    switch(step) {
      case 1:
        if (!this.formData.name.trim()) {
          Helpers.showAlert('Please enter a customer name', 'danger', '#next-step-btn');
          return false;
        }
        // Auto-generate slug from name if not in edit mode
        if (!this.isEditMode) {
          this.formData.slug = this.generateSlug(this.formData.name);
          if (!this.formData.slug.trim()) {
            Helpers.showAlert('Customer name must contain at least one letter or number', 'danger', '#next-step-btn');
            return false;
          }
          // Check if slug already exists (only for new customers)
          var existingCustomer = AppState.customers.find(function(p) {
            return p.slug === this.formData.slug;
          }.bind(this));
          if (existingCustomer) {
            // If slug exists, append a number to make it unique
            var baseSlug = this.formData.slug;
            var counter = 1;
            while (existingCustomer) {
              this.formData.slug = baseSlug + '-' + counter;
              existingCustomer = AppState.customers.find(function(p) {
                return p.slug === this.formData.slug;
              }.bind(this));
              counter++;
            }
            this.updateSlugPreview();
          }
        }
        return true;
      case 3:
        // Check at least one identifier field
        var hasIdentifier = this.formData.employeeFieldConfig.requireEmployeeId || 
                           this.formData.employeeFieldConfig.requireUsername;
        if (!hasIdentifier) {
          Helpers.showAlert('Please select at least one identifier field (Employee ID or Username)', 'danger', '#next-step-btn');
          return false;
        }
        // Check at least one date field
        var hasDate = this.formData.employeeFieldConfig.requireDateOfBirth || 
                     this.formData.employeeFieldConfig.requireStartDate;
        if (!hasDate) {
          Helpers.showAlert('Please select at least one date field (Date of Birth or Start Date)', 'danger', '#next-step-btn');
          return false;
        }
        return true;
      case 4:
        // Terms & Conditions step (no validation needed)
        return true;
      default:
        return true;
    }
  },
  
  handleSave: function() {
    // Always validate step 1 (name is required)
    if (!this.validateStep(1)) {
      return;
    }
    
    // Ensure payment methods default to Credit Card if not set
    if (!this.formData.paymentMethods || this.formData.paymentMethods.length === 0) {
      this.formData.paymentMethods = ['Credit Card'];
    }
    
    if (this.isEditMode) {
      // Get the original customer to preserve identifier fields
      var originalCustomer = AppState.getCustomerById(this.editingCustomerId);
      
      // Update existing customer - preserve all employee field config from original
      var employeeFieldConfig = {
        requireEmployeeId: originalCustomer.employeeFieldConfig.requireEmployeeId,
        requireUsername: originalCustomer.employeeFieldConfig.requireUsername,
        requireDateOfBirth: originalCustomer.employeeFieldConfig.requireDateOfBirth,
        requireStartDate: originalCustomer.employeeFieldConfig.requireStartDate
      };
      
      AppState.updateCustomer(this.editingCustomerId, {
        name: this.formData.name.trim(),
        status: this.formData.status,
        logoUrl: this.formData.logo,
        employeeFieldConfig: employeeFieldConfig,
        paymentMethods: this.formData.paymentMethods,
        termsAndConditions: this.formData.termsAndConditions.trim()
      });
      
      Helpers.showAlert('Customer updated successfully', 'success');
    } else {
      // Create new customer
      var newCustomer = {
        id: Helpers.generateId(),
        name: this.formData.name.trim(),
        slug: this.formData.slug.trim(),
        industry: 'General', // Default industry
        status: this.formData.status,
        logoUrl: this.formData.logo,
        employeeCount: 0,
        activeVouchers: 0,
        monthlySpend: 0,
        totalBudget: 0,
        paymentMethods: this.formData.paymentMethods,
        employeeFieldConfig: this.formData.employeeFieldConfig,
        termsAndConditions: this.formData.termsAndConditions.trim() || this.defaultTermsAndConditions,
        employees: [],
        groups: [],
        vouchers: [],
      availableProducts: AppState.products.slice(),
      distributorId: AppState.getCurrentDistributorId() // Assign to current distributor
      };
      
      AppState.customers.push(newCustomer);
      AppState.saveCustomers();
      Helpers.showAlert('Customer created successfully', 'success');
      
      // Ensure the customer is saved before navigating
      // Use setTimeout to ensure localStorage write is complete
      var self = this;
      setTimeout(function() {
        // Verify partner exists before navigating
        var savedCustomer = AppState.getCustomerById(newCustomer.id);
        if (savedCustomer) {
          App.navigate('customer-detail', { customerId: newCustomer.id });
        } else {
          // If customer not found, reload and try again
          console.error('Customer not found after save, reloading...');
          window.location.reload();
        }
      }, 100);
      return;
    }
    
    App.navigate('dashboard');
  }
};
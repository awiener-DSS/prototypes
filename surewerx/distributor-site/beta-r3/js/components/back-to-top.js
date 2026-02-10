// Back to Top Component

var BackToTopComponent = {
  init: function() {
    this.createButton();
    this.attachEvents();
    this.handleScroll();
  },
  
  createButton: function() {
    // Remove existing button if any
    $('#back-to-top-btn').remove();
    
    // Wait for body to exist
    if ($('body').length === 0) {
      setTimeout(function() {
        BackToTopComponent.createButton();
      }, 100);
      return;
    }
    
    // Create button
    var buttonHtml = '<button id="back-to-top-btn" class="back-to-top-btn" title="Back to top" style="display: none;">' +
      '<span class="glyphicon glyphicon-chevron-up"></span>' +
      '</button>';
    
    $('body').append(buttonHtml);
  },
  
  attachEvents: function() {
    var self = this;
    
    // Handle scroll to show/hide button
    $(window).on('scroll', function() {
      self.handleScroll();
    });
    
    // Handle click to scroll to top
    $(document).on('click', '#back-to-top-btn', function(e) {
      e.preventDefault();
      self.scrollToTop();
    });
  },
  
  handleScroll: function() {
    var scrollTop = $(window).scrollTop();
    var $button = $('#back-to-top-btn');
    
    // Show button when scrolled down more than 300px
    if (scrollTop > 300) {
      $button.fadeIn(200);
    } else {
      $button.fadeOut(200);
    }
  },
  
  scrollToTop: function() {
    $('html, body').animate({
      scrollTop: 0
    }, 600);
  }
};

// Auto-initialize when DOM is ready and jQuery is loaded
(function() {
  function initBackToTop() {
    if (typeof jQuery !== 'undefined' && $('body').length > 0) {
      BackToTopComponent.init();
    } else {
      // Wait a bit and try again
      setTimeout(initBackToTop, 100);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackToTop);
  } else {
    // DOM is already ready
    initBackToTop();
  }
})();

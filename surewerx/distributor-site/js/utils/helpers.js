// Helper utility functions

var Helpers = {
  // Format currency
  formatCurrency: function(value) {
    return '$' + parseFloat(value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  },
  
  // Format date
  formatDate: function(dateString) {
    if (!dateString || dateString === '' || dateString === null || dateString === undefined) {
      return '-';
    }
    var date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  },
  
  // Format number with commas
  formatNumber: function(value) {
    return parseInt(value, 10).toLocaleString();
  },
  
  // Escape HTML entities to prevent XSS
  escapeHtml: function(text) {
    if (text === null || text === undefined) {
      return '';
    }
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
  },
  
  // Generate unique ID
  generateId: function() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
  },
  
  // Show alert message - Always show in fixed position at top for visibility
  showAlert: function(message, type, targetElement) {
    // Remove existing alerts first
    $('.contextual-alert').remove();
    $('.app-alert-container .alert').remove();
    
    // Always show alerts in fixed position at top for better visibility
    if ($('.app-alert-container').length === 0) {
      $('body').append('<div class="app-alert-container"></div>');
    }
    
    // Determine icon SVG based on type
    var iconSvg = '';
    var alertType = type || 'info';
    
    switch(alertType) {
      case 'success':
        iconSvg = '<svg class="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z" fill="currentColor"/></svg>';
        break;
      case 'danger':
      case 'error':
        iconSvg = '<svg class="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" fill="currentColor"/></svg>';
        break;
      case 'warning':
        iconSvg = '<svg class="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 18h18L10 2 1 18zm2-2l7-12 7 12H3zm7-3v-2h2v2h-2zm0-4h2v2h-2V9z" fill="currentColor"/></svg>';
        break;
      default: // info
        iconSvg = '<svg class="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-4h2v4zm0-6H9V5h2v4z" fill="currentColor"/></svg>';
    }
    
    var alertHtml = '<div class="alert alert-' + alertType + ' alert-dismissible fade-in" role="alert">' +
      '<div class="alert-content">' +
      iconSvg +
      '<span class="alert-message">' + Helpers.escapeHtml(message) + '</span>' +
      '</div>' +
      '<button type="button" class="alert-close" data-dismiss="alert" aria-label="Close">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</button>' +
      '</div>';
    
    $('.app-alert-container').html(alertHtml);
    
    // Add click handler for close button
    $('.app-alert-container .alert-close').on('click', function() {
      var $alert = $(this).closest('.alert');
      $alert.addClass('fade-out');
      setTimeout(function() {
        $alert.remove();
      }, 300);
    });
    
    // Scroll to top smoothly to ensure alert is visible (only if not in a modal)
    if ($('.modal:visible').length === 0) {
      $('html, body').animate({
        scrollTop: 0
      }, 300);
    }
    
    // Auto dismiss after 6 seconds
    setTimeout(function() {
      var $alert = $('.app-alert-container .alert');
      if ($alert.length > 0) {
        $alert.addClass('fade-out');
        setTimeout(function() {
          $alert.remove();
        }, 300);
      }
    }, 6000);
  },
  
  // Get status badge class
  getStatusBadgeClass: function(status) {
    var map = {
      'Processing': 'status-processing',
      'Shipped': 'status-shipped',
      'Cancelled': 'status-cancelled',
      'Returned': 'status-returned',
      'Active': 'label-success',
      'Inactive': 'label-default'
    };
    return map[status] || 'label-default';
  },
  
  // Debounce function
  debounce: function(func, wait) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  },
  
  // Export to CSV
  exportToCSV: function(data, filename) {
    if (!data || !data.length) {
      Helpers.showAlert('No data to export', 'warning');
      return;
    }
    
    // Get headers from first object
    var headers = Object.keys(data[0]);
    
    // Build CSV content
    var csvContent = headers.join(',') + '\n';
    
    data.forEach(function(row) {
      var values = headers.map(function(header) {
        var val = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof val === 'string' && (val.indexOf(',') > -1 || val.indexOf('"') > -1)) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      });
      csvContent += values.join(',') + '\n';
    });
    
    // Create download link
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    if (link.download !== undefined) {
      var url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename || 'export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      Helpers.showAlert('Export successful', 'success');
    }
  },
  
  // Export to Excel with color-coded column headers
  exportToExcel: function(data, filename, columnCategories) {
    if (!data || !data.length) {
      Helpers.showAlert('No data to export', 'warning');
      return;
    }
    
    // Check if ExcelJS library is available
    if (typeof ExcelJS === 'undefined') {
      console.error('ExcelJS is not defined. Available globals:', Object.keys(window).filter(function(k) { return k.toLowerCase().includes('excel') || k.toLowerCase().includes('xlsx'); }));
      Helpers.showAlert('Excel export library not loaded. Please refresh the page.', 'danger');
      return;
    }
    
    // Get headers from first object
    var headers = Object.keys(data[0]);
    
    // Create workbook and worksheet
    var workbook = new ExcelJS.Workbook();
    var worksheet = workbook.addWorksheet('Transactions');
    
    // Create header row with styling
    var headerRow = worksheet.addRow(headers);
    
    // Style header row cells based on category
    headers.forEach(function(header, colIndex) {
      var cell = headerRow.getCell(colIndex + 1);
      
      // Find which category this column belongs to
      var bgColor = 'FFFFFF'; // Default white
      
      if (columnCategories) {
        for (var categoryName in columnCategories) {
          if (columnCategories.hasOwnProperty(categoryName)) {
            var category = columnCategories[categoryName];
            if (category.columns && category.columns.indexOf(header) !== -1) {
              bgColor = category.color;
              break;
            }
          }
        }
      }
      
      // Apply styling
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF' + bgColor } // Add FF prefix for alpha channel
      };
      cell.font = {
        bold: true,
        size: 11,
        color: { argb: 'FF000000' }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Set header row height
    headerRow.height = 25;
    
    // Add data rows
    data.forEach(function(row) {
      var rowData = headers.map(function(header) {
        var value = row[header];
        // Convert dates to Excel date format if needed
        if (value !== undefined && value !== null) {
          return value;
        }
        return '';
      });
      worksheet.addRow(rowData);
    });
    
    // Set column widths
    headers.forEach(function(header, colIndex) {
      var width = Math.max(header.length + 2, 12);
      worksheet.getColumn(colIndex + 1).width = Math.min(width, 30);
    });
    
    // Freeze header row
    worksheet.views = [{
      state: 'frozen',
      ySplit: 1
    }];
    
    // Write file
    workbook.xlsx.writeBuffer().then(function(buffer) {
      var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var link = document.createElement('a');
      var url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename || 'export.xlsx');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      Helpers.showAlert('Excel export successful', 'success');
    }).catch(function(error) {
      console.error('Excel export error:', error);
      Helpers.showAlert('Error exporting to Excel: ' + error.message, 'danger');
    });
  },
  
  // Export to Excel with color-coded column headers
  exportToExcel: function(data, filename, columnCategories) {
    if (!data || !data.length) {
      Helpers.showAlert('No data to export', 'warning');
      return;
    }
    
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
      Helpers.showAlert('Excel export library not loaded. Please refresh the page.', 'danger');
      return;
    }
    
    // Get headers from first object
    var headers = Object.keys(data[0]);
    
    // Create workbook and worksheet
    var wb = XLSX.utils.book_new();
    var wsData = [];
    
    // Define column category colors
    var categoryColors = {
      'invoice': { bg: 'FFE6E6', fg: '000000' },        // Light red
      'customer': { bg: 'E6F3FF', fg: '000000' },      // Light blue
      'sku': { bg: 'E6FFE6', fg: '000000' },           // Light green
      'item': { bg: 'FFF9E6', fg: '000000' },          // Light yellow
      'order': { bg: 'F0E6FF', fg: '000000' }          // Light purple
    };
    
    // Create header row with styling
    var headerRow = [];
    var headerStyles = [];
    
    headers.forEach(function(header) {
      headerRow.push(header);
      
      // Determine category for this column
      var category = 'order'; // default
      if (columnCategories && columnCategories[header]) {
        category = columnCategories[header];
      } else {
        // Auto-detect category based on header name
        var headerLower = header.toLowerCase();
        if (headerLower.indexOf('invoice') !== -1) {
          category = 'invoice';
        } else if (headerLower.indexOf('employee') !== -1 || headerLower.indexOf('location') !== -1 || 
                   headerLower.indexOf('department') !== -1 || headerLower.indexOf('address') !== -1 ||
                   headerLower.indexOf('city') !== -1 || headerLower.indexOf('state') !== -1 ||
                   headerLower.indexOf('zip') !== -1 || headerLower.indexOf('username') !== -1 ||
                   headerLower.indexOf('user group') !== -1) {
          category = 'customer';
        } else if (headerLower.indexOf('sku') !== -1 || headerLower.indexOf('product name') !== -1) {
          category = 'sku';
        } else if (headerLower.indexOf('quantity') !== -1 || headerLower.indexOf('unit price') !== -1 ||
                   headerLower.indexOf('line total') !== -1 || headerLower.indexOf('line status') !== -1 ||
                   headerLower.indexOf('voucher') !== -1 || headerLower.indexOf('credit card') !== -1) {
          category = 'item';
        }
      }
      
      var color = categoryColors[category] || categoryColors['order'];
      headerStyles.push({
        fill: { fgColor: { rgb: color.bg } },
        font: { bold: true, color: { rgb: color.fg } },
        alignment: { horizontal: 'center', vertical: 'center' }
      });
    });
    
    wsData.push(headerRow);
    
    // Add data rows
    data.forEach(function(row) {
      var dataRow = headers.map(function(header) {
        return row[header] || '';
      });
      wsData.push(dataRow);
    });
    
    // Create worksheet
    var ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Apply header row styling
    if (ws['!cols']) {
      headers.forEach(function(header, index) {
        var colLetter = XLSX.utils.encode_col(index);
        var cellRef = colLetter + '1';
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: header };
        ws[cellRef].s = headerStyles[index];
      });
    } else {
      // Apply styles to header cells
      headers.forEach(function(header, index) {
        var colLetter = XLSX.utils.encode_col(index);
        var cellRef = colLetter + '1';
        if (ws[cellRef]) {
          ws[cellRef].s = headerStyles[index];
        }
      });
    }
    
    // Set column widths
    ws['!cols'] = headers.map(function() {
      return { wch: 15 };
    });
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    
    // Write file
    XLSX.writeFile(wb, filename || 'export.xlsx');
    
    Helpers.showAlert('Excel export successful', 'success');
  }
};
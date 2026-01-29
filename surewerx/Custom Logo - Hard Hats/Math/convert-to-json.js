const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, 'Calculation.xlsx'));

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Write to JSON file
fs.writeFileSync(
  path.join(__dirname, 'calculation.json'),
  JSON.stringify(data, null, 2)
);

console.log('Converted Calculation.xlsx to calculation.json');
console.log('Total rows:', data.length);
console.log('\nFirst 10 rows:');
for (let i = 0; i < Math.min(10, data.length); i++) {
  console.log(`Row ${i}:`, JSON.stringify(data[i]));
}

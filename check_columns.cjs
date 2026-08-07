const xlsx = require('xlsx');

const filePath = 'c:\\\\Users\\\\bilij\\\\Documents\\\\projects\\\\iiit\\\\ECE.xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    if (data.length > 0) {
        console.log('Row 0:', data[0]);
    } else {
        console.log('No data found in ECE.xlsx');
    }
} catch (error) {
    console.error('Error reading excel file:', error);
}

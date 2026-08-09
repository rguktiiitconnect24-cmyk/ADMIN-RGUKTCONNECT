const xlsx = require('xlsx');

try {
    const workbook = xlsx.readFile('c:\\Users\\bilij\\Documents\\projects\\iiit\\puc_2.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    if (data.length > 0) {
        console.log('Headers of first row:', Object.keys(data[0]));
        console.log('First row data:', data[0]);
    } else {
        console.log('Sheet is empty');
    }
} catch (err) {
    console.error('Error reading excel:', err);
}

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'c:\\\\Users\\\\bilij\\\\Documents\\\\projects\\\\iiit\\\\ai&ml.xlsx';
const outputPath = 'c:\\\\Users\\\\bilij\\\\Documents\\\\projects\\\\iiit\\\\admin-panel\\\\src\\\\assets\\\\tempStudents.json';

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // Normalize keys
    const cleanData = data.map(row => ({
        id: row['ID.No.'],
        name: row['NAME OF STUDENT'],
        gender: row['GENDER'],
        branch: (row[' BRANCH'] ? row[' BRANCH'].trim() : '') === 'AIML' ? 'CSC (AI&ML)' : (row[' BRANCH'] ? row[' BRANCH'].trim() : ''),
        section: row['Class Section'] || row['section'] || ''
    }));

    fs.writeFileSync(outputPath, JSON.stringify(cleanData, null, 2));
    console.log(`Saved ${cleanData.length} students to tempStudents.json`);
} catch (error) {
    console.error('Error reading excel file:', error);
}

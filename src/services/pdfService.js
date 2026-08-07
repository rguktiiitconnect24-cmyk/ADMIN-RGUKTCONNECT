import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    collection, 
    addDoc, 
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'pdfs';

export const pdfService = {
    /**
     * Generates a native vector PDF for the student profile report.
     * This provides selectable text and perfect quality.
     */
    async generateStudentProfilePdf(formData, user, logoUri, avatarUri) {
        // Create PDF in A4 format
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);

        // --- BACKGROUND / ACCENTS ---
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Header Primary Bar
        doc.setFillColor(30, 58, 138); 
        doc.rect(0, 0, pageWidth, 4, 'F');

        // --- SUBTLE WATERMARK (SAFE) ---
        try {
            doc.setTextColor(245, 247, 250);
            doc.setFontSize(40);
            doc.setFont('helvetica', 'bold');
            if (typeof doc.saveGraphicsState === 'function') {
                doc.saveGraphicsState();
                doc.text('OFFICIAL RECORD', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                doc.restoreGraphicsState();
            } else {
                // Fallback for older jsPDF versions
                doc.text('OFFICIAL RECORD', pageWidth / 2, pageHeight / 2, null, 45);
            }
        } catch (e) {}

        // --- HEADER ---
        let currentY = 15;
        
        // Logo
        if (logoUri) {
            try {
                doc.addImage(logoUri, 'PNG', margin, currentY, 18, 18);
            } catch (e) {}
        }

        // Brand Name & System Info
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('RGUKT CONNECT', margin + 22, currentY + 7);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('OFFICIAL ACADEMIC RECORD SYSTEM', margin + 22, currentY + 12);

        // Generation Date
        const dateStr = new Date().toLocaleDateString('en-IN', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${dateStr}`, pageWidth - margin, currentY + 7, { align: 'right' });

        currentY += 22;

        // --- TITLE STRIP ---
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, currentY, contentWidth, 12, 'F');
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('STUDENT PROFILE REPORT', pageWidth / 2, currentY + 8, { align: 'center' });

        currentY += 20;

        // --- HERO SECTION ---
        // Profile Photo
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(margin, currentY, 32, 40, 'D');
        
        if (avatarUri) {
            try {
                doc.addImage(avatarUri, 'JPEG', margin + 0.5, currentY + 0.5, 31, 39);
            } catch (e) {}
        }

        // Student Basic Info
        const infoX = margin + 38;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(17);
        doc.setFont('helvetica', 'bold');
        doc.text(formData.fullName?.toUpperCase() || 'STUDENT NAME', infoX, currentY + 10);
        
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.text(`Student ID: ${formData.studentId || 'N/A'}`, infoX, currentY + 17);
        
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formData.department || 'Academic Branch'}`, infoX, currentY + 23);
        doc.text(`RGUKT RK Valley Campus`, infoX, currentY + 28);

        // Status Badge
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(infoX, currentY + 32, 25, 6, 1, 1, 'F');
        doc.setTextColor(22, 163, 74);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('ACTIVE STUDENT', infoX + 12.5, currentY + 36.2, { align: 'center' });

        currentY += 50;

        // --- INFORMATION CARDS ---
        const drawCard = (title, fields, y) => {
            // Card Title with Underline
            doc.setTextColor(30, 58, 138);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(title.toUpperCase(), margin, y);
            
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(margin, y + 2, margin + contentWidth, y + 2);

            let fieldX = margin;
            let fieldY = y + 10;
            const colWidth = contentWidth / 2;

            // Column Separator
            doc.setDrawColor(241, 245, 249);
            doc.line(margin + colWidth - 5, y + 8, margin + colWidth - 5, y + (13 * Math.ceil(fields.length / 2)) + 2);

            fields.forEach((field, index) => {
                if (index > 0 && index % 2 === 0) {
                    fieldX = margin;
                    fieldY += 13;
                } else if (index % 2 !== 0) {
                    fieldX = margin + colWidth;
                }

                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.setFont('helvetica', 'bold');
                doc.text(field.label.toUpperCase(), fieldX, fieldY);
                
                doc.setFontSize(9.5);
                doc.setTextColor(15, 23, 42);
                doc.setFont('helvetica', 'normal');
                doc.text(String(field.value || 'N/A'), fieldX, fieldY + 5);
            });

            return 13 * (Math.ceil(fields.length / 2)) + 12;
        };

        // Academic Info Card
        const admissionYear = formData.studentId?.match(/[a-zA-Z](\d{2})/)?.[1] ? `20${formData.studentId.match(/[a-zA-Z](\d{2})/)[1]}` : '2024';
        
        currentY += drawCard('Academic & Identity Information', [
            { label: 'Full Name', value: formData.fullName },
            { label: 'Student ID', value: formData.studentId },
            { label: 'RC ID', value: formData.rcId },
            { label: 'Branch / Dept', value: formData.department },
            { label: 'Current Class', value: formData.currentClass },
            { label: 'Campus', value: formData.campus },
            { label: 'Admission Year', value: admissionYear },
            { label: 'Course', value: 'B.Tech' }
        ], currentY);

        currentY += 10;

        // Contact Info Card
        currentY += drawCard('Contact & Account Details', [
            { label: 'Phone Number', value: formData.phone ? `+91 ${formData.phone}` : 'N/A' },
            { label: 'Email Address', value: formData.email },
            { label: 'Language', value: formData.language },
            { label: 'Timezone', value: formData.timezone },
            { label: 'User Role', value: user?.role || 'Student' },
            { label: 'Date of Birth', value: user?.dob },
            { label: 'Account Created', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
            { label: 'Last Active', value: new Date().toLocaleDateString() }
        ], currentY);

        currentY += 10;

        // Bio Section
        if (formData.bio) {
            doc.setTextColor(30, 58, 138);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.text('STUDENT STATEMENT / BIO', margin, currentY + 5);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            const splitBio = doc.splitTextToSize(formData.bio, contentWidth);
            doc.text(splitBio, margin, currentY + 10);
        }

        // --- FOOTER ---
        const footerY = pageHeight - 12;
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
        
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('RGUKT CONNECT - OFFICIAL DIGITAL STUDENT RECORD', margin, footerY);
        doc.text('support@rguktconnect.com', pageWidth / 2, footerY, { align: 'center' });
        doc.text('Page 01 of 01', pageWidth - margin, footerY, { align: 'right' });
        
        doc.setFontSize(5.5);
        doc.text('This is an electronically generated document. No physical signature required.', pageWidth / 2, footerY + 4, { align: 'center' });

        return doc;
    },

    /**
     * Generates a native vector PDF for the Timetable.
     * Landscape orientation with a structured grid.
     */
    async generateTimetablePdf(schedule, user, logoUri) {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;
        const contentWidth = pageWidth - (margin * 2);

        // Background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, pageWidth, 4, 'F');

        // --- SUBTLE WATERMARK (SAFE) ---
        try {
            doc.setTextColor(248, 250, 252);
            doc.setFontSize(55);
            doc.setFont('helvetica', 'bold');
            if (typeof doc.saveGraphicsState === 'function') {
                doc.saveGraphicsState();
                doc.text('SCHEDULE RECORD', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 35 });
                doc.restoreGraphicsState();
            } else {
                doc.text('SCHEDULE RECORD', pageWidth / 2, pageHeight / 2, null, 35);
            }
        } catch (e) {}

        // Header
        let currentY = 12;
        if (logoUri) {
            try {
                doc.addImage(logoUri, 'PNG', margin, currentY, 15, 15);
            } catch (e) {}
        }

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('RGUKT CONNECT TIMETABLE', margin + 20, currentY + 6);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(`OFFICIAL CLASS SCHEDULE: ${user?.currentClass || 'F-08'}`, margin + 20, currentY + 11);

        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${dateStr}`, pageWidth - margin, currentY + 6, { align: 'right' });

        currentY += 22;

        // Days of the week
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timeSlots = [
            '08:30 - 09:30', '09:30 - 10:30', '10:40 - 11:40', 
            '11:40 - 12:40', '01:40 - 02:40', '02:40 - 03:40', '03:50 - 04:50'
        ];

        // Table Header (Time Slots)
        const colWidth = (contentWidth - 25) / 7;
        const rowHeight = 22;

        doc.setFillColor(30, 58, 138);
        doc.rect(margin, currentY, contentWidth, 10, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('DAY / PERIOD', margin + 4, currentY + 6.5);

        timeSlots.forEach((slot, i) => {
            const x = margin + 25 + (i * colWidth);
            doc.text(slot, x + (colWidth / 2), currentY + 6.5, { align: 'center' });
        });

        currentY += 10;

        // Grid Rows
        days.forEach((day, dayIdx) => {
            const y = currentY + (dayIdx * rowHeight);
            
            // Row background (alternating)
            if (dayIdx % 2 === 0) {
                doc.setFillColor(255, 255, 255);
            } else {
                doc.setFillColor(241, 245, 249);
            }
            doc.rect(margin, y, contentWidth, rowHeight, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin, y, contentWidth, rowHeight, 'D');

            // Day label
            doc.setTextColor(71, 85, 105);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(day.substring(0, 3).toUpperCase(), margin + 12, y + (rowHeight / 2) + 1, { align: 'center' });

            // Subject cells
            const daySchedule = schedule?.[day] || [];
            timeSlots.forEach((_, slotIdx) => {
                const x = margin + 25 + (slotIdx * colWidth);
                doc.setDrawColor(226, 232, 240);
                doc.line(x, y, x, y + rowHeight);

                const period = daySchedule[slotIdx];
                if (period && period !== 'Free' && period !== '-') {
                    const subjectText = (typeof period === 'object' ? period.subject : period) || '';
                    
                    doc.setTextColor(15, 23, 42);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8.5);
                    
                    const subLines = doc.splitTextToSize(subjectText, colWidth - 4);
                    // Center vertically
                    const textHeight = subLines.length * 3.5;
                    const textY = y + (rowHeight / 2) - (textHeight / 2) + 2.5;
                    doc.text(subLines, x + (colWidth / 2), textY, { align: 'center' });

                    if (typeof period === 'object' && (period.room || period.faculty)) {
                        doc.setTextColor(100, 116, 139);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(6.5);
                        const detail = [period.room, period.faculty].filter(Boolean).join(' | ');
                        doc.text(detail, x + (colWidth / 2), textY + textHeight + 1, { align: 'center' });
                    }
                } else {
                    doc.setTextColor(203, 213, 225);
                    doc.setFontSize(8);
                    doc.text('-', x + (colWidth / 2), y + (rowHeight / 2) + 1.5, { align: 'center' });
                }
            });
        });

        // Footer
        const footerY = pageHeight - 12;
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('© RGUKT CONNECT DIGITAL SYSTEMS', margin, footerY);
        doc.text(`Student: ${user?.fullName || 'N/A'} (${user?.studentId || 'ID'})`, pageWidth / 2, footerY, { align: 'center' });
        doc.text('Academic Year 2024-25', pageWidth - margin, footerY, { align: 'right' });

        return doc;
    },

    /**
     * Generates a native vector PDF for the Academic Report (CGPA).
     */
    async generateAcademicReportPdf(cgpaRecord, user, logoUri, avatarUri) {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);

        // --- BACKGROUND / ACCENTS ---
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Header Primary Bar
        doc.setFillColor(30, 58, 138); 
        doc.rect(0, 0, pageWidth, 4, 'F');

        // --- SUBTLE WATERMARK (SAFE) ---
        try {
            doc.setTextColor(245, 247, 250);
            doc.setFontSize(40);
            doc.setFont('helvetica', 'bold');
            if (typeof doc.saveGraphicsState === 'function') {
                doc.saveGraphicsState();
                doc.text('OFFICIAL RECORD', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                doc.restoreGraphicsState();
            } else {
                doc.text('OFFICIAL RECORD', pageWidth / 2, pageHeight / 2, null, 45);
            }
        } catch (e) {}

        // --- HEADER ---
        let currentY = 15;
        
        // Logo
        if (logoUri) {
            try {
                doc.addImage(logoUri, 'PNG', margin, currentY, 18, 18);
            } catch (e) {}
        }

        // Brand Name & System Info
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('RGUKT CONNECT', margin + 22, currentY + 7);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('OFFICIAL ACADEMIC RECORD SYSTEM', margin + 22, currentY + 12);

        // Generation Date
        const dateStr = new Date().toLocaleDateString('en-IN', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${dateStr}`, pageWidth - margin, currentY + 7, { align: 'right' });

        currentY += 22;

        // --- TITLE STRIP ---
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, currentY, contentWidth, 12, 'F');
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('ACADEMIC PERFORMANCE REPORT', pageWidth / 2, currentY + 8, { align: 'center' });

        currentY += 20;

        // --- STUDENT INFO ---
        // Profile Photo on the Right
        let photoWidth = 32;
        let photoHeight = 40;
        let photoX = pageWidth - margin - photoWidth;
        let photoY = currentY;
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(photoX, photoY, photoWidth, photoHeight, 'D');
        
        const photoSource = avatarUri || user?.photoURL;
        if (photoSource) {
            try {
                doc.addImage(photoSource, 'JPEG', photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1);
            } catch (e) {
                console.error("Error adding avatar to PDF", e);
            }
        }

        // Student Info Text on the Left
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(user?.fullName?.toUpperCase() || 'STUDENT NAME', margin, currentY + 8);

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.text(`Student ID: ${user?.studentId || cgpaRecord.studentId || 'N/A'}`, margin, currentY + 16);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Cumulative GPA: `, margin, currentY + 24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(`${cgpaRecord.cgpa || '0.00'}`, margin + 35, currentY + 24);

        if (cgpaRecord.sgpa) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Recent SGPA: `, margin, currentY + 32);
            doc.setFont('helvetica', 'bold');
            doc.text(`${cgpaRecord.sgpa}`, margin + 30, currentY + 32);
        }

        currentY += 45;

        // --- SUBJECTS TABLE ---
        if (cgpaRecord.subjects && cgpaRecord.subjects.length > 0) {
            let currentGroup = 'PUC-1 (Sem-1)';
            const groupedSubjects = { 
                'PUC-1 (Sem-1)': [], 
                'PUC-1 (Sem-2)': [], 
                'PUC-2 (Sem-1)': [], 
                'PUC-2 (Sem-2)': [] 
            };
            
            cgpaRecord.subjects.forEach(s => {
                const name = (s.subject || '').toUpperCase().trim();
                const match = name.match(/-(I|II|III|IV)$/);
                if (match) {
                    const numeral = match[1];
                    if (numeral === 'I') currentGroup = 'PUC-1 (Sem-1)';
                    else if (numeral === 'II') currentGroup = 'PUC-1 (Sem-2)';
                    else if (numeral === 'III') currentGroup = 'PUC-2 (Sem-1)';
                    else if (numeral === 'IV') currentGroup = 'PUC-2 (Sem-2)';
                }
                groupedSubjects[currentGroup].push(s);
            });

            ['PUC-1 (Sem-1)', 'PUC-1 (Sem-2)', 'PUC-2 (Sem-1)', 'PUC-2 (Sem-2)'].forEach(groupName => {
                const groupSubjects = groupedSubjects[groupName];
                if (groupSubjects.length > 0) {
                    // Title for the group
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 58, 138);
                    doc.text(`${groupName} Subjects`, margin, currentY);
                    currentY += 4;

                    const tableData = groupSubjects.map((s, index) => [
                        (index + 1).toString(),
                        s.subject || '-',
                        s.credits || '-',
                        s.internal || '-',
                        s.grade || '-',
                        s.status || '-'
                    ]);

                    autoTable(doc, {
                        startY: currentY,
                        head: [['#', 'Subject Name', 'Credits', 'Internal', 'Grade', 'Status']],
                        body: tableData,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [30, 58, 138],
                            textColor: 255,
                            fontStyle: 'bold',
                            fontSize: 9
                        },
                        bodyStyles: {
                            fontSize: 8,
                            textColor: [71, 85, 105]
                        },
                        alternateRowStyles: {
                            fillColor: [248, 250, 252]
                        },
                        columnStyles: {
                            0: { cellWidth: 10 },
                            2: { cellWidth: 15, halign: 'center' },
                            3: { cellWidth: 18, halign: 'center' },
                            4: { cellWidth: 15, halign: 'center' },
                            5: { cellWidth: 18, halign: 'center' }
                        },
                        margin: { left: margin, right: margin }
                    });
                    
                    currentY = doc.lastAutoTable.finalY + 12;
                }
            });
        }

        // --- FOOTER ---
        const footerY = pageHeight - 15;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY, pageWidth - margin, footerY);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('This is an electronically generated academic report. No physical signature required.', pageWidth / 2, footerY + 5, { align: 'center' });

        return doc;
    },

    // --- GOOGLE DRIVE PDF API METHODS ---

    /**
     * Save PDF metadata to Firestore after a successful Google Drive upload
     */
    async uploadPdfMetadata(pdfData) {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...pdfData,
                uploadedDate: serverTimestamp(),
                downloads: 0,
                views: 0,
                status: 'active'
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error adding document: ', error);
            throw new Error('Failed to save PDF metadata: ' + error.message);
        }
    },

    /**
     * Upload a file to Google Drive via Apps Script
     */
    async uploadFileToDrive(file, metadata, onProgress, backendUrl) {
        if (!backendUrl) throw new Error("backendUrl is required");
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = reader.result.split(',')[1];
                if (onProgress) onProgress('Uploading to Google Drive...');
                
                try {
                    const response = await fetch(backendUrl, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'upload',
                            fileName: file.name,
                            mimeType: file.type,
                            fileBase64: base64Data,
                            ...metadata
                        })
                    });
                    
                    const result = await response.json();
                    if (result.status === 'success') {
                        resolve(result);
                    } else {
                        reject(new Error(result.message || 'Upload failed'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = error => reject(error);
        });
    },

    /**
     * Delete a file from Google Drive via Apps Script
     */
    async deleteFileFromDrive(gdFileId, backendUrl) {
        if (!backendUrl) throw new Error("backendUrl is required");
        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'delete',
                    gdFileId
                })
            });
            const result = await response.json();
            if (result.status !== 'success') {
                throw new Error(result.message || 'Delete failed');
            }
            return result;
        } catch (err) {
            throw err;
        }
    },

    /**
     * Replace a file in Google Drive via Apps Script
     */
    async replaceFileInDrive(gdFileId, file, onProgress, backendUrl) {
        if (!backendUrl) throw new Error("backendUrl is required");
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = reader.result.split(',')[1];
                if (onProgress) onProgress('Replacing in Google Drive...');
                
                try {
                    const response = await fetch(backendUrl, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'replace',
                            gdFileId,
                            fileName: file.name,
                            mimeType: file.type,
                            fileBase64: base64Data
                        })
                    });
                    
                    const result = await response.json();
                    if (result.status === 'success') {
                        resolve(result);
                    } else {
                        reject(new Error(result.message || 'Replace failed'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = error => reject(error);
        });
    }
};

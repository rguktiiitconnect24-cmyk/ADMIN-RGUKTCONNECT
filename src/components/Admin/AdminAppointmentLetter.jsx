import React from 'react';
import { Copy, CheckCircle2, Download, X } from 'lucide-react';
import './AdminAppointmentLetter.css';

const LOGO_DATA_URI = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMjgiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcikiLz4KICA8cGF0aCBkPSJNMjU2IDEyMEw2NCAyMTBMMjU2IDMwMEw0NDggMjEwTDI1NiAxMjBaIiBmaWxsPSJ3aGl0ZSIvPgogIDxwYXRoIGQ9Ik0xMjggMjQwVjMyMEMxMjggMzIwIDE4MCAzNzAgMjU2IDM3MEMzMzIgMzcwIDM4NCAzMjAgMzg0IDMyMFYyNDBMMjU2IDMwMEwxMjggMjQwWiIgZmlsbD0id2hpdGUiLz4KICA8cGF0aCBkPSJNNDE2IDIxMFYzNDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxjaXJjbGUgY3g9IjQxNiIgY3k9IjM1MCIgcj0iMTUiIGZpbGw9IndoaGl0ZSIvPgogIDxkZWZzPgog   PGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSI1MTIiIHkyPSI1MTIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzRmNDZlNSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMzNzMwYTMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgo8L3N2Zz4=`;

const AdminAppointmentLetter = ({ adminData, onClose }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        const textToCopy = `RGUKT CONNECT
Semi Administrator Appointment Letter

Date: ${adminData.date || new Date().toLocaleDateString()}

Dear ${adminData.fullName},

We are pleased to appoint you as a Semi Administrator for the RGUKT CONNECT application.

As a Semi Administrator, you are authorized to manage assigned content, assist users, update academic resources, and support the platform's administration as per your assigned permissions.

Details:

* Name: ${adminData.fullName}
* Admin ID: ${adminData.adminId || 'N/A'}
* Official Email: ${adminData.email}
* Username: ${adminData.adminId || adminData.email.split('@')[0]}
* Temporary Password: ${adminData.password || '****** (Not Stored)'}

Please keep your login credentials confidential and use this account only for official RGUKT CONNECT purposes.

We welcome you to the RGUKT CONNECT Administration Team and wish you success in your role.

Authorized By
RGUKT CONNECT Administration Team`;

        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="appointment-letter-overlay">
            <div className="appointment-letter-container">
                <div className="appointment-letter-actions no-print">
                    <button className="letter-action-btn print-btn" onClick={handlePrint}>
                        <Download size={16} /> Print / PDF
                    </button>
                    <button className="letter-action-btn copy-btn" onClick={handleCopy}>
                        {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy Letter'}
                    </button>
                    {onClose && (
                        <button className="letter-action-btn close-btn" onClick={onClose}>
                            <X size={16} /> Close
                        </button>
                    )}
                </div>

                <div className="appointment-letter-content printable-area">
                    <div className="letter-header-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '1.5rem' }}>
                        <img src={LOGO_DATA_URI} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#000000', letterSpacing: '1px', fontFamily: 'inherit' }}>RGUKT CONNECT</span>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', textDecoration: 'underline' }}>Semi Administrator Appointment Letter</span>
                    </div>

                    <div className="letter-date" style={{ textAlign: 'left', marginBottom: '2rem' }}>
                        <strong>Date:</strong> {adminData.date || new Date().toLocaleDateString()}
                    </div>

                    <div className="letter-body">
                        <p>Dear <strong>{adminData.fullName}</strong>,</p>
                        
                        <p>We are pleased to appoint you as a <strong>Semi Administrator</strong> for the <strong>RGUKT CONNECT</strong> application.</p>
                        
                        <p>As a Semi Administrator, you are authorized to manage assigned content, assist users, update academic resources, and support the platform's administration as per your assigned permissions.</p>
                        
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '2rem', marginBottom: '1rem' }}>Details:</h3>
                        <ul style={{ listStyleType: 'disc', marginLeft: '3rem', marginBottom: '2.5rem' }}>
                            <li style={{ marginBottom: '0.75rem' }}><strong>Name:</strong> {adminData.fullName}</li>
                            <li style={{ marginBottom: '0.75rem' }}><strong>Admin ID:</strong> {adminData.adminId || 'N/A'}</li>
                            <li style={{ marginBottom: '0.75rem' }}><strong>Official Email:</strong> {adminData.email}</li>
                            <li style={{ marginBottom: '0.75rem' }}><strong>Username:</strong> {adminData.adminId || adminData.email.split('@')[0]}</li>
                            <li style={{ marginBottom: '0.75rem' }}><strong>Temporary Password:</strong> {adminData.password || '****** (Not Stored)'}</li>
                        </ul>

                        <p>Please keep your login credentials confidential and use this account only for official RGUKT CONNECT purposes.</p>
                        
                        <p style={{ marginTop: '1.5rem' }}>We welcome you to the <strong>RGUKT CONNECT Administration Team</strong> and wish you success in your role.</p>
                    </div>

                    <div className="letter-signatures" style={{ marginTop: '3rem', justifyContent: 'flex-start' }}>
                        <div className="signature-block">
                            <h4>Authorized By</h4>
                            <p><strong>RGUKT CONNECT Administration Team</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAppointmentLetter;

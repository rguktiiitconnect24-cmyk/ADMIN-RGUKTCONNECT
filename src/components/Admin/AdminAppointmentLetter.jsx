import React from 'react';
import { Copy, CheckCircle2, Download, X } from 'lucide-react';
import './AdminAppointmentLetter.css';

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
                    <div className="letter-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #000', paddingBottom: '1.5rem' }}>
                        <img src="/logo.svg" alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#000000', letterSpacing: '1px' }}>RGUKT CONNECT</h1>
                    </div>

                    <div className="letter-date" style={{ textAlign: 'left', marginBottom: '2rem' }}>
                        <h2>Semi Administrator Appointment Letter</h2>
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

import { ShieldAlert, MessageSquare, Megaphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NotificationSettings = () => {
    const { user, updateProfileData } = useAuth();

    const toggles = [
        { id: 'securityAlerts', label: 'Security Alerts', desc: 'Critical account updates', icon: ShieldAlert },
        { id: 'classUpdates', label: 'Class Updates', desc: 'Schedule changes and news', icon: Megaphone },
        { id: 'messages', label: 'Direct Messages', desc: 'Chat and support notifications', icon: MessageSquare }
    ];

    return (
        <div className="space-y-4">
            {toggles.map((item) => (
                <div key={item.id} className="settings-section-card">
                    <div className="settings-item-row">
                        <div className="settings-item-info">
                            <div className={`settings-item-icon ${item.id}`}>
                                <item.icon size={20} />
                            </div>
                            <div>
                                <h4 className="settings-item-title">{item.label}</h4>
                                <p className="settings-item-desc">{item.desc}</p>
                            </div>
                        </div>
                        <label className="premium-toggle">
                            <input 
                                type="checkbox" 
                                checked={user?.[item.id] || false}
                                onChange={(e) => updateProfileData({ [item.id]: e.target.checked })}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationSettings;

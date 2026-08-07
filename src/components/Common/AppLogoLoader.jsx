import './AppLogoLoader.css';

const AppLogoLoader = ({ message = "Loading..." }) => {
    return (
        <div className="app-logo-loader-container">
            <div className="logo-spinner-wrapper">
                {/* High-Performance CSS Spinner */}
                <div className="css-spinner-ring"></div>
                
                {/* Center App Logo */}
                <div className="center-logo">
                    <img src="/logo.svg" alt="App Logo" />
                </div>
            </div>
            
            {/* Message Below */}
            {message && <div className="loader-message-v2">{message}</div>}
        </div>
    );
};

export default AppLogoLoader;

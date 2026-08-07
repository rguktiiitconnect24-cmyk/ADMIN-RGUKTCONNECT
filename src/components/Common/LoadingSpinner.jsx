import './LoadingSpinner.css';

const LoadingSpinner = ({ text = 'Loading...', fullScreen = false }) => {
    // Check if text ends with dots to animate them
    const hasDots = text.endsWith('...');
    const displayTitle = hasDots ? text.slice(0, -3) : text;

    const content = (
        <div className="loading-container">
            <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full shadow-sm"></div>
            {text && (
                <p className="loading-text">
                    {displayTitle}
                    {hasDots && <span className="loading-dots"></span>}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-backdrop backdrop-blur-sm flex-center-all z-50">
                {content}
            </div>
        );
    }

    return <div className="w-full flex justify-center py-12">{content}</div>;
};

export default LoadingSpinner;

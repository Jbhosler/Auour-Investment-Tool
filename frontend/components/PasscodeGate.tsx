import React, { useState, useEffect } from 'react';

interface PasscodeGateProps {
    children: React.ReactNode;
}

const PasscodeGate: React.FC<PasscodeGateProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [passcode, setPasscode] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isChecking, setIsChecking] = useState<boolean>(true);

    // Check for existing authentication on mount
    useEffect(() => {
        const checkAuth = () => {
            try {
                // Check localStorage for access_granted flag
                const accessGranted = localStorage.getItem('access_granted');
                if (accessGranted === 'true') {
                    setIsAuthenticated(true);
                }
            } catch (e) {
                console.error('Error checking authentication:', e);
            } finally {
                setIsChecking(false);
            }
        };

        checkAuth();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Trim whitespace from input
        const trimmedPasscode = passcode.trim();

        if (trimmedPasscode === '007') {
            // Grant access
            try {
                localStorage.setItem('access_granted', 'true');
                setIsAuthenticated(true);
                setPasscode('');
            } catch (e) {
                console.error('Error saving authentication:', e);
                setError('Unable to save authentication. Please try again.');
            }
        } else {
            // Show error message
            setError('Access Restricted. Please contact Mac Nicholson at mnicholson@auour.com for authorization.');
            setPasscode('');
        }
    };

    // Show loading state while checking authentication
    if (isChecking) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // If authenticated, render the app
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // Show passcode gate
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Investment Proposal Generator
                        </h1>
                        <p className="text-gray-600 text-sm">
                            Please enter your access code to continue
                        </p>
                    </div>

                    {/* Passcode Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label 
                                htmlFor="passcode" 
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Access Code
                            </label>
                            <input
                                id="passcode"
                                type="password"
                                value={passcode}
                                onChange={(e) => {
                                    setPasscode(e.target.value);
                                    setError(''); // Clear error on input change
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest font-mono"
                                placeholder="Enter access code"
                                autoFocus
                                autoComplete="off"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                <p className="text-sm text-red-800">
                                    {error.includes('mnicholson@auour.com') ? (
                                        <>
                                            Access Restricted. Please contact{' '}
                                            <a 
                                                href="mailto:mnicholson@auour.com" 
                                                className="text-blue-600 hover:text-blue-800 underline font-medium"
                                            >
                                                Mac Nicholson at mnicholson@auour.com
                                            </a>
                                            {' '}for authorization.
                                        </>
                                    ) : (
                                        error
                                    )}
                                </p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm"
                        >
                            Access Application
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500">
                            Secure access required
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasscodeGate;


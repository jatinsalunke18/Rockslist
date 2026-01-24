import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { loginWithGoogle, setupRecaptcha, loginWithPhone } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setupRecaptcha('recaptcha-container');
    }, [setupRecaptcha]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const formattedPhone = `+91${phoneNumber}`;
            const result = await loginWithPhone(formattedPhone);
            setConfirmationResult(result);
            setShowOtp(true);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleVerifyOtp = async () => {
        setError('');
        setLoading(true);
        try {
            await confirmationResult.confirm(otp);
            // Auth state changes, App redirects
        } catch (err) {
            setError('Invalid OTP');
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="logo-text-large">Rockslist</div>
                <p className="auth-subtitle">Sign in to continue</p>

                <form className="auth-form" onSubmit={handleSendOtp}>
                    {!showOtp ? (
                        <>
                            <div className="phone-input-group">
                                <span className="country-code">+91</span>
                                <input
                                    type="tel"
                                    placeholder="Phone Number"
                                    required
                                    pattern="[0-9]{10}"
                                    maxLength="10"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                            </div>
                            <div id="recaptcha-container"></div>
                            <button type="submit" className="primary-btn" disabled={loading}>
                                {loading ? 'Sending...' : 'Continue'}
                            </button>
                        </>
                    ) : (
                        <div className="otp-container" style={{ marginTop: 16 }}>
                            <input
                                type="text"
                                placeholder="Enter OTP"
                                maxLength="6"
                                style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 700 }}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                            <button
                                type="button"
                                className="primary-btn"
                                style={{ marginTop: 12 }}
                                onClick={handleVerifyOtp}
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                        </div>
                    )}
                </form>

                <div className="divider">or</div>

                <button className="social-btn google-btn" onClick={handleGoogleLogin}>
                    <svg viewBox="0 0 24 24" width="20" height="20" className="google-icon">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 4.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                {error && <div className="error-text" style={{ color: 'red', marginTop: 10 }}>{error}</div>}
            </div>
        </div>
    );
}

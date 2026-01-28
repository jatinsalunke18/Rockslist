import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { loginWithGoogle, setupRecaptcha, clearRecaptcha, loginWithPhone, loginWithEmail, registerWithEmail } = useAuth();
    const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
    const [isSignup, setIsSignup] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (authMethod === 'phone') {
            setupRecaptcha('recaptcha-container');
        }
        return () => clearRecaptcha();
    }, [authMethod]);

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
            console.error('Phone Auth Error:', err);
            setError(err.message);
        }
        setLoading(false);
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isSignup) {
                await registerWithEmail(email, password);
            } else {
                await loginWithEmail(email, password);
            }
        } catch (err) {
            console.error('Email Auth Error:', err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email. Please sign up.');
            } else if (err.code === 'auth/wrong-password') {
                setError('Incorrect password.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please login.');
            } else {
                setError(err.message);
            }
        }
        setLoading(false);
    };

    const handleVerifyOtp = async () => {
        setError('');
        setLoading(true);
        try {
            await confirmationResult.confirm(otp);
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

                <div className="auth-tabs" style={{ display: 'flex', gap: 10, marginBottom: 20, background: 'var(--surface-light)', padding: 4, borderRadius: 12 }}>
                    <button
                        className={`tab-btn ${authMethod === 'phone' ? 'active' : ''}`}
                        onClick={() => { setAuthMethod('phone'); setShowOtp(false); setError(''); }}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: authMethod === 'phone' ? 'var(--primary)' : 'transparent', color: authMethod === 'phone' ? 'white' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
                    >
                        Phone
                    </button>
                    <button
                        className={`tab-btn ${authMethod === 'email' ? 'active' : ''}`}
                        onClick={() => { setAuthMethod('email'); setError(''); }}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: authMethod === 'email' ? 'var(--primary)' : 'transparent', color: authMethod === 'email' ? 'white' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
                    >
                        Email
                    </button>
                </div>

                {authMethod === 'phone' ? (
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
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12 }}
                                    onClick={() => setShowOtp(false)}
                                >
                                    Change Number
                                </button>
                            </div>
                        )}
                    </form>
                ) : (
                    <form className="auth-form" onSubmit={handleEmailAuth}>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <input
                                type="email"
                                placeholder="Email Address"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: 14 }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <input
                                type="password"
                                placeholder="Password"
                                required
                                minLength="6"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: 14 }}
                            />
                        </div>
                        <button type="submit" className="primary-btn" disabled={loading}>
                            {loading ? (isSignup ? 'Creating Account...' : 'Logging in...') : (isSignup ? 'Sign Up' : 'Login')}
                        </button>
                        <button
                            type="button"
                            className="secondary-btn"
                            style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}
                            onClick={() => setIsSignup(!isSignup)}
                        >
                            {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                        </button>
                    </form>
                )}

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

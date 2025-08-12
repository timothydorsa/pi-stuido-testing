import React, { useState } from 'react';
import { useAuth, AUTH_STATUS } from '../../contexts/AuthContext';
import './LoginForm.scss';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithProvider, status, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    try {
      await login(username, password);
    } catch (err) {
      // Error is handled by the AuthContext
      console.error('Login failed:', err);
    }
  };

  const isAuthenticating = status === AUTH_STATUS.AUTHENTICATING;

  return (
    <div className="pi-login-form">
      <div className="pi-login-container">
        <div className="pi-login-header">
          <h2>PI Studio Login</h2>
          <p>Connect to PI Hub instance</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isAuthenticating}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isAuthenticating}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="submit"
              className="login-button"
              disabled={isAuthenticating || !username || !password}
            >
              {isAuthenticating ? 'Authenticating...' : 'Login'}
            </button>
          </div>

          <div className="sso-buttons">
            <button
              type="button"
              className="sso-button google"
              onClick={() => loginWithProvider('google')}
              disabled={isAuthenticating}
            >
              Sign in with Google
            </button>
            <button
              type="button"
              className="sso-button microsoft"
              onClick={() => loginWithProvider('microsoft')}
              disabled={isAuthenticating}
            >
              Sign in with Microsoft
            </button>
            <button
              type="button"
              className="sso-button facebook"
              onClick={() => loginWithProvider('facebook')}
              disabled={isAuthenticating}
            >
              Sign in with Facebook
            </button>
          </div>
        </form>

        <div className="pi-login-footer">
          <p>PI Studio Testing - v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

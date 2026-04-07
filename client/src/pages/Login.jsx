import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaDiscord, FaLock, FaTelegramPlane, FaTwitter } from 'react-icons/fa';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

const loginProviders = [
  {
    name: 'Twitter',
    className: 'twitter',
    href: `${API_BASE_URL}/auth/twitter`,
    icon: FaTwitter,
  },
  {
    name: 'Discord',
    className: 'discord',
    href: `${API_BASE_URL}/auth/discord`,
    icon: FaDiscord,
  },
  {
    name: 'Telegram',
    className: 'telegram',
    href: `${API_BASE_URL}/auth/telegram`,
    icon: FaTelegramPlane,
  },
];

const Login = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    setErrorMessage(error ? decodeURIComponent(error) : '');
  }, [searchParams]);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="minimal-login">
      <div className="back-button" onClick={() => navigate('/')}>
        <FaArrowLeft />
      </div>

      <div className="login-title">
        <h2>Sign in with</h2>
        {errorMessage && <div className="login-error">{errorMessage}</div>}
      </div>

      <div className="social-networks">
        {loginProviders.map((provider) => {
          const Icon = provider.icon;

          return (
            <a
              key={provider.name}
              href={provider.href}
              className={`social-button ${provider.className}`}
            >
              <Icon className="social-icon" />
              <span>{provider.name}</span>
            </a>
          );
        })}
      </div>

      <div className="security-notice">
        <FaLock className="lock-icon" />
        <p>Secure authentication via OAuth</p>
      </div>

      <style jsx>{`
        .minimal-login {
          max-width: 100%;
          width: 100%;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
          position: relative;
        }

        .back-button {
          position: absolute;
          top: 1.5rem;
          left: 1.5rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--bg-card-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-color);
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background-color: var(--primary-color);
          color: black;
        }

        .login-title {
          margin-bottom: 2rem;
          text-align: center;
        }

        .login-title h2 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .login-error {
          background-color: rgba(231, 76, 60, 0.15);
          color: #e74c3c;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          margin-top: 1rem;
          text-align: center;
          font-size: 0.9rem;
        }

        .social-networks {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          max-width: 320px;
        }

        .social-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.9rem 1.5rem;
          border-radius: var(--radius-full);
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          font-size: 1rem;
          width: 100%;
          min-height: 50px;
        }

        .social-button:hover {
          transform: translateY(-2px);
        }

        .social-button.twitter {
          background-color: rgba(29, 161, 242, 0.15);
          color: #1DA1F2;
        }

        .social-button.discord {
          background-color: rgba(88, 101, 242, 0.15);
          color: #5865F2;
        }

        .social-button.telegram {
          background-color: rgba(34, 158, 217, 0.15);
          color: #229ED9;
        }

        .social-icon {
          font-size: 1.3rem;
        }

        .security-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 2.5rem;
          color: var(--text-color-muted);
          font-size: 0.85rem;
        }

        .lock-icon {
          font-size: 0.9rem;
        }

        @media (max-width: 480px) {
          .minimal-login {
            padding: 1rem;
            justify-content: flex-start;
            padding-top: 4rem;
          }

          .back-button {
            top: 1rem;
            left: 1rem;
            width: 36px;
            height: 36px;
            font-size: 0.9rem;
          }

          .login-title h2 {
            font-size: 1.5rem;
          }

          .social-networks {
            gap: 0.75rem;
          }

          .social-button {
            padding: 0.75rem 1.25rem;
            min-height: 46px;
            font-size: 0.95rem;
          }

          .social-icon {
            font-size: 1.2rem;
          }
        }

        @media (max-width: 360px) {
          .social-button {
            padding: 0.7rem 1rem;
            min-height: 44px;
            font-size: 0.9rem;
          }

          .social-icon {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;

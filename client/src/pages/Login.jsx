import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaTwitter, 
  FaFacebookF, 
  FaInstagram, 
  FaGoogle, 
  FaLinkedinIn,
  FaLock,
  FaArrowLeft
} from 'react-icons/fa';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://a88769ca175c.ngrok.app/api';

// Function to send Facebook token to backend
async function sendTokenToBackend(accessToken, loginFunction, navigateFunction) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://a88769ca175c.ngrok.app/api';
  try {
    console.log('[FB Login] Sending FB accessToken to backend...');
    const apiResponse = await fetch(`${API_BASE_URL}/auth/facebook/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken: accessToken }),
    });

    const data = await apiResponse.json();

    if (apiResponse.ok && data.token) {
      console.log('[FB Login] Backend validation successful. JWT received.');
      // Use the login function from context to store the token
      await loginFunction(data.token); 
      console.log('[FB Login] JWT stored via context. Navigating to dashboard...');
      // Navigate to dashboard
      navigateFunction('/dashboard'); 
    } else {
      console.error('[FB Login] Backend validation failed:', data.message);
      alert(`Facebook login error: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('[FB Login] Error sending token to backend:', error);
    alert('An error occurred during Facebook login.');
  }
}

const Login = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isFBReady, setFBReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Extract error message from URL if present
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  // Effect to listen for the custom 'fb-sdk-ready' event
  useEffect(() => {
    const handleFBReady = () => {
      console.log('[FB Login] Facebook SDK loaded and ready');
      setFBReady(true);
    };

    // Check if FB is already available (in case SDK is already loaded)
    if (window.FB) {
      console.log('[FB Login] FB already available when component loads');
      setFBReady(true);
    } else {
      console.log('[FB Login] Waiting for Facebook SDK to load...');
      // Listen for the event we created in index.html
      document.addEventListener('fb-sdk-ready', handleFBReady);
    }

    return () => {
      document.removeEventListener('fb-sdk-ready', handleFBReady);
    };
  }, []);

  // Function to trigger Facebook login when user clicks the button
  const handleFacebookLogin = () => {
    console.log('[FB Login] Facebook button clicked');
    
    if (!window.FB) {
      console.error('[FB Login] Facebook SDK is not loaded');
      alert('Facebook SDK is not loaded yet. Please try again in a moment.');
      return;
    }

    console.log('[FB Login] Calling FB.login()');
    window.FB.login(function(response) {
      console.log('[FB Login] FB.login() response:', response);
      
      if (response.status === 'connected') {
        console.log('[FB Login] Connection successful, sending token to backend');
        const accessToken = response.authResponse.accessToken;
        sendTokenToBackend(accessToken, login, navigate);
      } else {
        console.log('[FB Login] User cancelled login or error occurred');
      }
    }, {scope: 'public_profile,email'});
  };

  // Effect to setup global callback function (kept just in case)
  useEffect(() => {
    // Define checkLoginState on window to be accessible by onlogin
    window.checkLoginState = function() {
      // Check if FB is initialized
      if (typeof FB === 'undefined' || !FB) {
          console.error('Facebook SDK not loaded yet.');
          alert('Facebook SDK is not loaded yet. Please try again.');
          return;
      }
      
      FB.getLoginStatus(function(response) {
        console.log('[FB Login] Status Response:', response);
        if (response.status === 'connected') {
          console.log('[FB Login] Connected via FB. Sending token to backend.');
          // Pass login and navigate functions to sendTokenToBackend
          sendTokenToBackend(response.authResponse.accessToken, login, navigate);
        } else {
          console.log('[FB Login] User not connected via FB or not authorized.');
        }
      });
    }

    // Cleanup: remove global function when component unmounts
    return () => {
      delete window.checkLoginState;
    };
  }, [login, navigate]); 

  // If user is already authenticated and loading is finished, redirect to dashboard
  if (!isLoading && isAuthenticated) {
    console.log('[Login Page] User already authenticated. Redirecting to dashboard.');
    return <Navigate to="/dashboard" replace />;
  }

  // If authentication is being verified, show loading spinner
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
        {errorMessage && (
          <div className="login-error">
            {errorMessage}
          </div>
        )}
      </div>
      
      <div className="social-networks">
        {/* Google Button */}
        <a 
          href={`${API_BASE_URL}/auth/google`}
          className="social-button google"
        >
          <FaGoogle className="social-icon" />
          <span>Google</span>
        </a>
        
        {/* Twitter Button */}
        <a 
          href={`${API_BASE_URL}/auth/twitter`}
          className="social-button twitter"
        >
          <FaTwitter className="social-icon" />
          <span>Twitter</span>
        </a>
        
        {/* Facebook Button */}
        <button 
          className="social-button facebook"
          onClick={handleFacebookLogin}
          disabled={!isFBReady}
        >
          <FaFacebookF className="social-icon" />
          <span>Facebook</span>
        </button>
        
        {/* LinkedIn Button */}
        <a 
          href={`${API_BASE_URL}/auth/linkedin`}
          className="social-button linkedin"
        >
          <FaLinkedinIn className="social-icon" />
          <span>LinkedIn</span>
        </a>
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
        
        .social-button.google {
          background-color: rgba(219, 68, 55, 0.15);
          color: #DB4437;
        }
        
        .social-button.twitter {
          background-color: rgba(29, 161, 242, 0.15);
          color: #1DA1F2;
        }
        
        .social-button.facebook {
          background-color: rgba(24, 119, 242, 0.15);
          color: #1877F2;
        }
        
        .social-button.facebook:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .social-button.linkedin {
          background-color: rgba(0, 119, 181, 0.15);
          color: #0077B5;
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
        
        /* Mobile optimizations */
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
        
        /* Very small screens */
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
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 70px)',
    padding: '2rem',
    backgroundColor: '#f8fafe',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(0, 20, 50, 0.06)',
    padding: '2.5rem',
    textAlign: 'center',
    maxWidth: '450px',
    width: '100%',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '1rem',
  },
  message: {
    fontSize: '1rem',
    color: '#6c757d',
    marginBottom: '2rem',
    lineHeight: '1.5',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(74, 134, 232, 0.1)',
    borderRadius: '50%',
    borderTop: '3px solid #4a86e8',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1.5rem',
  },
  success: {
    backgroundColor: '#8fcea0',
    color: '#155724',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    margin: '0 auto 1.5rem',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    margin: '0 auto 1.5rem',
  }
};

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const loginAttempted = useRef(false);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Traitement de l\'authentification...');

  useEffect(() => {
    // Évite d'exécuter la logique de connexion plusieurs fois
    if (loginAttempted.current) {
      return;
    }

    const token = searchParams.get('token');
    const error = searchParams.get('error');

    console.log('[AuthCallback] Component mounted. Query params:', { token: token ? 'Present' : 'Absent', error });

    const handleAuthentication = async () => {
      try {
        if (error) {
          console.error(`[AuthCallback] Authentication failed: ${error}`);
          setStatus('error');
          setMessage('L\'authentification a échoué. Veuillez réessayer.');
          loginAttempted.current = true;
          
          // Rediriger vers la page de connexion après un court délai
          setTimeout(() => {
            navigate(`/login?error=${error}`);
          }, 2000);
          return;
        }

        if (token) {
          console.log('[AuthCallback] Token found, attempting login...');
          await login(token); // Met à jour le contexte avec le nouveau token
          loginAttempted.current = true;
          
          // Afficher le succès avant de rediriger
          setStatus('success');
          setMessage('Connexion réussie ! Redirection vers votre tableau de bord...');
          
          // Rediriger vers la page principale après la connexion
          setTimeout(() => {
            console.log('[AuthCallback] Redirecting to dashboard...');
            navigate('/dashboard');
          }, 1500);
        } else {
          console.warn('[AuthCallback] No token found in URL, redirecting to login.');
          setStatus('error');
          setMessage('Aucun token d\'authentification trouvé. Redirection vers la page de connexion...');
          loginAttempted.current = true;
          
          // Rediriger vers la page de connexion après un court délai
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } catch (error) {
        console.error('[AuthCallback] Error during authentication:', error);
        setStatus('error');
        setMessage('Une erreur est survenue lors de l\'authentification. Veuillez réessayer.');
        
        // Rediriger vers la page de connexion après un court délai
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    };

    handleAuthentication();
  }, [searchParams, login, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {status === 'loading' && (
          <div className="loading-spinner" style={styles.spinner}></div>
        )}
        {status === 'success' && <div style={styles.success}>✓</div>}
        {status === 'error' && <div style={styles.error}>×</div>}
        
        <h1 style={styles.title}>
          {status === 'loading' && 'Authentification en cours'}
          {status === 'success' && 'Authentification réussie'}
          {status === 'error' && 'Erreur d\'authentification'}
        </h1>
        
        <p style={styles.message}>{message}</p>
      </div>
    </div>
  );
}

export default AuthCallback;
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaCheck, FaInfoCircle, FaShieldAlt, FaLink, FaUnlink } from 'react-icons/fa';
import { Coins } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');

  // PRISM Daily Reward state
  const [prismRewardStatus, setPrismRewardStatus] = useState({
    canClaim: true,
    hoursLeft: 0,
    minutesLeft: 0,
    loading: false
  });

  // Get token from localStorage
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

  // Fetch PRISM reward status on mount
  useEffect(() => {
    if (token) {
      axios.get(`${API_BASE_URL}/users/prism-reward-status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(({ data }) => {
          if (data.success) {
            setPrismRewardStatus({
              canClaim: data.canClaim,
              hoursLeft: data.hoursLeft || 0,
              minutesLeft: data.minutesLeft || 0,
              loading: false
            });
          }
        })
        .catch(err => {
          console.error("Error fetching PRISM reward status:", err);
        });
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    console.error('[Dashboard] User data is missing after loading.');
    return (
      <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div className="badge badge-error" style={{ margin: '0 auto 1rem' }}>Error</div>
        <h2>Unable to load user data</h2>
        <p>Please try refreshing the page or logging in again.</p>
      </div>
    );
  }

  const getAvatar = () => {
    if (user.social?.google?.photos?.[0]?.value) return user.social.google.photos[0].value;
    if (user.social?.twitter?.photos?.[0]?.value) return user.social.twitter.photos[0].value;
    return 'https://api.dicebear.com/7.x/identicon/svg?seed=' + user.id; // Generate identicon as fallback
  };

  const avatarUrl = getAvatar();

  // Count verified social accounts
  const connectedAccountsCount = Object.keys(user.social || {}).length || 0;
  const totalPossibleAccounts = 5; // Google, Facebook, Twitter, Instagram, LinkedIn
  const accountVerificationPercentage = Math.round((connectedAccountsCount / totalPossibleAccounts) * 100);

  return (
    <div className="dashboard">
      {/* Welcome Card */}
      <div className="card-highlight mb-md">
        <div className="user-profile">
          <div className="user-avatar" style={{ width: '60px', height: '60px' }}>
            <img src={avatarUrl} alt="User avatar" className="avatar-image" />
          </div>
          <div className="user-info">
            <h1 className="user-name">{user.name || 'User'}</h1>
            <p className="user-status">Your identity dashboard</p>
          </div>
        </div>
      </div>

      {/* PRISM Daily Reward Card - AT TOP */}
      <div className="prism-reward-card mb-md">
        <div className="prism-reward-content">
          <div className="prism-reward-icon">
            <Coins size={24} />
          </div>
          <div className="prism-reward-text">
            <h4>Daily Bonus: +100 UMI</h4>
            <p>Open PRISM app and do a first trade to receive 100 UMI tokens</p>
          </div>
          <button
            className={`prism-claim-btn ${!prismRewardStatus.canClaim ? 'disabled' : ''}`}
            onClick={async () => {
              if (!prismRewardStatus.canClaim || prismRewardStatus.loading) return;

              // Set loading immediately to prevent double clicks
              setPrismRewardStatus(prev => ({ ...prev, loading: true, canClaim: false }));

              // Open PRISM app
              window.open('https://world.org/mini-app?app_id=app_df74242b069963d3e417258717ab60e7', '_blank');

              // Claim reward
              try {
                console.log('[PRISM] Claiming reward with token:', token ? 'Present' : 'Missing');
                const response = await axios.post(
                  `${API_BASE_URL}/users/claim-prism-reward`,
                  {},
                  { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );

                console.log('[PRISM] API Response:', response.data);

                if (response.data.success) {
                  setNotificationMessage(`🎉 ${response.data.message}`);
                  setNotificationType('success');
                  setShowNotification(true);
                  setTimeout(() => setShowNotification(false), 3000);
                  setPrismRewardStatus({
                    canClaim: false,
                    hoursLeft: 23,
                    minutesLeft: 59,
                    loading: false
                  });
                } else {
                  setNotificationMessage(response.data.message || 'Reward claimed!');
                  setNotificationType('info');
                  setShowNotification(true);
                  setTimeout(() => setShowNotification(false), 3000);
                  setPrismRewardStatus(prev => ({ ...prev, loading: false, canClaim: false }));
                }
              } catch (err) {
                console.error('[PRISM] Error claiming reward:', err);
                const errData = err.response?.data;
                if (errData?.alreadyClaimed) {
                  setPrismRewardStatus({
                    canClaim: false,
                    hoursLeft: errData.hoursLeft || 0,
                    minutesLeft: errData.minutesLeft || 0,
                    loading: false
                  });
                  setNotificationMessage(`Already claimed! Next in ${errData.hoursLeft}h ${errData.minutesLeft}m`);
                  setNotificationType('info');
                  setShowNotification(true);
                  setTimeout(() => setShowNotification(false), 3000);
                } else {
                  setNotificationMessage(errData?.message || 'Error claiming reward. Please try again.');
                  setNotificationType('error');
                  setShowNotification(true);
                  setTimeout(() => setShowNotification(false), 3000);
                  // Re-enable button on error
                  setPrismRewardStatus(prev => ({ ...prev, loading: false, canClaim: true }));
                }
              }
            }}
            disabled={!prismRewardStatus.canClaim || prismRewardStatus.loading}
          >
            {prismRewardStatus.loading ? (
              <span>Claiming...</span>
            ) : prismRewardStatus.canClaim ? (
              <span>Open PRISM & Claim</span>
            ) : (
              <span>{prismRewardStatus.hoursLeft}h {prismRewardStatus.minutesLeft}m</span>
            )}
          </button>
        </div>
      </div>

      {/* 1111 WLD Giveaway Card */}
      <div className="giveaway-card mb-md">
        <div className="giveaway-content">
          <div className="giveaway-icon">
            🎁
          </div>
          <div className="giveaway-text">
            <h4>1111 WLD Giveaway</h4>
            <p>Participate now and win your share of 1111 WLD!</p>
          </div>
          <button
            className="giveaway-btn"
            onClick={() => {
              window.open('https://world.org/mini-app?app_id=app_04be5c0d2752633311de641688a4c72b&path=%2Fgiveaway', '_blank');
            }}
          >
            <span>Participate</span>
          </button>
        </div>
      </div>

      {/* Connected Accounts Card */}
      <div className="card mb-md">
        <h2>Connected Accounts</h2>
        <div className="accounts-progress">
          <div className="progress-label">
            <span>{connectedAccountsCount}/{totalPossibleAccounts} connected</span>
            <span>{accountVerificationPercentage}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${accountVerificationPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="accounts-mobile-list">
          {/* Google Account */}
          <SocialAccountCard
            name="Google"
            icon="google"
            isConnected={!!user.social?.google}
            apiUrl={`${API_BASE_URL}/auth/google`}
          />

          {/* Facebook Account */}
          <SocialAccountCard
            name="Facebook"
            icon="facebook"
            isConnected={!!user.social?.facebook}
            apiUrl={`${API_BASE_URL}/auth/facebook`}
          />

          {/* Twitter Account */}
          <SocialAccountCard
            name="Twitter"
            icon="twitter"
            isConnected={!!user.social?.twitter}
            apiUrl={`${API_BASE_URL}/auth/twitter`}
          />

          {/* Instagram Account */}
          <SocialAccountCard
            name="Instagram"
            icon="instagram"
            isConnected={!!user.social?.instagram}
            apiUrl={`${API_BASE_URL}/auth/instagram`}
          />

          {/* LinkedIn Account */}
          <SocialAccountCard
            name="LinkedIn"
            icon="linkedin"
            isConnected={!!user.social?.linkedin}
            apiUrl={`${API_BASE_URL}/auth/linkedin`}
          />
        </div>
      </div>

      {/* Data Privacy Card */}
      <div className="card">
        <div className="card-header">
          <FaInfoCircle className="info-icon" />
          <h2>Data Privacy</h2>
        </div>
        <p className="privacy-text">
          Your data is secure and never shared without your consent.
        </p>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="notification">
          {notificationMessage}
        </div>
      )}

      <style>{`
        .dashboard {
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 1.5rem;
        }
        
        .accounts-progress {
          margin: 1rem 0;
        }
        
        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-color-muted);
        }
        
        .progress-bar {
          height: 6px;
          background-color: var(--bg-card-secondary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: var(--gradient-primary);
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }
        
        .accounts-mobile-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .user-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-size: 1.5rem;
          margin: 0;
        }
        
        .user-status {
          color: var(--text-color-muted);
          font-size: 0.9rem;
        }
        
        .avatar-image {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        
        .privacy-text {
          font-size: 0.9rem;
          line-height: 1.4;
        }
        
        .notification {
          position: fixed;
          bottom: 70px;
          left: 0;
          right: 0;
          background-color: var(--bg-card-secondary);
          color: var(--primary-color);
          text-align: center;
          padding: 0.75rem;
          z-index: 1001;
          border-top: 1px solid var(--border-color);
          font-size: 0.9rem;
        }
        
        /* PRISM Daily Reward Card - Minimalist */
        .prism-reward-card {
          width: 100%;
          background: rgba(48, 52, 33, 0.04);
          border: 1px solid rgba(48, 52, 33, 0.1);
          border-radius: 10px;
          padding: 0.875rem;
          margin-top: 0.75rem;
        }
        
        .prism-reward-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .prism-reward-icon {
          width: 40px;
          height: 40px;
          background: rgba(242, 128, 17, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f28011;
          flex-shrink: 0;
        }
        
        .prism-reward-text {
          flex: 1;
          min-width: 0;
        }
        
        .prism-reward-text h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-color, #303421);
        }
        
        .prism-reward-text p {
          margin: 0.2rem 0 0;
          font-size: 0.72rem;
          color: var(--text-color-muted, rgba(48, 52, 33, 0.6));
          line-height: 1.3;
        }
        
        .prism-claim-btn {
          padding: 0.45rem 0.9rem;
          background: rgba(242, 128, 17, 0.1);
          color: #f28011;
          border: 1px solid rgba(242, 128, 17, 0.2);
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        
        .prism-claim-btn:hover:not(.disabled) {
          background: rgba(242, 128, 17, 0.15);
        }
        
        .prism-claim-btn.disabled {
          background: rgba(48, 52, 33, 0.05);
          color: rgba(48, 52, 33, 0.4);
          border-color: rgba(48, 52, 33, 0.1);
          cursor: not-allowed;
        }
        
        /* 1111 WLD Giveaway Card - Minimalist */
        .giveaway-card {
          width: 100%;
          background: rgba(48, 52, 33, 0.04);
          border: 1px solid rgba(48, 52, 33, 0.1);
          border-radius: 10px;
          padding: 0.875rem;
          margin-top: 0.75rem;
        }
        
        .giveaway-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .giveaway-icon {
          width: 40px;
          height: 40px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        
        .giveaway-text {
          flex: 1;
          min-width: 0;
        }
        
        .giveaway-text h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-color, #303421);
        }
        
        .giveaway-text p {
          margin: 0.2rem 0 0;
          font-size: 0.72rem;
          color: var(--text-color-muted, rgba(48, 52, 33, 0.6));
          line-height: 1.3;
        }
        
        .giveaway-btn {
          padding: 0.45rem 0.9rem;
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        
        .giveaway-btn:hover {
          background: rgba(99, 102, 241, 0.15);
        }
        
        @media (max-width: 480px) {
          .accounts-mobile-list {
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

const SocialAccountCard = ({ name, icon, isConnected, apiUrl }) => {
  const initiateAuth = () => {
    window.location.href = apiUrl;
  };

  return (
    <div className={`social-account-card ${isConnected ? 'connected' : ''}`}>
      <div className={`social-icon social-${icon.toLowerCase()}`}>
        <i className={`icon-${icon.toLowerCase()}`}></i>
      </div>
      <div className="social-info">
        <h3>{name}</h3>
        <p>{isConnected ? 'Connected' : 'Not Connected'}</p>
      </div>
      {isConnected ? (
        <div className="social-status connected">
          <FaLink /> <span className="status-text">Connected</span>
        </div>
      ) : (
        <button className="btn btn-outline btn-connect" onClick={initiateAuth}>
          Connect
        </button>
      )}

      <style jsx>{`
        .social-account-card {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          background-color: var(--bg-card-secondary);
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
          position: relative;
        }
        
        .social-account-card.connected {
          border-left: 3px solid var(--success-color);
        }
        
        .social-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }
        
        .social-info {
          flex: 1;
          min-width: 0;
        }
        
        .social-info h3 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 500;
        }
        
        .social-info p {
          color: var(--text-color-muted);
          font-size: 0.8rem;
          margin: 0;
        }
        
        .social-status {
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          color: var(--success-color);
        }
        
        .status-text {
          margin-left: 0.25rem;
          display: none;
        }
        
        .btn-connect {
          padding: 0.4rem 0.75rem;
          font-size: 0.8rem;
          min-height: 32px;
        }
        
        @media (min-width: 481px) {
          .status-text {
            display: inline;
          }
          
          .social-account-card {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
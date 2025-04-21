import React, { useState, useEffect } from 'react';
import { FaTwitter, FaInstagram, FaDiscord, FaFacebook, FaLinkedin, FaYoutube, FaTelegram, FaGoogle, FaTiktok, FaCoins, FaCalendarAlt, FaUserFriends, FaWallet, FaCheck, FaEnvelope } from 'react-icons/fa';
import { apiClient } from '../context/AuthContext';

const DetailedUserProfile = ({ user, onClose, onOpenChat }) => {
  const [detailedUser, setDetailedUser] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch more complete user data if we only have basic info
        if (user && user.id) {
          try {
            const userRes = await apiClient.get(`/users/${user.id}/profile`);
            if (userRes.data) {
              setDetailedUser(userRes.data);
            } else {
              setDetailedUser(user); // Use the data we already have
            }
          } catch (err) {
            console.error('Error fetching user details:', err);
            setDetailedUser(user); // Fallback to existing data
          }
        }
        
        // Fetch token balance if wallet address is available
        if (user && (user.walletAddress || (detailedUser && detailedUser.walletAddress))) {
          try {
            const walletAddress = user.walletAddress || detailedUser.walletAddress;
            const balanceRes = await apiClient.get(`/users/token-balance/${walletAddress}`);
            if (balanceRes.data && balanceRes.data.status === "success") {
              setTokenBalance(balanceRes.data.balance);
            }
          } catch (balanceErr) {
            console.error('Error fetching token balance:', balanceErr);
          }
        }
      } catch (error) {
        console.error('Error in fetchUserDetails:', error);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserDetails();
    }
  }, [user]);

  // Use either detailed data or original user data
  const userData = detailedUser || user;

  if (!userData) return null;

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Get social networks that user has connected
  const getSocialNetworks = () => {
    if (!userData.social) return [];
    
    const networks = [];
    
    if (userData.social.twitter && userData.social.twitter.id) {
      networks.push({
        name: 'Twitter',
        icon: <FaTwitter />,
        username: userData.social.twitter.username,
        followers: userData.social.twitter.followersCount,
        following: userData.social.twitter.followingCount,
        verified: userData.social.twitter.verified,
        color: '#1DA1F2'
      });
    }
    
    if (userData.social.instagram && userData.social.instagram.id) {
      networks.push({
        name: 'Instagram',
        icon: <FaInstagram />,
        username: userData.social.instagram.username,
        followers: userData.social.instagram.followersCount,
        following: userData.social.instagram.followingCount,
        verified: userData.social.instagram.verified,
        color: '#E1306C'
      });
    }
    
    if (userData.social.discord && userData.social.discord.id) {
      networks.push({
        name: 'Discord',
        icon: <FaDiscord />,
        username: userData.social.discord.username,
        color: '#5865F2'
      });
    }
    
    if (userData.social.facebook && userData.social.facebook.id) {
      networks.push({
        name: 'Facebook',
        icon: <FaFacebook />,
        username: userData.social.facebook.username || userData.social.facebook.name,
        followers: userData.social.facebook.friendsCount,
        color: '#1877F2'
      });
    }
    
    if (userData.social.linkedin && userData.social.linkedin.id) {
      networks.push({
        name: 'LinkedIn',
        icon: <FaLinkedin />,
        username: userData.social.linkedin.username,
        connections: userData.social.linkedin.connectionCount,
        color: '#0A66C2'
      });
    }
    
    if (userData.social.youtube && userData.social.youtube.id) {
      networks.push({
        name: 'YouTube',
        icon: <FaYoutube />,
        username: userData.social.youtube.username,
        subscribers: userData.social.youtube.subscriberCount,
        videos: userData.social.youtube.videoCount,
        verified: userData.social.youtube.verified,
        color: '#FF0000'
      });
    }
    
    if (userData.social.telegram && userData.social.telegram.id) {
      networks.push({
        name: 'Telegram',
        icon: <FaTelegram />,
        username: userData.social.telegram.username,
        color: '#0088cc'
      });
    }
    
    if (userData.social.google && userData.social.google.id) {
      networks.push({
        name: 'Google',
        icon: <FaGoogle />,
        email: userData.social.google.email,
        color: '#4285F4'
      });
    }
    
    if (userData.social.tiktok && userData.social.tiktok.id) {
      networks.push({
        name: 'TikTok',
        icon: <FaTiktok />,
        username: userData.social.tiktok.username,
        followers: userData.social.tiktok.followersCount,
        following: userData.social.tiktok.followingCount,
        verified: userData.social.tiktok.verified,
        color: '#000000'
      });
    }
    
    return networks;
  };
  
  const socialNetworks = getSocialNetworks();
  
  // Get verification status badges
  const getVerifications = () => {
    if (!userData.socialVerifications) return [];
    
    const verifications = [];
    for (const [provider, data] of Object.entries(userData.socialVerifications)) {
      if (data.verified) {
        verifications.push(provider);
      }
    }
    
    return verifications;
  };
  
  const verifications = getVerifications();

  return (
    <div className="friend-detail-sheet">
      <div className="sheet-handle" onClick={onClose}></div>
      <div className="detail-content">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button className="btn-primary" onClick={onClose}>Go Back</button>
          </div>
        ) : (
          <div className="detail-header">
            {/* Profile Hero Section */}
            <div className="hero">
              <img 
                src={userData.avatar || userData.social?.twitter?.profileImageUrl || userData.social?.instagram?.profileImageUrl || 'https://via.placeholder.com/120'} 
                alt={userData.name} 
                className="avatar-xl" 
              />
              {userData.verified && (
                <div className="verified-badge">
                  <FaCheck />
                </div>
              )}
            </div>
            
            {/* User Identification */}
            <h2>{userData.name}</h2>
            <div className="username">@{userData.username}</div>
            
            {/* Wallet Address & Join Date */}
            <div className="user-metadata">
              {userData.walletAddress && (
                <div className="metadata-item">
                  <FaWallet className="metadata-icon" />
                  <span className="metadata-value">
                    {`${userData.walletAddress.substring(0, 6)}...${userData.walletAddress.substring(userData.walletAddress.length - 4)}`}
                  </span>
                </div>
              )}
              {userData.createdAt && (
                <div className="metadata-item">
                  <FaCalendarAlt className="metadata-icon" />
                  <span className="metadata-value">Joined {formatDate(userData.createdAt)}</span>
                </div>
              )}
            </div>
            
            {/* User Stats Section */}
            <div className="quick-stats">
              <div className="stat">
                <div className="stat-value">{tokenBalance ? parseFloat(tokenBalance).toFixed(2) : '0'}</div>
                <div className="stat-label">UMI Balance</div>
              </div>
              <div className="stat">
                <div className="stat-value">{userData.dailyLogin?.maxStreak || 0}</div>
                <div className="stat-label">Max Streak</div>
              </div>
              <div className="stat">
                <div className="stat-value">{userData.friends?.length || 0}</div>
                <div className="stat-label">Friends</div>
              </div>
            </div>
            
            {/* Verification Badges */}
            {verifications.length > 0 && (
              <div className="verification-section">
                <h3 className="section-title">Verified On</h3>
                <div className="verification-badges">
                  {verifications.map(provider => (
                    <div key={provider} className="verification-badge">
                      {provider === 'twitter' && <FaTwitter />}
                      {provider === 'discord' && <FaDiscord />}
                      {provider === 'instagram' && <FaInstagram />}
                      {provider === 'facebook' && <FaFacebook />}
                      {provider === 'telegram' && <FaTelegram />}
                      <span>{provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Social Networks Section */}
            {socialNetworks.length > 0 && (
              <div className="social-section">
                <h3 className="section-title">Social Accounts</h3>
                <div className="socials">
                  {socialNetworks.map(network => (
                    <div key={network.name} className="social-card">
                      <div className="social-header" style={{ backgroundColor: network.color }}>
                        {network.icon}
                        <span>{network.name}</span>
                      </div>
                      <div className="social-body">
                        <div className="social-username">
                          {network.username ? `@${network.username}` : network.email}
                        </div>
                        
                        {network.followers && (
                          <div className="social-stat">
                            <span className="stat-label">Followers:</span>
                            <span className="stat-value">{network.followers.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {network.following && (
                          <div className="social-stat">
                            <span className="stat-label">Following:</span>
                            <span className="stat-value">{network.following.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {network.connections && (
                          <div className="social-stat">
                            <span className="stat-label">Connections:</span>
                            <span className="stat-value">{network.connections.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {network.subscribers && (
                          <div className="social-stat">
                            <span className="stat-label">Subscribers:</span>
                            <span className="stat-value">{network.subscribers.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {network.videos && (
                          <div className="social-stat">
                            <span className="stat-label">Videos:</span>
                            <span className="stat-value">{network.videos.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {network.verified && (
                          <div className="social-verified">
                            <FaCheck /> Verified
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Actions Section */}
            <div className="actions">
              <button className="btn-primary" onClick={() => onOpenChat(userData)}>
                <FaEnvelope /> Chat
              </button>
              <button className="btn-outline">
                <FaUserFriends /> Remove Friend
              </button>
              <button className="btn-outline send-umi">
                <FaCoins /> Send UMI
              </button>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .friend-detail-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 90vh;
          background-color: white;
          border-top-left-radius: 32px;
          border-top-right-radius: 32px;
          z-index: 100;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
          transform-origin: bottom;
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          max-width: 100%;
          width: 100%;
          overflow-x: hidden;
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        .sheet-handle {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 4px;
          background-color: rgba(48, 52, 33, 0.2);
          border-radius: 2px;
        }
        
        .detail-content {
          height: 100%;
          padding: 32px 24px;
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
        }
        
        .detail-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 100%;
        }
        
        .hero {
          position: relative;
          margin-bottom: 24px;
        }
        
        .avatar-xl {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 3px solid #feb53d; /* Gold accent */
          box-shadow: 0 0 0 8px rgba(241, 100, 3, 0.1);
          object-fit: cover;
        }
        
        .verified-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #4BB543;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          border: 2px solid white;
        }
        
        .detail-header h2 {
          margin-bottom: 4px;
          color: #303421; /* Olive text */
          font-size: 24px;
        }
        
        .username {
          font-size: 16px;
          color: rgba(48, 52, 33, 0.7);
          margin-bottom: 16px;
        }
        
        .user-metadata {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .metadata-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: rgba(48, 52, 33, 0.8);
        }
        
        .metadata-icon {
          color: #f16403; /* Orange accent */
        }
        
        .quick-stats {
          display: flex;
          justify-content: space-around;
          width: 100%;
          margin: 20px 0;
          background-color: rgba(241, 100, 3, 0.05);
          border-radius: 16px;
          padding: 16px 8px;
        }
        
        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }
        
        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #f16403; /* Orange accent */
        }
        
        .stat-label {
          font-size: 14px;
          color: rgba(48, 52, 33, 0.7);
        }
        
        .section-title {
          width: 100%;
          text-align: left;
          margin: 24px 0 12px 0;
          font-size: 18px;
          color: #303421; /* Olive text */
          font-weight: 600;
        }
        
        .verification-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-bottom: 12px;
        }
        
        .verification-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background-color: #f4e9b7; /* Sandish background */
          border-radius: 20px;
          font-size: 14px;
        }
        
        .verification-badge svg {
          color: #f16403; /* Orange accent */
        }
        
        .socials {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        
        .social-card {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .social-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          color: white;
          font-weight: 600;
        }
        
        .social-body {
          padding: 12px 16px;
          background-color: white;
        }
        
        .social-username {
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .social-stat {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .social-verified {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #4BB543;
          margin-top: 8px;
        }
        
        .actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          margin-top: 24px;
          padding-bottom: 40px;
        }
        
        .btn-primary {
          padding: 12px 24px;
          background: linear-gradient(to right, #f16403, #feb53d); /* Orange to gold gradient */
          border: none;
          border-radius: 20px; /* Pill shape */
          color: white;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .btn-outline {
          padding: 12px 24px;
          background: transparent;
          border: 1px solid #303421; /* Olive border */
          border-radius: 20px; /* Pill shape */
          color: #303421; /* Olive text */
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .send-umi {
          border-color: #f16403; /* Orange accent */
          color: #f16403; /* Orange accent */
        }
        
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(241, 100, 3, 0.1);
          border-radius: 50%;
          border-top-color: #f16403;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .error-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          text-align: center;
          gap: 20px;
        }
        
        .error-message p {
          color: #d32f2f;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default DetailedUserProfile;
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FaShieldAlt, 
  FaTwitter, 
  FaFacebookF, 
  FaInstagram, 
  FaGoogle, 
  FaLinkedinIn,
  FaCheck,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaPencilAlt,
  FaUserShield
} from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://uman.onrender.com/api';

const Profile = () => {
  const { user, isLoading } = useAuth();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    bio: ''
  });

  const showNotificationMessage = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleEditProfile = () => {
    if (!isEditMode) {
      // Initialize form data with user data
      setFormData({
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        bio: user.bio || ''
      });
    } else {
      // Save changes
      showNotificationMessage('Profile updated successfully!');
    }
    
    setIsEditMode(!isEditMode);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    console.error('[Profile] User data is missing after loading.');
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

  // Calculate verification score based on connected accounts
  const socialAccountsCount = Object.keys(user.social || {}).length || 0;
  const verificationScore = Math.min(Math.round((socialAccountsCount * 20)), 100);

  const renderTabContent = () => {
    switch(activeTab) {
      case 'profile':
        return (
          <div className="profile-tab">
            {isEditMode ? (
              <div className="edit-form">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea 
                    className="form-input" 
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows="4"
                  ></textarea>
                </div>
              </div>
            ) : (
              <div className="profile-info">
                <div className="info-group">
                  <label>Name</label>
                  <p>{user.name || 'Not set'}</p>
                </div>
                
                <div className="info-group">
                  <label>Username</label>
                  <p>@{user.username || user.name?.toLowerCase().replace(/\s+/g, '') || 'username'}</p>
                </div>
                
                <div className="info-group">
                  <label>Email</label>
                  <p>{user.email || 'Not set'}</p>
                </div>
                
                <div className="info-group">
                  <label>Bio</label>
                  <p>{user.bio || 'No bio yet.'}</p>
                </div>
                <div className="info-group">
                  <label>Referral Code</label>
                  <p>{user.referralCode || 'Not set'}</p>
                </div>
              </div>
            )}
            
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleEditProfile}>
                {isEditMode ? (
                  <>Save Changes</>
                ) : (
                  <><FaPencilAlt style={{ marginRight: '0.5rem' }} /> Edit Profile</>
                )}
              </button>
              
              {isEditMode && (
                <button 
                  className="btn btn-outline" 
                  onClick={() => setIsEditMode(false)}
                  style={{ marginLeft: '1rem' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className="security-tab">
            <div className="card-highlight security-card">
              <div className="security-header">
                <FaUserShield size={24} />
                <h3>Identity Verification</h3>
              </div>
              <p>
                Your identity verification status helps ensure the authenticity of your presence across social platforms.
              </p>
              <div className="verification-score">
                <div className="score-label">
                  <span>Verification Score</span>
                  <span className="score-value">{verificationScore}%</span>
                </div>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ 
                      width: `${verificationScore}%`,
                      background: getScoreColor(verificationScore)
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="verification-details">
                <div className="verification-item">
                  <div className="verification-icon">
                    <FaKey />
                  </div>
                  <div className="verification-content">
                    <h4>Two-Factor Authentication</h4>
                    <p>Add an extra layer of security to your account</p>
                    <button className="btn btn-outline">
                      Setup 2FA
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card security-card">
              <div className="security-header">
                <FaEye size={24} />
                <h3>Privacy Controls</h3>
              </div>
              
              <div className="privacy-controls">
                <div className="privacy-control">
                  <div>
                    <h4>Profile Visibility</h4>
                    <p>Control who can see your profile information</p>
                  </div>
                  <select className="form-input">
                    <option>Public</option>
                    <option>Verified Only</option>
                    <option>Private</option>
                  </select>
                </div>
                
                <div className="privacy-control">
                  <div>
                    <h4>Social Accounts Visibility</h4>
                    <p>Control who can see your connected social accounts</p>
                  </div>
                  <select className="form-input">
                    <option>Public</option>
                    <option>Verified Only</option>
                    <option>Private</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'accounts':
        return (
          <div className="accounts-tab">
            <div className="accounts-header">
              <h3>Connected Social Accounts</h3>
              <p>Manage your connected social media accounts</p>
            </div>
            
            <div className="social-accounts">
              <SocialAccountItem 
                name="Twitter"
                icon={<FaTwitter />}
                iconColor="#1DA1F2"
                isConnected={!!user.social?.twitter}
                apiUrl={`${API_BASE_URL}/auth/twitter`}
              />
              
              <SocialAccountItem 
                name="Facebook"
                icon={<FaFacebookF />}
                iconColor="#1877F2"
                isConnected={!!user.social?.facebook}
                apiUrl={`${API_BASE_URL}/auth/facebook`}
              />
              
              <SocialAccountItem 
                name="Instagram"
                icon={<FaInstagram />}
                iconColor="#C13584"
                isConnected={!!user.social?.instagram}
                apiUrl={`${API_BASE_URL}/auth/instagram`}
              />
              
              <SocialAccountItem 
                name="Google"
                icon={<FaGoogle />}
                iconColor="#DB4437"
                isConnected={!!user.social?.google}
                apiUrl={`${API_BASE_URL}/auth/google`}
              />
              
              <SocialAccountItem 
                name="LinkedIn"
                icon={<FaLinkedinIn />}
                iconColor="#0077B5"
                isConnected={!!user.social?.linkedin}
                apiUrl={`${API_BASE_URL}/auth/linkedin`}
              />
            </div>
            
            <div className="privacy-note card-highlight" style={{ marginTop: '2rem', padding: '1rem' }}>
              <div className="flex items-center gap-sm">
                <FaEyeSlash />
                <strong>Privacy Note:</strong>
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                We only verify your identity with these accounts. We don't post, read your feeds, or access private data.
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header card-highlight">
        <div className="profile-avatar-container">
          <div className="user-avatar" style={{ width: '120px', height: '120px' }}>
            <img src={avatarUrl} alt="User avatar" className="avatar-image" />
          </div>
        </div>
        
        <div className="profile-title">
          <h1>{user.name || 'User Profile'}</h1>
          <p className="username">@{user.username || user.name?.toLowerCase().replace(/\s+/g, '') || 'username'}</p>
        </div>
      </div>
      
      {/* Profile Tabs */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
        <button 
          className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          Accounts
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {renderTabContent()}
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="notification">
          {notificationMessage}
        </div>
      )}
      
      <style>{`
        .profile-page {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .profile-header {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding: 2rem;
          margin-bottom: 2rem;
          position: relative;
        }
        
        .profile-avatar-container {
          position: relative;
        }
        
        .avatar-badge {
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: var(--success-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-card);
        }
        
        .profile-title h1 {
          margin-bottom: 0.25rem;
        }
        
        .username {
          color: var(--text-color-muted);
          font-size: 1.1rem;
        }
        
        .profile-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 2rem;
        }
        
        .tab-btn {
          padding: 1rem 1.5rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-color-muted);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .tab-btn:hover {
          color: var(--text-color);
        }
        
        .tab-btn.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }
        
        .tab-content {
          min-height: 300px;
        }
        
        /* Profile tab styles */
        .profile-info {
          margin-bottom: 2rem;
        }
        
        .info-group {
          margin-bottom: 1.5rem;
        }
        
        .info-group label {
          display: block;
          font-size: 0.9rem;
          color: var(--text-color-muted);
          margin-bottom: 0.25rem;
        }
        
        .info-group p {
          margin: 0;
          font-size: 1.1rem;
        }
        
        .action-buttons {
          margin-top: 2rem;
        }
        
        /* Security tab styles */
        .security-card {
          margin-bottom: 2rem;
        }
        
        .security-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .security-header h3 {
          margin: 0;
        }
        
        .verification-score {
          margin: 1.5rem 0;
        }
        
        .score-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .score-value {
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .score-bar {
          height: 8px;
          background-color: var(--bg-card-secondary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        
        .score-fill {
          height: 100%;
          transition: width 0.5s ease;
        }
        
        .verification-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .verification-item {
          display: flex;
          gap: 1rem;
          background-color: var(--bg-card-secondary);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          border: 1px solid var(--border-color);
        }
        
        .verification-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background-color: rgba(108, 99, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color);
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        
        .verification-content h4 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
        }
        
        .verification-content p {
          margin: 0 0 1rem;
          font-size: 0.9rem;
          color: var(--text-color-muted);
        }
        
        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          background-color: rgba(46, 204, 113, 0.15);
          color: var(--success-color);
          font-weight: 500;
        }
        
        .privacy-controls {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        
        .privacy-control {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        
        .privacy-control h4 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
        }
        
        .privacy-control p {
          margin: 0;
          font-size: 0.9rem;
          color: var(--text-color-muted);
        }
        
        .privacy-control select {
          width: 150px;
          padding: 0.5rem;
        }
        
        /* Accounts tab styles */
        .accounts-header {
          margin-bottom: 1.5rem;
        }
        
        .accounts-header h3 {
          margin-bottom: 0.5rem;
        }
        
        .accounts-header p {
          color: var(--text-color-muted);
        }
        
        .social-accounts {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
          
          .profile-tabs {
            overflow-x: auto;
            white-space: nowrap;
          }
          
          .tab-btn {
            padding: 1rem 0.75rem;
          }
          
          .privacy-control {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .privacy-control select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

const SocialAccountItem = ({ name, icon, iconColor, isConnected, apiUrl }) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  const handleDisconnect = () => {
    setIsDisconnecting(true);
    // Simulate API call
    setTimeout(() => {
      setIsDisconnecting(false);
    }, 1500);
  };
  
  return (
    <div className="social-account-item">
      <div className="account-icon" style={{ backgroundColor: `${iconColor}15` }}>
        <div style={{ color: iconColor }}>{icon}</div>
      </div>
      
      <div className="account-info">
        <h4>{name}</h4>
        <p>{isConnected ? 'Connected' : 'Not connected'}</p>
      </div>
      
      <div className="account-actions">
        {isConnected ? (
          <button 
            className="btn btn-outline disconnect-btn"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <a href={apiUrl} className="btn btn-outline connect-btn">
            Connect
          </a>
        )}
      </div>
      
      <style>{`
        .social-account-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          background-color: var(--bg-card-secondary);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }
        
        .social-account-item:hover {
          border-color: ${iconColor}40;
        }
        
        .account-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }
        
        .account-info {
          flex: 1;
        }
        
        .account-info h4 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
        }
        
        .account-info p {
          margin: 0;
          font-size: 0.9rem;
          color: ${isConnected ? iconColor : 'var(--text-color-muted)'};
          font-weight: ${isConnected ? '500' : 'normal'};
        }
        
        .disconnect-btn:hover {
          background-color: rgba(231, 76, 60, 0.15);
          border-color: var(--error-color);
          color: var(--error-color);
        }
        
        .connect-btn:hover {
          border-color: ${iconColor};
          color: ${iconColor};
        }
        
        @media (max-width: 576px) {
          .social-account-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .account-actions {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

// Helper function to determine color based on score
const getScoreColor = (score) => {
  if (score < 30) return 'linear-gradient(90deg, #ff416c, #ff4b2b)';
  if (score < 70) return 'linear-gradient(90deg, #f2c94c, #f2994a)';
  return 'linear-gradient(90deg, #00b09b, #96c93d)';
};

export default Profile;
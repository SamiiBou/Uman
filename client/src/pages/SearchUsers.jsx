import React, { useState, useEffect } from 'react';
import { FaSearch, FaCheck, FaTimes, FaTwitter, FaFacebookF, FaInstagram, FaGoogle, FaLinkedinIn } from 'react-icons/fa';
import { apiClient } from '../context/AuthContext';


const SearchUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSocial, setSelectedSocial] = useState('all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Friend connection states
  const [sentRequests, setSentRequests] = useState(new Set());
  const [friends, setFriends] = useState(new Set());

  // Fetch current user's connections (sent requests, friends)
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await apiClient.get('/users/connections');
        const { sent = [], friends: fr = [] } = res.data;
        setSentRequests(new Set(sent.map(u => u.id)));
        setFriends(new Set(fr.map(u => u.id)));
      } catch (err) {
        console.error('Error fetching connections:', err);
      }
    };
    fetchConnections();
  }, []);
  
  // Handler to send friend request
  const handleSendRequest = async (userId) => {
    try {
      await apiClient.post(`/users/${userId}/invite`);
      setSentRequests(prev => new Set(prev).add(userId));
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };
  
  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Add a delay to prevent excessive API calls while typing
        const delayDebounceFn = setTimeout(async () => {
          const response = await apiClient.get('/users/search', {
            params: {
              query: searchTerm,
              network: selectedSocial
            }
          });
          
          if (response.data.success) {
            setUsers(response.data.users);
          } else {
            console.error('API returned an error:', response.data.message);
          }
          setLoading(false);
        }, 500);
        
        return () => clearTimeout(delayDebounceFn);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };
    
    setLoading(true);
    fetchUsers();
  }, [searchTerm, selectedSocial]);

  // Users are already filtered from the API, so we use them directly
  const filteredUsers = users;

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSocialFilter = (social) => {
    setSelectedSocial(social);
  };

  return (
    <div className="search-page">
      <h1>Search Users</h1>
      
      {/* Search input */}
      <div className="search-container">
        <FaSearch className="search-icon" />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search by name or username..." 
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>
      
      {/* Social network filters */}
      <div className="filters">
        <button 
          className={`filter-btn ${selectedSocial === 'all' ? 'active' : ''}`}
          onClick={() => handleSocialFilter('all')}
        >
          All
        </button>
        
        <button 
          className={`filter-btn ${selectedSocial === 'twitter' ? 'active' : ''}`}
          onClick={() => handleSocialFilter('twitter')}
        >
          <FaTwitter /> Twitter
        </button>
        
        <button 
          className={`filter-btn ${selectedSocial === 'facebook' ? 'active' : ''}`}
          onClick={() => handleSocialFilter('facebook')}
        >
          <FaFacebookF /> Facebook
        </button>
        
        <button 
          className={`filter-btn ${selectedSocial === 'instagram' ? 'active' : ''}`}
          onClick={() => handleSocialFilter('instagram')}
        >
          <FaInstagram /> Instagram
        </button>
        
        <button 
          className={`filter-btn ${selectedSocial === 'google' ? 'active' : ''}`}
          onClick={() => handleSocialFilter('google')}
        >
          <FaGoogle /> Google
        </button>
        
        <button 
          className={`filter-btn ${selectedSocial === 'linkedin' ? 'active' : ''}`}
          onClick={() => handleSocialFilter('linkedin')}
        >
          <FaLinkedinIn /> LinkedIn
        </button>
      </div>
      
      {/* Results */}
      <div className="search-results">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Searching for users...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map(user => (
            <UserCard
              key={user.id}
              user={user}
              onSendRequest={handleSendRequest}
              isSent={sentRequests.has(user.id)}
              isFriend={friends.has(user.id)}
            />
          ))
        ) : (
          <div className="no-results">
            <h3>No users found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    
      <style>{`
        :root {
          --primary-color: #169236;
          --secondary-color: #c0ec97;
          --text-color: #ffffff;
          --text-color-muted: #aaaaaa;
          --bg-color: #0a0b0a;
          --bg-card: #151615;
          --bg-card-secondary: #1e201e;
          --border-color: #2a2c2a;
          --success-color: #169236;
          --error-color: #d32f2f;
          --radius-full: 9999px;
          --radius-lg: 8px;
          --space-lg: 1.5rem;
          --space-xl: 2rem;
        }
        
        body {
          background-color: var(--bg-color);
          color: var(--text-color);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        .search-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        
        h1 {
          margin-bottom: var(--space-xl);
          color: var(--primary-color);
          font-weight: 600;
        }
        
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: var(--space-xl);
        }
        
        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          color: var(--text-color);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .filter-btn:hover {
          background-color: var(--secondary-color);
          color: var(--primary-color);
          border-color: var(--secondary-color);
        }
        
        .filter-btn.active {
          background-color: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
          box-shadow: 0 0 8px rgba(22, 146, 54, 0.5);
        }
        
        .search-results {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .no-results {
          text-align: center;
          padding: 3rem;
          background-color: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }
        
        .no-results h3 {
          margin-bottom: 0.5rem;
          color: var(--primary-color);
        }
        
        .no-results p {
          color: var(--text-color-muted);
        }
        
        .search-container {
          position: relative;
          margin-bottom: var(--space-lg);
        }
        
        .search-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          background-color: var(--bg-card);
          color: var(--text-color);
          font-size: 1rem;
          transition: all 0.2s ease;
        }
        
        .search-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(22, 146, 54, 0.3);
          background-color: var(--bg-card-secondary);
        }
        
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--primary-color);
          font-size: 1.2rem;
        }
        
        .user-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border-radius: var(--radius-lg);
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }
        
        .user-card:hover {
          transform: translateY(-2px);
          border-color: var(--secondary-color);
          box-shadow: 0 4px 12px rgba(192, 236, 151, 0.2);
        }
        /* Friend request button container */
        .user-card-actions {
          display: flex;
          align-items: center;
          margin-left: auto;
        }
        /* Button styling for friend actions */
        .user-card-actions .btn {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
        }
        
        .user-card-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .user-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid var(--secondary-color);
        }
        
        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
        }
        
        .user-info h3 {
          margin: 0;
          font-size: 1.1rem;
          color: var(--primary-color);
        }
        
        .username {
          color: var(--text-color-muted);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        
        .user-socials {
          display: flex;
          gap: 0.5rem;
        }
        
        .social-badge {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.8rem;
          color: #fff;
          background-color: var(--primary-color);
        }
        
        .verification-status {
          font-size: 0.9rem;
          font-weight: 500;
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-full);
        }
        
        .verified {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          background-color: var(--success-color);
        }
        
        .not-verified {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-color-muted);
          background-color: var(--bg-card-secondary);
          border: 1px solid var(--border-color);
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background-color: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--secondary-color);
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 600px) {
          .user-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .verification-status {
            align-self: flex-start;
          }
        }
        
        @media (max-width: 768px) {
          .filters {
            overflow-x: auto;
            padding-bottom: 0.5rem;
            margin-bottom: var(--space-lg);
            flex-wrap: nowrap;
          }
          
          .filter-btn {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
};

const UserCard = ({ user, onSendRequest, isSent, isFriend }) => {
  const getSocialIcon = (network) => {
    switch (network) {
      case 'twitter': return <FaTwitter />;
      case 'facebook': return <FaFacebookF />;
      case 'instagram': return <FaInstagram />;
      case 'google': return <FaGoogle />;
      case 'linkedin': return <FaLinkedinIn />;
      default: return null;
    }
  };

  return (
    <div className="user-card">
      <div className="user-card-left">
        <div className="user-avatar">
          <img src={user.avatar} alt={`${user.name}'s avatar`} className="avatar-image" />
        </div>
        
        <div className="user-info">
          <h3>{user.name}</h3>
          <div className="username">@{user.username}</div>
          
          <div className="user-socials">
            {Object.entries(user.social).map(([network, isConnected]) => 
              isConnected && (
                <div key={network} className={`social-badge social-${network}`}>
                  {getSocialIcon(network)}
                </div>
              )
            )}
          </div>
        </div>
      </div>
      
      <div className={Object.values(user.social).filter(Boolean).length >= 2 ? "verification-status verified" : "verification-status not-verified"}>
        {Object.values(user.social).filter(Boolean).length >= 2 ? (
          <>
            <FaCheck /> Verified
          </>
        ) : (
          <>
            <FaTimes /> Not Verified
          </>
        )}
      </div>
      {/* Friend request action */}
      {onSendRequest && (
        <div className="user-card-actions">
          {isFriend ? (
            <button className="btn btn-outline" disabled>Friends</button>
          ) : isSent ? (
            <button className="btn btn-outline" disabled>Requested</button>
          ) : (
            <button className="btn btn-primary" onClick={() => onSendRequest(user.id)}>Add Friend</button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchUsers;
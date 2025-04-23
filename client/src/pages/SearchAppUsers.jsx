import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../context/AuthContext';
import { FaSearch, FaEnvelope, FaCoins, FaPlus, FaArrowLeft, FaEllipsisH, FaTwitter, FaTelegramPlane, FaDiscord, FaInstagram, FaFacebook, FaYoutube, FaLinkedin, FaCheckCircle, FaTrophy, FaCalendarAlt, FaWallet, FaCopy, FaTrash } from 'react-icons/fa';
import { ChevronLeft, User, UserCheck, Calendar, Award, Globe, Mail, MessageCircle, RefreshCw, Shield, Info, Copy, Check, Plus } from 'lucide-react';

// Composant FaX pour l'icône X (Twitter)
const FaX = () => (
  <svg 
    width="1em" 
    height="1em" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ marginTop: '1px' }}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const SearchAppUsers = () => {
  // Tab navigation state - Modified to set 'community' (formerly discover) as default
  const [activeTab, setActiveTab] = useState('community');
  
  // Core state from original component
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [friends, setFriends] = useState(new Set());
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friendDetailUser, setFriendDetailUser] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const { isAuthenticated, user: currentUser } = useAuth();
  // Normalize current user ID for comparisons (Mongoose returns _id)
  const currentUserId = currentUser?._id || currentUser?.id;
  const [friendsList, setFriendsList] = useState([]);
  
  // New state for enhanced profile
  const [umiBalance, setUmiBalance] = useState('0');
  const [userProfileDetails, setUserProfileDetails] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [justCopied, setJustCopied] = useState(false);
  // Added state for human verification
  const [isHumanVerified, setIsHumanVerified] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1); 
  const [totalPages, setTotalPages] = useState(1);
  
  // Verified Users (Community Tab) state
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [loadingVerified, setLoadingVerified] = useState(false);
  const [verifiedCurrentPage, setVerifiedCurrentPage] = useState(1);
  const [verifiedTotalPages, setVerifiedTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Fetch general users if needed
  const fetchUsers = async (page = 1, term = '') => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users/search-app', {
        params: {
          query: term,
          page,
          limit: ITEMS_PER_PAGE
        }
      });
      if (res.data.success) {
        setUsers(res.data.users); 
        setTotalPages(res.data.pagination.pages);
        setCurrentPage(res.data.pagination.page);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch Verified Users for Community Tab
  const fetchVerifiedUsers = async (page = 1, term = '') => {
    setLoadingVerified(true);
    try {
      const res = await apiClient.get('/users/verified', {
        params: {
          query: term,
          page,
          limit: ITEMS_PER_PAGE
        }
      });
      if (res.data.success) {
        setVerifiedUsers(res.data.users);
        setVerifiedTotalPages(res.data.pagination.pages);
        setVerifiedCurrentPage(res.data.pagination.page);
      }
    } catch (err) {
      console.error('Error fetching verified users:', err);
      setVerifiedUsers([]);
      setVerifiedTotalPages(1);
      setVerifiedCurrentPage(1);
    } finally {
      setLoadingVerified(false);
    }
  };

  // Handle search term changes for all tabs
  useEffect(() => {
    if (activeTab === 'community') {
      fetchVerifiedUsers(1, searchTerm);
      setVerifiedCurrentPage(1); // Reset to page 1 when search term changes
    } else {
      fetchUsers(1, searchTerm);
      setCurrentPage(1); // Reset to page 1 when search term changes
    }
  }, [searchTerm, activeTab]);
  
  // Update data when page changes
  useEffect(() => {
    if (activeTab !== 'community') {
      fetchUsers(currentPage, searchTerm);
    }
  }, [currentPage]);

  // Fetch verified users when community tab is active or its page changes
  useEffect(() => {
    if (activeTab === 'community') {
      fetchVerifiedUsers(verifiedCurrentPage, searchTerm);
    }
  }, [verifiedCurrentPage]);

  // Load user connections when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setSentRequests(new Set());
      setFriends(new Set());
      setReceivedRequests([]);
      setFriendsList([]);
      return;
    }
    const fetchConnections = async () => {
      try {
        const res = await apiClient.get('/users/connections');
        const { sent = [], received = [], friends: fr = [] } = res.data;
        setSentRequests(new Set(sent.map(u => u.id)));
        setReceivedRequests(received);
        setFriends(new Set(fr.map(u => u.id)));
        setFriendsList(fr);
      } catch (err) {
        console.error('Error fetching connections:', err);
      }
    };
    fetchConnections();
  }, [isAuthenticated]);

  // Load messages for authenticated user
  useEffect(() => {
    if (!isAuthenticated) {
      setInbox([]);
      setSentMessages([]);
      setConversations([]);
      return;
    }
    const fetchMessages = async () => {
      try {
        const [inRes, sentRes] = await Promise.all([
          apiClient.get('/messages/inbox'),
          apiClient.get('/messages/sent')
        ]);
        if (inRes.data.success) setInbox(inRes.data.messages);
        if (sentRes.data.success) setSentMessages(sentRes.data.messages);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };
    fetchMessages();
  }, [isAuthenticated]);

  // Compute conversations
  useEffect(() => {
    const map = {};
    inbox.forEach(msg => {
      // Ensure sender exists
      if (msg.sender) {
        const u = {
          id: msg.sender._id,
          name: msg.sender.name || msg.sender.username,
          username: msg.sender.username,
          avatar: msg.sender.social?.twitter?.profileImageUrl
        };
        map[u.id] = u;
      } else {
        console.warn("Inbox message found without a sender:", msg);
      }
    });
    sentMessages.forEach(msg => {
      // Check if msg.receiver exists before accessing its properties
      if (msg.receiver) {
        const u = {
          id: msg.receiver._id,
          name: msg.receiver.name || msg.receiver.username,
          username: msg.receiver.username,
          avatar: msg.receiver.social?.twitter?.profileImageUrl
        };
        if (!map[u.id]) map[u.id] = u;
      } else {
         console.warn("Sent message found without a receiver:", msg); // Optional: Log warning
      }
    });
    setConversations(Object.values(map));
  }, [inbox, sentMessages]);

  // Compute unread counts
  useEffect(() => {
    const counts = {};
    inbox.forEach(msg => {
      if (!msg.read) {
        const sid = msg.sender._id;
        counts[sid] = (counts[sid] || 0) + 1;
      }
    });
    setUnreadCounts(counts);
  }, [inbox]);

  // Handle sending friend request
  const handleSendRequest = async (userId) => {
    try {
      await apiClient.post(`/users/${userId}/invite`);
      setSentRequests(prev => new Set(prev).add(userId));
      
      setNotification({
        show: true,
        message: "Friend request sent!",
        type: 'success'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    } catch (err) {
      console.error('Error sending friend request:', err);
      
      setNotification({
        show: true,
        message: "Failed to send request",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    }
  };

  // Accept a friend request
  const handleAcceptRequest = async (userId) => {
    try {
      await apiClient.post(`/users/${userId}/invite/accept`);
      setReceivedRequests(prev => prev.filter(u => u.id !== userId));
      setFriends(prev => new Set(prev).add(userId));
      
      setNotification({
        show: true,
        message: "Friend request accepted!",
        type: 'success'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      
      setNotification({
        show: true,
        message: "Failed to accept request",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    }
  };

  // Reject a friend request
  const handleRejectRequest = async (userId) => {
    try {
      await apiClient.post(`/users/${userId}/invite/reject`);
      setReceivedRequests(prev => prev.filter(u => u.id !== userId));
      
      setNotification({
        show: true,
        message: "Friend request rejected",
        type: 'info'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      
      setNotification({
        show: true,
        message: "Failed to reject request",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    }
  };

  // Accept all friend requests
  const handleAcceptAll = async () => {
    try {
      await Promise.all(receivedRequests.map(req => 
        apiClient.post(`/users/${req.id}/invite/accept`)
      ));
      const newFriends = new Set([...friends]);
      receivedRequests.forEach(req => newFriends.add(req.id));
      setFriends(newFriends);
      setReceivedRequests([]);
      
      setNotification({
        show: true,
        message: `All friend requests accepted!`,
        type: 'success'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    } catch (err) {
      console.error('Error accepting all requests:', err);
      
      setNotification({
        show: true,
        message: "Failed to accept all requests",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    }
  };

  // Open chat with a user
  const openChat = async (user) => {
    setSelectedUser(user);
    setChatVisible(true);
    setConversation([]);
    setNewMessage('');
    if (!isAuthenticated) return;
    try {
      // Mark messages from this user as read
      await apiClient.post(`/messages/read/${user.id}`);
      // Fetch conversation
      const res = await apiClient.get(`/messages/conversation/${user.id}`);
      if (res.data.success) setConversation(res.data.messages);
      // Refresh inbox to update unread counts
      const inboxRes = await apiClient.get('/messages/inbox');
      if (inboxRes.data.success) setInbox(inboxRes.data.messages);
    } catch (err) {
      console.error('Error fetching conversation:', err);
    }
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;
    try {
      await apiClient.post('/messages', { receiverId: selectedUser.id, content: newMessage.trim() });
      setNewMessage('');
      const conv = await apiClient.get(`/messages/conversation/${selectedUser.id}`);
      if (conv.data.success) setConversation(conv.data.messages);
      const inboxRes = await apiClient.get('/messages/inbox');
      if (inboxRes.data.success) setInbox(inboxRes.data.messages);
    } catch (err) {
      console.error('Error sending message:', err);
      
      setNotification({
        show: true,
        message: "Failed to send message",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    }
  };

  // Fetch UMI token balance
  const fetchUmiBalance = async (walletAddress) => {
    if (!walletAddress) return "0";
    try {
      const response = await apiClient.get(`/users/token-balance/${walletAddress}`);
      if (response.data.status === "success") {
        return response.data.balance;
      }
      return "0";
    } catch (error) {
      console.error('Error fetching UMI balance:', error);
      return "0";
    }
  };

  // Fetch detailed user profile information
  const fetchUserDetails = async (userId) => {
    try {      
      const response = await apiClient.get(`/users/${userId}/profile`);
      
      if (response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user details:', error.message);
      return null;
    }
  };

  // Open friend detail sheet with enhanced information
  const openFriendDetail = async (user) => {
    setFriendDetailUser(user);
    setLoadingProfile(true);
    
    try {
      // Fetch token balance if wallet address exists
      if (user.walletAddress) {
        const balance = await fetchUmiBalance(user.walletAddress);
        setUmiBalance(balance);
      } else {
        setUmiBalance("0");
      }
      
      // Try to fetch more detailed user information
      const userDetails = await fetchUserDetails(user.id);
      if (userDetails) {
        setUserProfileDetails(userDetails);
        // Check if user is human verified
        if (userDetails.verified === true) {
          setIsHumanVerified(true);
        } else {
          setIsHumanVerified(false);
        }
      } else {
        setUserProfileDetails(null);
        setIsHumanVerified(false);
      }
    } catch (error) {
      console.error('Error loading profile details:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Close friend detail sheet
  const closeFriendDetail = () => {
    setFriendDetailUser(null);
    setUserProfileDetails(null);
    setUmiBalance("0");
    setIsHumanVerified(false);
  };

  // Format date in a readable way
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Refresh token balance
  const refreshTokenBalance = async () => {
    if (!friendDetailUser || !friendDetailUser.walletAddress) return;
    
    setNotification({
      show: true,
      message: "Refreshing balance...",
      type: 'info'
    });
    
    try {
      const balance = await fetchUmiBalance(friendDetailUser.walletAddress);
      setUmiBalance(balance);
      
      setNotification({
        show: true,
        message: `Balance updated: ${balance} UMI`,
        type: 'success'
      });
    } catch (error) {
      setNotification({
        show: true,
        message: "Failed to refresh balance",
        type: 'error'
      });
    }
    
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 3000);
  };
  
  // Copy username to clipboard
  const copyUsername = (username) => {
    navigator.clipboard.writeText(username).then(() => {
      setJustCopied(true);
      
      setNotification({
        show: true,
        message: "Username copied to clipboard!",
        type: 'success'
      });
      
      setTimeout(() => {
        setJustCopied(false);
        setNotification({ show: false, message: '', type: 'info' });
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      
      setNotification({
        show: true,
        message: "Failed to copy username",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 2000);
    });
  };

  // Render the combined Connections tab (Friends + Requests)
  const renderConnectionsTab = () => {
    return (
      <div className="connections-container">
        {/* Friend Requests Section */}
        {receivedRequests.length > 0 && (
          <div className="requests-section">
            <h3 className="section-title">Friend Requests</h3>
            <div className="requests-list">
              {receivedRequests.length > 3 && (
                <div className="bulk-action">
                  <button className="rewards-btn-primary" onClick={handleAcceptAll}>
                    Accept all requests
                  </button>
                </div>
              )}
              
              {receivedRequests.map(req => (
                <div key={req.id} className="request-card">
                  <div className="user-info">
                    {req.avatar ? (
                      <img src={req.avatar} alt={req.name} className="avatar" />
                    ) : (
                      <div className="avatar-placeholder">
                        <User size={24} />
                      </div>
                    )}
                    <div className="request-details">
                      <div className="user-name">{req.name}</div>
                      <div className="request-message">wants to connect</div>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button className="rewards-btn-primary request-btn" onClick={() => handleAcceptRequest(req.id)}>
                      Accept
                    </button>
                    <button className="rewards-btn-outline request-btn" onClick={() => handleRejectRequest(req.id)}>
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List Section */}
        <div className="friends-section">
          <h3 className="section-title">Friends</h3>
          <div className="friends-list">
            {friendsList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <User size={32} />
                </div>
                <h3 className="empty-title">No friends yet</h3>
                <p className="empty-text">Start connecting with other users!</p>
                <button
                  className="rewards-btn-primary"
                  onClick={() => setActiveTab('community')}
                >
                  Discover People
                </button>
              </div>
            ) : (
              friendsList
                .filter(user =>
                  user.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(user => (
                  <div
                    key={user.id}
                    className="friend-row"
                    onClick={() => openFriendDetail(user)}
                  >
                    <div className="friend-info">
                      <div className="avatar-container">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="avatar"
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            <User size={24} />
                          </div>
                        )}
                        {user.online && <div className="online-indicator" />}
                        {unreadCounts[user.id] > 0 && (
                          <div className="unread-badge">
                            {unreadCounts[user.id]}
                          </div>
                        )}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user.name}</div>
                        <div className="user-username">@{user.username}</div>
                      </div>
                    </div>
                    <div className="action-buttons">
                      <button
                        className="action-button message-button"
                        onClick={e => {
                          e.stopPropagation();
                          openChat(user);
                        }}
                        aria-label="Send message"
                      >
                        <MessageCircle size={18} />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render the Community tab (formerly Discover)
  const renderCommunityTab = () => {
    // Filter verified users to not show current user or friends
    // Also apply local search filter for immediate feedback
    const suggestions = verifiedUsers.filter(user => {
      // Apply search term filter locally for better UX
      const matchesSearch = searchTerm === '' || 
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()));
        
      return user.id !== currentUserId && matchesSearch;
    });

    // Helper function for pagination
    const getVisiblePageNumbers = (current, total) => {
      const maxVisiblePages = 5;
      let startPage = Math.max(current - Math.floor(maxVisiblePages / 2), 1);
      let endPage = Math.min(startPage + maxVisiblePages - 1, total);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(endPage - maxVisiblePages + 1, 1);
      }
      
      return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    return (
      <div className="community-section">
        <h3 className="section-title">Verified Users</h3> 

        {loadingVerified ? (
           <div className="loading-indicator">Loading verified users...</div> 
        ) : (
          <>
            <div className="community-feed">
              {suggestions.length === 0 ? (
                <p className="empty-text">No verified users found.</p>
              ) : (
                suggestions.map(user => (
                  <div key={user.id} className="community-row" onClick={() => openFriendDetail(user)}>
                    <div className="user-info">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name || user.username} className="avatar" />
                      ) : (
                        <div className="avatar-placeholder">
                          <User size={24} />
                        </div>
                      )}
                      <div className="user-details">
                        <div className="user-name-container">
                          <span className="user-name">{user.name || user.username}</span>
                          <div className="human-badge discover-human-badge" title="Human verified">
                            <Shield size={14} />
                            <span>Human</span>
                          </div>
                        </div>
                        <div className="user-username">@{user.username}</div>
                        <div className="social-icons-discover"> 
                            {renderSocialNetworkBadges(user)}
                        </div>
                      </div>
                    </div>
                    <div className="add-user-action">
                      {!friends.has(user.id) && !sentRequests.has(user.id) && (
                        <button
                          className="minimal-add-btn"
                          onClick={e => {
                            e.stopPropagation();
                            handleSendRequest(user.id);
                          }}
                          aria-label="Send friend request"
                        >
                          <Plus size={18} />
                        </button>
                      )}
                      {friends.has(user.id) && (
                        <span className="already-friends-tag">Friend</span>
                      )}
                      {sentRequests.has(user.id) && !friends.has(user.id) && (
                        <span className="request-sent-tag">Request Sent</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {verifiedTotalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn prev-btn"
                  onClick={() => setVerifiedCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={verifiedCurrentPage === 1}
                >
                  Prev
                </button>

                {getVisiblePageNumbers(verifiedCurrentPage, verifiedTotalPages).map(page => (
                  <button
                    key={page}
                    className={`page-btn ${verifiedCurrentPage === page ? 'active' : ''}`}
                    onClick={() => setVerifiedCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  className="page-btn next-btn"
                  onClick={() =>
                    setVerifiedCurrentPage(prev => Math.min(prev + 1, verifiedTotalPages))
                  }
                  disabled={verifiedCurrentPage === verifiedTotalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setJustCopied(true);
      
      setNotification({
        show: true,
        message: "Username copied to clipboard!",
        type: 'success'
      });
      
      setTimeout(() => {
        setJustCopied(false);
        setNotification({ show: false, message: '', type: 'info' });
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      
      setNotification({
        show: true,
        message: "Failed to copy username",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 2000);
    });
  };

  // Render social network badges
  const renderSocialNetworkBadges = (user) => {
    const social = user?.social || {};
    const badges = [];
    
    // Define priority order for social networks
    const priorityOrder = {
      twitter: 1,
      discord: 2,
      telegram: 3,
      instagram: 4,
      facebook: 5,
      youtube: 6,
      linkedin: 7
    };
    
    if (social.twitter?.id) {
      badges.push({
        key: 'twitter',
        icon: <FaX />,
        username: social.twitter.username,
        style: { backgroundColor: 'rgba(0,0,0,0.2)', color: 'black' }
      });
    }
    
    if (social.telegram?.id) {
      badges.push({
        key: 'telegram',
        icon: <FaTelegramPlane />,
        username: social.telegram.username,
        style: { backgroundColor: 'rgba(0,136,255,0.2)', color: '#0088CC' }
      });
    }
    
    if (social.discord?.id) {
      badges.push({
        key: 'discord',
        icon: <FaDiscord />,
        username: social.discord.username,
        style: { backgroundColor: 'rgba(88,101,242,0.2)', color: '#5865F2' }
      });
    }
    
    if (social.instagram?.id) {
      badges.push({
        key: 'instagram',
        icon: <FaInstagram />,
        username: social.instagram.username,
        style: { backgroundColor: 'rgba(193,53,132,0.2)', color: '#C13584' }
      });
    }
    
    if (social.facebook?.id) {
      badges.push({
        key: 'facebook',
        icon: <FaFacebook />,
        username: social.facebook.username || social.facebook.name,
        style: { backgroundColor: 'rgba(66,103,178,0.2)', color: '#4267B2' }
      });
    }
    
    if (social.youtube?.id) {
      badges.push({
        key: 'youtube',
        icon: <FaYoutube />,
        username: social.youtube.username,
        style: { backgroundColor: 'rgba(255,0,0,0.2)', color: '#FF0000' }
      });
    }
    
    if (social.linkedin?.id) {
      badges.push({
        key: 'linkedin',
        icon: <FaLinkedin />,
        username: social.linkedin.name,
        style: { backgroundColor: 'rgba(0,119,181,0.2)', color: '#0077B5' }
      });
    }
    
    // Sort badges by priority order
    badges.sort((a, b) => {
      return priorityOrder[a.key] - priorityOrder[b.key];
    });
    
    return (
      <div className="rewards-social-badges">
        {badges.length === 0 ? (
          <span className="no-socials-badge">No connected networks</span>
        ) : (
          badges.map((badge, index) => (
            <span 
              key={index} 
              className="rewards-social-badge"
              style={badge.style}
              onClick={() => copyToClipboard(`@${badge.username}`)}
            >
              {badge.icon} @{badge.username}
            </span>
          ))
        )}
      </div>
    );
  };

  // Render social networks section
  const renderSocialNetworks = (user) => {
    if (!user) return null;
    
    return (
      <div className="rewards-tab-section">
        <div className="rewards-section-header">
          <h3>Social Networks</h3>
        </div>
        <div className="rewards-section-content">
          {renderSocialNetworkBadges(user)}
        </div>
      </div>
    );
  };

  // Friend detail sheet
  const renderFriendDetail = () => {
    if (!friendDetailUser) return null;
    
    const user = userProfileDetails || friendDetailUser;
    const balance = umiBalance || "0";
    const isHumanVerified = user.verified === true;
    
    return (
      <div className="rewards-hub-style detail-sheet">
        <div className="sheet-handle" onClick={closeFriendDetail}></div>
        
        <div className="detail-content">
          {loadingProfile ? (
            <div className="loading-profile">
              <div className="loading-spinner"></div>
              <p>Loading profile...</p>
            </div>
          ) : (
            <div className="rewards-content-container">
              {/* Back button */}
              <div className="profile-back-button" onClick={closeFriendDetail}>
                <ChevronLeft size={20} />
              </div>
              
              {/* Top Navigation */}
              <div className="rewards-top-nav">
                <div className="rewards-nav-right">
                  {/* Navigation options */}
                </div>
              </div>
              
              {/* PROFILE CONTAINER */}
              <div className="rewards-profile-container">
                <div className="rewards-profile-image-container">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="rewards-profile-image" />
                  ) : (
                    <div className="rewards-profile-avatar">
                      <User size={40} />
                    </div>
                  )}
                  {user.verified && (
                    <div className="rewards-verified-badge">
                      <FaCheckCircle />
                    </div>
                  )}
                </div>
                
                <div className="rewards-profile-header">
                  <h3 className="rewards-profile-username">{user.name}</h3>
                  
                  {isHumanVerified && (
                    <div className="human-badge" title="Human verified">
                      <Shield size={14} />
                      <span>Human</span>
                    </div>
                  )}
                </div>
                
                <div className="rewards-username">@{user.username}</div>
                
                {/* Social badges */}
                {renderSocialNetworkBadges(user)}
                
                {/* Action buttons */}
                <div className="profile-action-buttons">
                  {!friends.has(user.id) && !sentRequests.has(user.id) && (
                    <button 
                      className="profile-action-btn connect-btn"
                      onClick={() => handleSendRequest(user.id)}
                      aria-label="Connect"
                    >
                      <UserCheck size={18} />
                    </button>
                  )}
                  <button 
                    className="profile-action-btn chat-btn"
                    onClick={() => openChat(user)}
                    aria-label="Chat"
                  >
                    <MessageCircle size={18} />
                  </button>
                  <button 
                    className="profile-action-btn copy-btn"
                    onClick={() => copyUsername(user.username)}
                    aria-label="Copy username"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
              
              {/* STATS CARDS */}
              <div className="rewards-streak-container">
                <div className="rewards-stats-card">
                  <div className="rewards-profile-tabs">
                    <div className="rewards-profile-stats">
                      <div className="rewards-stat-card">
                        <div className="rewards-stat-icon"><Calendar size={16} /></div>
                        <div className="rewards-stat-label">Member since</div>
                        <div className="rewards-stat-value">{formatDate(user.createdAt)}</div>
                      </div>
                      
                      {user.dailyLogin && (
                        <div className="rewards-stat-card">
                          <div className="rewards-stat-icon"><Award size={16} /></div>
                          <div className="rewards-stat-label">Login streak</div>
                          <div className="rewards-stat-value">
                            {user.dailyLogin.currentStreak || 0}
                            <span className="rewards-stat-subtitle">Max: {user.dailyLogin.maxStreak || 0}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="rewards-stat-card">
                        <div className="rewards-stat-icon"><UserCheck size={16} /></div>
                        <div className="rewards-stat-label">Friends</div>
                        <div className="rewards-stat-value">{user.friends?.length || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* SOCIAL NETWORKS */}
              {renderSocialNetworks(user)}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Chat overlay
  const renderChatOverlay = () => {
    if (!selectedUser || !chatVisible) return null;
    
    return (
      <div className="chat-overlay">
        <div className="chat-header">
          <button className="back-button" onClick={() => setChatVisible(false)}>
            <ChevronLeft size={20} />
          </button>
          <div className="chat-user">
            {selectedUser.avatar ? (
              <img src={selectedUser.avatar} alt={selectedUser.name} className="chat-avatar" />
            ) : (
              <div className="avatar-placeholder small">
                <User size={20} />
              </div>
            )}
            <div className="chat-user-name">{selectedUser.name}</div>
          </div>
        </div>
        
        <div className="chat-messages">
          {conversation.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-icon">
                <MessageCircle size={32} />
              </div>
              <h3 className="empty-title">No messages yet</h3>
              <p className="empty-text">Start your conversation</p>
            </div>
          ) : (
            conversation.map(msg => (
              <div
                key={msg._id}
                className={`message ${msg.sender._id === currentUser?.id ? 'sent' : 'received'}`}
              >
                <div className="message-content">{msg.content}</div>
                <div className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            ))
          )}
          {/* Space for mobile keyboard */}
          <div style={{ height: '80px' }}></div>
        </div>
        
        <div className="chat-input">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="send-button" onClick={handleSendMessage}>
            Send
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="rewards-hub-style">
      <div className="background"></div>
      <div className="content-container" style={{ paddingTop: 0, marginTop: 0 }}>
        {/* Top Navigation */}
        <div className="rewards-top-nav">
          <div className="page-title">Social</div>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-button" onClick={() => setSearchTerm('')}>
                &times;
              </button>
            )}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="tab-nav">
          <button 
            className={`tab-button ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            Community
          </button>
          <button 
            className={`tab-button ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            Connections
            {receivedRequests.length > 0 && <span className="tab-badge">{receivedRequests.length}</span>}
          </button>
          <div className="tab-indicator" style={{ 
            left: activeTab === 'community' ? '0%' : '50%',
            width: '50%'
          }}></div>
        </div>
        
        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'community' && renderCommunityTab()}
          {activeTab === 'connections' && renderConnectionsTab()}
        </div>
        
        {/* Friend Details */}
        {renderFriendDetail()}
        
        {/* Chat Overlay */}
        {renderChatOverlay()}
        
        {/* Notification */}
        {notification.show && (
          <div className={`notification ${notification.type}`}>
            <span>{notification.message}</span>
          </div>
        )}
      </div>
      
      <style jsx global>{`
        /* CSS Reset */
        html, body, div, span, applet, object, iframe,
        h1, h2, h3, h4, h5, h6, p, blockquote, pre,
        a, abbr, acronym, address, big, cite, code,
        del, dfn, em, img, ins, kbd, q, s, samp,
        small, strike, strong, sub, sup, tt, var,
        b, u, i, center,
        dl, dt, dd, ol, ul, li,
        fieldset, form, label, legend,
        table, caption, tbody, tfoot, thead, tr, th, td,
        article, aside, canvas, details, embed, 
        figure, figcaption, footer, header, hgroup, 
        menu, nav, output, ruby, section, summary,
        time, mark, audio, video {
          margin: 0;
          padding: 0;
          border: 0;
          font-size: 100%;
          font: inherit;
          vertical-align: baseline;
        }
        
        /* HTML5 display-role reset */
        article, aside, details, figcaption, figure, 
        footer, header, hgroup, menu, nav, section {
          display: block;
        }
        
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #f4e9b7;
        }
        
        body {
          line-height: 1;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        #__next {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }
        
        /* Base Styles */
        .rewards-hub-style {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          background-color: #f4e9b7;
          color: #303421;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #f4e9b7;
          pointer-events: none;
          z-index: -1;
          margin: 0;
          padding: 0;
          display: block;
        }
        
        .content-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 0 0 4rem 0;
          position: relative;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }
        
        /* Top Navigation */
        .rewards-top-nav {
          display: flex;
          flex-direction: column;
          margin: 0;
          padding: 1rem 1rem 0 1rem;
        }
        
        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #303421;
          margin-bottom: 1rem;
          padding: 0;
        }
        
        /* Search Container */
        .search-container {
          position: relative;
          margin-bottom: 1rem;
          width: 100%;
        }
        
        .search-input {
          width: 100%;
          padding: 0.75rem 2.5rem 0.75rem 1rem;
          border-radius: 12px;
          border: 1px solid rgba(241, 100, 3, 0.2);
          background-color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
          color: #303421;
          transition: all 0.2s;
        }
        
        .search-input:focus {
          outline: none;
          border-color: rgba(241, 100, 3, 0.4);
          box-shadow: 0 0 0 2px rgba(241, 100, 3, 0.1);
        }
        
        .search-icon {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(241, 100, 3, 0.6);
          font-size: 0.9rem;
        }
        
        .clear-button {
          position: absolute;
          right: 2.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #303421;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Tab Navigation */
        .tab-nav {
          display: flex;
          position: relative;
          background-color: rgba(241, 100, 3, 0.1);
          border-radius: 12px;
          margin: 0 1rem 1.5rem 1rem;
          overflow: hidden;
        }
        
        .tab-button {
          flex: 1;
          padding: 0.75rem 0;
          background: none;
          border: none;
          color: #303421;
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: color 0.3s;
        }
        
        .tab-button.active {
          color: #f16403;
          font-weight: 600;
        }
        
        .tab-indicator {
          position: absolute;
          bottom: 0;
          height: 3px;
          background-color: #f16403;
          transition: left 0.3s ease-in-out;
          z-index: 2;
        }
        
        .tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background-color: #f16403;
          color: white;
          font-size: 0.7rem;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          padding: 0 5px;
          margin-left: 6px;
        }
        
        /* Tab Content */
        .tab-content {
          min-height: 200px;
          padding: 0 1rem;
          width: 100%;
        }
        
        /* Section titles */
        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #303421;
          margin-bottom: 1rem;
        }
        
        /* Community Tab (formerly Discover) */
        .community-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .community-feed {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .community-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 12px;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.2s;
          cursor: pointer;
        }
        
        .community-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border-color: rgba(241, 100, 3, 0.2);
        }
        
        /* Minimize add button */
        .minimal-add-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: rgba(241, 100, 3, 0.1);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f28011;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .minimal-add-btn:hover {
          background-color: rgba(241, 100, 3, 0.2);
          transform: scale(1.05);
        }
        
        /* Connections Tab (formerly Friends + Requests) */
        .connections-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .requests-section, .friends-section {
          margin-bottom: 1rem;
        }
        
        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .request-card {
          padding: 1rem;
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 12px;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .request-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .request-message {
          font-size: 0.8rem;
          color: rgba(48, 52, 33, 0.7);
        }
        
        .request-actions {
          display: flex;
          gap: 0.75rem;
        }
        
        .request-btn {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }
        
        .bulk-action {
          margin-bottom: 1rem;
        }
        
        /* Friends list */
        .friends-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .friend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 12px;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .friend-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border-color: rgba(241, 100, 3, 0.2);
        }
        
        .friend-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .avatar-container {
          position: relative;
        }
        
        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(241, 100, 3, 0.3);
        }
        
        .avatar-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: rgba(241, 100, 3, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f28011;
          border: 2px solid rgba(241, 100, 3, 0.3);
        }
        
        .avatar-placeholder.large {
          width: 64px;
          height: 64px;
        }
        
        .avatar-placeholder.small {
          width: 32px;
          height: 32px;
        }
        
        .online-indicator {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          background-color: #2ea043;
          border-radius: 50%;
          border: 2px solid white;
        }
        
        .unread-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 18px;
          height: 18px;
          background-color: #f16403;
          color: white;
          font-size: 0.7rem;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          border: 1px solid white;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #303421;
        }
        
        .user-name-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.2rem;
        }
        
        .user-username {
          font-size: 0.8rem;
          color: rgba(48, 52, 33, 0.7);
        }
        
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        
        .action-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color : transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .message-button {
          background-color: rgba(241, 100, 3, 0.1);
          color: #f28011;
        }
        
        .message-button:hover {
          background-color: rgba(241, 100, 3, 0.2);
        }
        
        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 16px;
          border: 1px solid rgba(241, 100, 3, 0.1);
        }
        
        .empty-icon {
          color: rgba(241, 100, 3, 0.6);
          margin-bottom: 1rem;
        }
        
        .empty-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #303421;
          margin-bottom: 0.5rem;
        }
        
        .empty-text {
          font-size: 0.9rem;
          color: rgba(48, 52, 33, 0.7);
          margin-bottom: 1.5rem;
        }
        
        /* Human badge */
        .human-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background-color: rgba(241, 100, 3, 0.15);
          border: 1px solid rgba(241, 100, 3, 0.2);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #f28011;
          animation: fadeIn 0.6s ease-out;
        }
        
        .human-badge span {
          line-height: 1;
        }
        
        .discover-human-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.4rem;
          margin-left: 0.3rem;
        }
        
        /* Social network badges */
        .social-icons-discover {
          margin-top: 0.5rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
        }
        
        .social-icons-discover .rewards-social-badges {
          margin-top: 0;
          justify-content: flex-start;
        }
        
        .social-icons-discover .rewards-social-badge {
          padding: 0.15rem 0.4rem;
          font-size: 0.7rem;
          white-space: nowrap;
        }
        
        .rewards-social-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
          justify-content: center;
        }
        
        .rewards-social-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .rewards-social-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .no-socials-badge {
          font-size: 0.8rem;
          color: rgba(48, 52, 33, 0.6);
          font-style: italic;
        }
        
        /* Already friends & request sent tags */
        .already-friends-tag, .request-sent-tag {
          padding: 0.4rem 0.7rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          white-space: nowrap;
        }
        
        .already-friends-tag {
          background-color: rgba(46, 160, 67, 0.1);
          color: #2ea043;
        }
        
        .request-sent-tag {
          background-color: rgba(9, 105, 218, 0.1);
          color: #0969da;
        }
        
        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 1.5rem;
          padding: 0.5rem 0;
          flex-wrap: wrap;
        }
        
        .page-btn {
          min-width: 32px;
          height: 32px;
          border: none;
          border-radius: 12px;
          background-color: rgba(241, 100, 3, 0.1);
          color: #303421;
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 0.5rem;
        }
        
        .prev-btn, .next-btn {
          padding: 0 0.75rem;
        }
        
        .page-btn:hover {
          background-color: rgba(241, 100, 3, 0.2);
          transform: translateY(-2px);
        }
        
        .page-btn.active {
          background: rgba(0, 0, 0, 0.4);
          color: white;
          font-weight: 600;
        }
        
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        /* Friend detail sheet */
        .detail-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 90vh;
          background-color: #f4e9b7;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          z-index: 100;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
          animation: slideUp 0.3s ease;
          overflow: hidden;
          margin: 0;
          padding: 0;
          width: 100%;
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
          cursor: pointer;
        }
        
        .detail-content {
          height: 100%;
          overflow-y: auto;
          padding-top: 24px;
        }
        
        /* Profile back button */
        .profile-back-button {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: rgba(241, 100, 3, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #303421;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        }
        
        .profile-back-button:hover {
          background-color: rgba(241, 100, 3, 0.2);
          transform: scale(1.05);
        }
        
        /* Loading profile */
        .loading-profile {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(241, 100, 3, 0.2);
          border-top-color: #f28011;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Profile container */
        .rewards-content-container {
          width: 100%;
          max-width: 450px;
          margin: 0 auto;
          padding: 0 1rem 2rem 1rem;
        }
        
        .rewards-top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        
        .rewards-nav-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .rewards-profile-container {
          margin-bottom: 1.5rem;
          width: 100%;
          animation: fadeIn 0.6s ease-out;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1rem 0;
          padding-top: 2rem;
        }
        
        .rewards-profile-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }
        
        .rewards-profile-image-container {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #f28011;
          box-shadow: 0 4px 12px rgba(241, 100, 3, 0.2);
          margin-bottom: 0.5rem;
          position: relative;
        }
        
        .rewards-profile-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .rewards-profile-avatar {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(241, 100, 3, 0.1);
          color: #f28011;
        }
        
        .rewards-verified-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #f28011;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          border: 2px solid #f4e9b7;
        }
        
        .rewards-profile-username {
          font-size: 1.2rem;
          font-weight: 600;
          color: #303421;
          margin: 0;
          text-align: center;
        }
        
        .rewards-username {
          font-size: 0.9rem;
          color: rgba(48, 52, 33, 0.7);
          margin-top: -0.5rem;
        }
        
        /* Profile action buttons */
        .profile-action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 12px;
          margin-bottom: 12px;
        }
        
        .profile-action-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        
        .profile-action-btn.chat-btn {
          background-color: #f28011;
          color: white;
          box-shadow: 0 2px 8px rgba(241, 100, 3, 0.2);
        }
        
        .profile-action-btn.copy-btn {
          background-color: rgba(241, 100, 3, 0.1);
          color: #f28011;
        }
        
        .profile-action-btn.connect-btn {
          background-color: rgba(0, 0, 0, 0.4);
          color: white;
        }
        
        .profile-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        /* Stats cards */
        .rewards-streak-container {
          margin-bottom: 1.5rem;
          width: 100%;
          animation: fadeIn 0.6s ease-out;
        }
        
        .rewards-stats-card {
          width: 100%;
          background: rgba(241, 100, 3, 0.03);
          border-radius: 16px;
          padding: 1rem;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        
        .rewards-profile-stats {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
        }
        
        .rewards-stat-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border-radius: 16px;
          background-color: rgba(255, 255, 255, 0.3);
        }
        
        .rewards-stat-icon {
          color: #f28011;
          margin-bottom: 8px;
        }
        
        .rewards-stat-label {
          font-size: 12px;
          color: rgba(48, 52, 33, 0.7);
          margin-bottom: 4px;
          text-align: center;
        }
        
        .rewards-stat-value {
          font-weight: 600;
          font-size: 16px;
          color: #303421;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .rewards-stat-subtitle {
          font-size: 12px;
          color: rgba(48, 52, 33, 0.7);
          font-weight: normal;
        }
        
        /* Social networks tab */
        .rewards-tab-section {
          width: 100%;
          background: transparent;
          border-radius: 16px;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          margin-bottom: 1.5rem;
          overflow: hidden;
        }
        
        .rewards-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1rem 0.5rem 1rem;
          border-bottom: 1px solid rgba(241, 100, 3, 0.1);
        }
        
        .rewards-section-header h3 {
          font-size: 1rem;
          font-weight: 500;
          color: #303421;
          margin: 0;
        }
        
        .rewards-section-content {
          padding: 1rem;
        }
        
        /* Chat overlay */
        .chat-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          background-color: #f4e9b7;
          z-index: 200;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
          margin: 0;
          padding: 0;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        
        .chat-header {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid rgba(241, 100, 3, 0.1);
          background-color: #f4e9b7;
        }
        
        .back-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: rgba(241, 100, 3, 0.1);
          color: #303421;
          border: none;
          cursor: pointer;
          margin-right: 1rem;
        }
        
        .chat-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .chat-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .chat-user-name {
          font-weight: 600;
          color: #303421;
        }
        
        .chat-messages {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          background-color: rgba(255, 255, 255, 0.3);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .empty-chat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
        }
        
        .message {
          max-width: 75%;
          padding: 0.75rem 1rem;
          border-radius: 16px;
          position: relative;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }
        
        .message.sent {
          align-self: flex-end;
          background-color: rgba(241, 100, 3, 0.2);
          border-bottom-right-radius: 4px;
        }
        
        .message.received {
          align-self: flex-start;
          background-color: rgba(255, 255, 255, 0.7);
          border-bottom-left-radius: 4px;
        }
        
        .message-content {
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
        }
        
        .message-time {
          font-size: 0.7rem;
          color: rgba(48, 52, 33, 0.6);
          text-align: right;
        }
        
        .chat-input {
          display: flex;
          padding: 0.75rem;
          background-color: #f4e9b7;
          border-top: 1px solid rgba(241, 100, 3, 0.1);
          gap: 0.5rem;
          position: absolute;
          bottom: 7%;
          left: 0;
          right: 0;
          padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0));
          z-index: 10;
        }
        
        .chat-input input {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 24px;
          border: 1px solid rgba(241, 100, 3, 0.2);
          background-color: rgba(255, 255, 255, 0.7);
          color:black;
          font-size: 0.95rem;
        }
        
        .chat-input input:focus {
          outline: none;
          border-color: rgba(241, 100, 3, 0.4);
        }
        
        .send-button {
          padding: 0 1.25rem;
          background: linear-gradient(to right, #f16403, #feb53d);
          color: white;
          font-weight: 600;
          border: none;
          border-radius: 24px;
          cursor: pointer;
        }
        
        /* Button styles */
        .rewards-btn-primary {
          padding: 0.75rem 1.5rem;
          background: rgba(0, 0, 0, 0.4);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
          width: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .rewards-btn-primary:active {
          transform: scale(0.98);
        }
        
        .rewards-btn-outline {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: 1px solid #303421;
          border-radius: 12px;
          color: #303421;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        /* Notification */
        .notification {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.9rem 1.25rem;
          border-radius: 12px;
          font-size: 0.9rem;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          min-width: 200px;
          max-width: 90%;
          text-align: center;
          animation: slideUp 0.4s ease;
        }
        
        .notification.success {
          background-color: #2ea043;
          color: white;
        }
        
        .notification.info {
          background-color: #0969da;
          color: white;
        }
        
        .notification.error {
          background-color: #f85149;
          color: white;
        }
        
        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Loading indicator */
        .loading-indicator {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          color: rgba(48, 52, 33, 0.7);
          font-style: italic;
        }
        
        /* Mobile support */
        @media screen and (max-height: 750px) {
          .chat-input {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #f4e9b7;
            padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 20px));
            z-index: 205;
          }
          
          .chat-messages {
            padding-bottom: 100px;
          }
        }
        
        /* Support for iPhone with notch */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .chat-input {
            padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
          }
          
          .chat-overlay {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </div>
  );
};

export default SearchAppUsers;
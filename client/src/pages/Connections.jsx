import React, { useState, useEffect } from 'react';
import { apiClient } from '../context/AuthContext';
import { FaUserPlus, FaUserCheck, FaUserTimes, FaUsers } from 'react-icons/fa';

const Connections = () => {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch connections on mount
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await apiClient.get('/users/connections');
        setReceived(res.data.received || []);
        setSent(res.data.sent || []);
        setFriends(res.data.friends || []);
      } catch (err) {
        console.error('Error fetching connections:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConnections();
  }, []);

  const handleAccept = async (id) => {
    try {
      await apiClient.post(`/users/${id}/invite/accept`);
      setFriends(prev => [...prev, { id, name: received.find(u => u.id === id)?.name }]);
      setReceived(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const handleReject = async (id) => {
    try {
      await apiClient.post(`/users/${id}/invite/reject`);
      setReceived(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  if (loading) {
    return <p>Loading connections...</p>;
  }

  return (
    <div className="connections-page">
      <h1>Your Connections</h1>
      <section>
        <h2>Requests Received</h2>
        {received.length === 0 ? (
          <p>No incoming requests.</p>
        ) : (
          <ul>
            {received.map(u => (
              <li key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaUserPlus /> {u.name}
                <button onClick={() => handleAccept(u.id)}>Accept</button>
                <button onClick={() => handleReject(u.id)}>Reject</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2>Requests Sent</h2>
        {sent.length === 0 ? (
          <p>No outgoing requests.</p>
        ) : (
          <ul>
            {sent.map(u => (
              <li key={u.id}><FaUserTimes /> {u.name}</li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2>Friends</h2>
        {friends.length === 0 ? (
          <p>You have no friends yet.</p>
        ) : (
          <ul>
            {friends.map(u => (
              <li key={u.id}><FaUsers /> {u.name}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Connections;
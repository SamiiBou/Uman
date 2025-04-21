import React from 'react'

const TwitterProfile = ({ profile }) => {
  if (!profile) {
    return (
      <div style={styles.noProfile}>
        <p>Aucun profil Twitter connecté</p>
      </div>
    )
  }
  
  // Format the created at date
  const formattedDate = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Date inconnue'
  
  // Format numbers with separators
  const formatNumber = (num) => {
    return num ? num.toLocaleString('fr-FR') : '0'
  }
  
  return (
    <div style={styles.profileContainer}>
      <div style={styles.profileHeader}>
        <div style={styles.profileImageContainer}>
          <img 
            src={profile.profileImageUrl?.replace('_normal', '')} 
            alt={`Photo de profil de ${profile.name}`}
            style={styles.profileImage}
          />
        </div>
        <div style={styles.profileInfo}>
          <div style={styles.nameContainer}>
            <h2 style={styles.profileName}>{profile.name}</h2>
            {profile.verified && (
              <span style={styles.verifiedBadge} title="Compte vérifié">✓</span>
            )}
          </div>
          <p style={styles.username}>@{profile.username}</p>
        </div>
      </div>
      
      {profile.description && (
        <div style={styles.bioSection}>
          <p style={styles.bio}>{profile.description}</p>
        </div>
      )}
      
      <div style={styles.statsContainer}>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Abonnés</span>
          <span style={styles.statValue}>{formatNumber(profile.followersCount)}</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Abonnements</span>
          <span style={styles.statValue}>{formatNumber(profile.followingCount)}</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Membre depuis</span>
          <span style={styles.statValue}>{formattedDate}</span>
        </div>
      </div>
      
      <div style={styles.footer}>
        <a 
          href={`https://twitter.com/${profile.username}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={styles.profileLink}
        >
          Voir sur X (Twitter) 
          <span style={styles.linkIcon}>↗</span>
        </a>
      </div>
    </div>
  )
}

const styles = {
  profileContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px'
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px'
  },
  profileImageContainer: {
    marginRight: '15px'
  },
  profileImage: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #1DA1F2'
  },
  profileInfo: {
    flex: 1
  },
  nameContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  profileName: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
    color: '#14171A'
  },
  verifiedBadge: {
    backgroundColor: '#1DA1F2',
    color: 'white',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px'
  },
  username: {
    color: '#657786',
    margin: '0',
    fontSize: '16px'
  },
  bioSection: {
    marginBottom: '20px',
    padding: '0 5px'
  },
  bio: {
    color: '#14171A',
    fontSize: '16px',
    lineHeight: '1.5',
    margin: '0'
  },
  statsContainer: {
    display: 'flex',
    borderTop: '1px solid #E1E8ED',
    borderBottom: '1px solid #E1E8ED',
    padding: '15px 0',
    marginBottom: '15px'
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 10px'
  },
  statLabel: {
    color: '#657786',
    fontSize: '14px',
    marginBottom: '5px'
  },
  statValue: {
    color: '#14171A',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  footer: {
    display: 'flex',
    justifyContent: 'center'
  },
  profileLink: {
    color: '#1DA1F2',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center'
  },
  linkIcon: {
    marginLeft: '5px'
  },
  noProfile: {
    textAlign: 'center',
    padding: '30px',
    color: '#657786',
    fontStyle: 'italic',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px'
  }
}

export default TwitterProfile
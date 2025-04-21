import jwt from 'jsonwebtoken'

// Simple login - creates a session for the user
export const login = (req, res) => {
  // In a real app, you'd authenticate the user here
  // For now, we'll just return success
  res.status(200).json({
    success: true,
    message: 'Login successful'
  })
}

// Logout - destroys the user's session
export const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error during logout'
      })
    }
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    })
  })
}

// Get the current authentication status
export const getAuthStatus = (req, res) => {
  if (req.isAuthenticated()) {
    return res.status(200).json({
      authenticated: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      }
    })
  }
  res.status(200).json({
    authenticated: false
  })
}

// Authentication middleware
export const authenticate = (req, res, next) => {
  // Check if user is authenticated
  if (req.isAuthenticated()) {
    return next()
  }
  // If not authenticated, return an error
  res.status(401).json({
    success: false,
    message: 'Unauthorized - Please login'
  })
}
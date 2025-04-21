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
import { Navigate, Outlet } from 'react-router-dom'
import { TOKEN_KEY } from '../api/client'

// Guards nested routes: renders them only when a JWT is present,
// otherwise redirects to the login page.
export default function ProtectedRoute() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'

// Placeholder components for protected pages — real pages come in later steps.
function Placeholder({ name }) {
  return <h1>{name} (placeholder)</h1>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes — require a JWT */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
          <Route path="/budget" element={<Placeholder name="Budget" />} />
          <Route path="/expenses" element={<Placeholder name="Expenses" />} />
          <Route path="/goals" element={<Placeholder name="Goals" />} />
          <Route path="/reports" element={<Placeholder name="Reports" />} />
        </Route>

        <Route path="*" element={<Placeholder name="404 Not Found" />} />
      </Routes>
    </BrowserRouter>
  )
}

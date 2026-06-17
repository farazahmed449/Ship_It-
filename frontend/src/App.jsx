import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Placeholder components — real pages are built in the next step.
function Placeholder({ name }) {
  return <h1>{name} (placeholder)</h1>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Placeholder name="Login" />} />
        <Route path="/register" element={<Placeholder name="Register" />} />
        <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
        <Route path="/budget" element={<Placeholder name="Budget" />} />
        <Route path="/expenses" element={<Placeholder name="Expenses" />} />
        <Route path="/goals" element={<Placeholder name="Goals" />} />
        <Route path="/reports" element={<Placeholder name="Reports" />} />
        <Route path="*" element={<Placeholder name="404 Not Found" />} />
      </Routes>
    </BrowserRouter>
  )
}

import { Routes, Route } from 'react-router'
import Home from './pages/Home'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* GitHub Pages serves under /LittleDragonBudget/ — catch all subpaths */}
      <Route path="*" element={<Home />} />
    </Routes>
  )
}

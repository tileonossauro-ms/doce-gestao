import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Placeholder from '@/pages/Placeholder'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

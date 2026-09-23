import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import Home from './pages/Home'

// Páginas fora da home carregam sob demanda.
const Adopt = lazy(() => import('./pages/Adopt'))
const PetProfile = lazy(() => import('./pages/PetProfile'))
const AdoptionForm = lazy(() => import('./pages/AdoptionForm'))
const Donate = lazy(() => import('./pages/Donate'))
const PetRegister = lazy(() => import('./pages/PetRegister'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="adotar" element={<Adopt />} />
        <Route path="pets/:id" element={<PetProfile />} />
        <Route path="pets/:id/adotar" element={<AdoptionForm />} />
        <Route path="doar" element={<Donate />} />
        <Route path="admin/animais/novo" element={<PetRegister />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

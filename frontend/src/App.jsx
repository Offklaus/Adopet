import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './components/admin/RequireAdmin'
import { Layout } from './components/layout/Layout'
import Home from './pages/Home'

// Páginas fora da home carregam sob demanda.
const Adopt = lazy(() => import('./pages/Adopt'))
const PetProfile = lazy(() => import('./pages/PetProfile'))
const AdoptionForm = lazy(() => import('./pages/AdoptionForm'))
const Donate = lazy(() => import('./pages/Donate'))
const PetRegister = lazy(() => import('./pages/PetRegister'))
const PetEdit = lazy(() => import('./pages/PetEdit'))
const AdminPets = lazy(() => import('./pages/AdminPets'))
const AdminAdoptions = lazy(() => import('./pages/AdminAdoptions'))
const AdminDonations = lazy(() => import('./pages/AdminDonations'))
const AdminCampaigns = lazy(() => import('./pages/AdminCampaigns'))
const CampaignNew = lazy(() => import('./pages/CampaignNew'))
const Login = lazy(() => import('./pages/Login'))
const MyAdoptions = lazy(() => import('./pages/MyAdoptions'))
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
        <Route path="entrar" element={<Login />} />
        <Route path="meus-pedidos" element={<MyAdoptions />} />
        {/* Área administrativa: só para o administrador logado (ver RequireAdmin). */}
        <Route path="admin" element={<RequireAdmin />}>
          <Route index element={<Navigate to="animais" replace />} />
          <Route path="animais" element={<AdminPets />} />
          <Route path="animais/novo" element={<PetRegister />} />
          <Route path="animais/:id/editar" element={<PetEdit />} />
          <Route path="pedidos" element={<AdminAdoptions />} />
          <Route path="campanhas" element={<AdminCampaigns />} />
          <Route path="campanhas/nova" element={<CampaignNew />} />
          <Route path="doacoes" element={<AdminDonations />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

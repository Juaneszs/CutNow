import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './components/login';
import Registro from './components/Registro';
import RecuperarContrasena from './components/RecuperarContrasena';
import Catalogo from './components/Catalogo';
import Cita from './components/Cita';
import Header from './components/Header';
import Footer from './components/footer';
import AgendarCitas from './components/AgendarCitas';
import TiendaSection from './components/TiendaSection';
import MisCitas from './components/MisCitas';
import AdminDashboard from './components/AdminDashboard';
import AdminCitas from './components/AdminCitas';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header />
          <main style={{ flexGrow: 1, paddingBottom: '60px' }}>
            <Routes>
              {/* PÚBLICAS */}
              <Route path="/" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
              <Route path="/tienda" element={<TiendaSection />} />

              {/* PROTEGIDAS (requieren login) */}
              <Route path="/catalogo" element={
                <ProtectedRoute><Catalogo /></ProtectedRoute>
              } />
              <Route path="/cita/:id" element={
                <ProtectedRoute><Cita /></ProtectedRoute>
              } />
              <Route path="/agendar" element={
                <ProtectedRoute><AgendarCitas /></ProtectedRoute>
              } />
              <Route path="/mis-citas" element={
                <ProtectedRoute><MisCitas /></ProtectedRoute>
              } />

              {/* SOLO ADMIN */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/citas" element={
                <ProtectedRoute adminOnly><AdminCitas /></ProtectedRoute>
              } />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

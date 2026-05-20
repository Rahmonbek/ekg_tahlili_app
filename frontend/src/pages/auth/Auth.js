import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import LandingDashboard from './LandingDashboard';

export default function Auth() {
  return (
    <Routes>
      <Route path="/" element={<LandingDashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

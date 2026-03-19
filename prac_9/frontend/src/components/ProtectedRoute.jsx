import React from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';

export default function ProtectedRoute({ children }) {
    const user = api.getCurrentUser();
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
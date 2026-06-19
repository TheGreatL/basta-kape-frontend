import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { router } from './router';
import './styles.css';

function AppInner() {
    const auth = useAuth();
    return <RouterProvider router={router} context={{ auth }} />;
}

// Render the application
const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <QueryClientProvider client={router.options.context.queryClient}>
                <AuthProvider>
                    <AppInner />
                </AuthProvider>
            </QueryClientProvider>
        </React.StrictMode>
    );
}

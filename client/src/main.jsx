import React from 'react'
import ReactDOM from 'react-dom/client'
import eruda from 'eruda';
import App from './App'
import './index.css'
import { AuthProvider } from './context/AuthContext';
import MiniKitProvider from "./minikit-provider";

if (typeof window !== 'undefined' && !window.eruda) {
  eruda.init();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MiniKitProvider>
    <AuthProvider>
      <App />
    </AuthProvider>      
    </MiniKitProvider>

  </React.StrictMode>
)

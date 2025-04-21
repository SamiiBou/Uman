import { MiniKit } from "@worldcoin/minikit-js";
import { ReactNode, useEffect, useState } from "react";

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeMiniKit() {
      try {
        await MiniKit.install();
        
        // Store initialization status in session storage
        // This helps track if MiniKit was properly initialized
        sessionStorage.setItem('minikitInitialized', 'true');
        
        setIsInitialized(true);
        
      } catch (error) {
        console.error("Error initializing MiniKit:", error);
        setIsInitialized(true); // Continue anyway to avoid blocking the app
      }
    }
    
    initializeMiniKit();
    
    // Cleanup function
    return () => {
      console.log("Cleaning up MiniKit provider");
    };
  }, []);

 

  // Show loading state while MiniKit is initializing
  if (!isInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        background: '#f5f5f5'
      }}>
        <div style={{ marginBottom: '20px' }}>
          Initializing application...
        </div>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(124, 58, 237, 0.1)',
          borderTop: '4px solid rgba(124, 58, 237, 0.8)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}

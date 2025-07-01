import React from 'react';
import { X } from 'lucide-react';

const AdModal = ({ isOpen, onClose }) => {
  const handleAdClick = () => {
    const umanAppUrl = "worldapp://mini-app?app_id=app_f6f3209bce9f1cea7d219bed96170e46";
    window.open(umanAppUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
        
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <img
            src="/ad_K.png"
            alt="Advertisement"
            className="w-full h-auto cursor-pointer hover:scale-[1.02] transition-transform duration-300"
            onClick={handleAdClick}
          />
        </div>
      </div>
    </div>
  );
};

export default AdModal;
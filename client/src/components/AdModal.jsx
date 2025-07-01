import React from 'react';
import { X } from 'lucide-react';
import adImage from '../assets/ad_K.png';

const AdModal = ({ isOpen, onClose }) => {
  const handleAdClick = () => {
    const umanAppUrl = "worldapp://mini-app?app_id=app_f6f3209bce9f1cea7d219bed96170e46";
    window.open(umanAppUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-auto transform transition-all duration-300 ease-out scale-100 hover:scale-105"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors duration-200 hover:scale-110"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="p-1">
          <img
            src={adImage}
            alt="Advertisement"
            className="w-full h-auto rounded-2xl cursor-pointer transition-transform duration-300 hover:scale-[1.02] shadow-lg"
            onClick={handleAdClick}
          />
        </div>
      </div>
    </div>
  );
};

export default AdModal;
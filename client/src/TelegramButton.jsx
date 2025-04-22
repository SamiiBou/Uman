import React from 'react';
import { FaTelegramPlane } from 'react-icons/fa';

const TelegramButton = () => {
  return (
    <a 
      href="https://t.me/+W3pxAJb4yNk5MWM0" 
      target="_blank" 
      rel="noopener noreferrer"
      className="telegram-float-btn"
      aria-label="Join our Telegram community"
    >
      <FaTelegramPlane />
    </a>
  );
};

export default TelegramButton;
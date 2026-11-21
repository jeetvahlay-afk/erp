import React from 'react';
import vahlayLogo from '../assets/vahlay-logo.jpg';

export const VahlayEmblem = ({ className = 'w-16 h-16 sm:w-20 sm:h-20' }) => (
  <div className={`relative flex items-center justify-center rounded-2xl bg-white border border-gray-200/90 shadow-xs p-1.5 ${className}`}>
    <img
      src={vahlayLogo || '/vahlay-logo.jpg'}
      alt="Vahlay Consulting"
      className="w-full h-full object-contain rounded-full"
    />
  </div>
);

export const AssessmentWatermark = () => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none flex items-center justify-center">
    <img
      src={vahlayLogo || '/vahlay-logo.jpg'}
      alt="Vahlay Consulting Watermark"
      className="w-[1000px] sm:w-[1300px] lg:w-[1600px] max-w-none opacity-[0.22] select-none pointer-events-none object-contain"
    />
  </div>
);

export const AssessmentPortalHeader = ({ rightContent, location = 'Ahmedabad candidate portal' }) => {
  return (
    <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
      <div className="flex items-center space-x-3">
        <VahlayEmblem className="w-16 h-16 sm:w-20 sm:h-20" />
      </div>
      <div>
        {rightContent || (
          <span className="text-sm font-medium text-gray-500">{location}</span>
        )}
      </div>
    </header>
  );
};

export default AssessmentPortalHeader;

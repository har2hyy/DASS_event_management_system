import React from 'react';

const LoadingSpinner = ({ size = 'md', text = '', fullPage = false }) => {
  const sizes = { sm: 'h-6 w-6 border-2', md: 'h-10 w-10 border-[3px]', lg: 'h-16 w-16 border-4' };
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${fullPage ? '' : 'p-8'}`}>
      <div className={`animate-spin rounded-full border-indigo-200 border-t-indigo-600 ${sizes[size]}`}></div>
      {text && <p className="text-gray-500 text-sm animate-pulse">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {spinner}
      </div>
    );
  }
  return spinner;
};

export default LoadingSpinner;

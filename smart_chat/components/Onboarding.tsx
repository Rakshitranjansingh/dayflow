
import React, { useState, useRef } from 'react';
import { blobToBase64 } from '../utils/imageUtils';

interface OnboardingProps {
  onComplete: (userName: string, companionName: string, imageBase64: string) => void;
  defaultImageUrl: string;
  defaultCompanionName: string;
}

const EditIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
);

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, defaultImageUrl, defaultCompanionName }) => {
  const [name, setName] = useState('');
  const [companionName, setCompanionName] = useState(defaultCompanionName);
  const [image, setImage] = useState(defaultImageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImage(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companionName.trim()) return;

    let imageBase64 = defaultImageUrl;
    if (imageFile) {
      imageBase64 = await blobToBase64(imageFile);
    }

    onComplete(name, companionName, imageBase64);
  };

  const isFormValid = name.trim().length > 0 && companionName.trim().length > 0;

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-900 p-4 animate-fade-in">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Create Your Companion</h1>
        <p className="text-purple-300/80 mb-8">Personalize her look and how she knows you.</p>

        <form onSubmit={handleSubmit}>
          <div className="relative inline-block mb-6 group cursor-pointer" onClick={handleImageClick}>
            <img 
              src={image}
              alt="Companion Preview"
              className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-purple-500/50"
            />
            <div
              className="absolute inset-0 w-32 h-32 rounded-full mx-auto bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <EditIcon className="w-8 h-8" />
            </div>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="companionName" className="block mb-2 text-sm font-medium text-gray-300">
              What's her name?
            </label>
            <input
              type="text"
              id="companionName"
              value={companionName}
              onChange={(e) => setCompanionName(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-center text-lg rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
              placeholder="Companion's Name"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-300">
              What should she call you?
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-center text-lg rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
              placeholder="Your Name"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!isFormValid}
            className="w-full px-5 py-3 text-base font-medium text-center text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

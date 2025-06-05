import React from 'react';
import { useSearchParams } from 'react-router-dom';
import UserProfile from './UserProfile';

const Index = () => {
  const [searchParams] = useSearchParams();
  const username = searchParams.get('usr');

  // If usr parameter is present, show the user profile
  if (username) {
    return <UserProfile />;
  }

  // Otherwise show the normal index page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <img 
            src="https://cdn.glitch.global/379d6b26-1c93-4dc3-b34f-29fe75cab18e/favicon1.png?v=1716545083192" 
            alt="Connectiverse" 
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-blue-600">Connectiverse</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect, Chat, and Share with people around the world
          </p>
        </div>
        
        <div className="space-y-4">
          <a 
            href="/auth" 
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </a>
          <div className="text-sm text-gray-500">
            Made by connectiverseDevelopers • Powered by Supabase & Lovable
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

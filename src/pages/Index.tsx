
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto text-center space-y-8 p-6">
        <div className="space-y-4">
          <img 
            src="https://cdn.glitch.global/379d6b26-1c93-4dc3-b34f-29fe75cab18e/favicon1.png?v=1716545083192"
            alt="Connectiverse Logo"
            className="w-24 h-24 mx-auto"
          />
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Welcome to Connectiverse
          </h1>
          <p className="text-xl text-gray-600">
            Connect and chat with people around the world in a secure and engaging environment.
          </p>
        </div>
        
        <div className="space-y-4">
          {user ? (
            <div className="space-y-4">
              <Button 
                onClick={() => navigate('/dashboard')} 
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go to Dashboard
              </Button>
              <div>
                <Button 
                  onClick={signOut} 
                  variant="outline" 
                  size="lg"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => navigate('/auth')} 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Get Started
            </Button>
          )}
        </div>

        <footer className="text-sm text-gray-500 mt-12">
          <p>Created by Ayush Chatterjee</p>
          <p>Powered by Supabase, Lovable & more</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;

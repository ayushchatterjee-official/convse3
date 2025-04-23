
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">Welcome to Chat Haven</h1>
        <p className="text-xl text-gray-600 mb-8">Connect and chat with people around the world!</p>
        
        {user ? (
          <div className="space-y-4">
            <Button onClick={() => navigate('/dashboard')} className="mx-2">
              Go to Dashboard
            </Button>
            <Button onClick={signOut} variant="outline" className="mx-2">
              Sign Out
            </Button>
          </div>
        ) : (
          <Button onClick={() => navigate('/auth')} className="mx-2">
            Get Started
          </Button>
        )}
      </div>
    </div>
  );
};

export default Index;

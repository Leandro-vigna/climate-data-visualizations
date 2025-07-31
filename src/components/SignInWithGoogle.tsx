"use client";

import { useAuth } from '../lib/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function SignInWithGoogle() {
  const { signInWithGoogle } = useAuth();

  return (
    <Button
      onClick={signInWithGoogle}
      variant="outline"
      size="lg"
      className="flex items-center justify-center space-x-2 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
    >
      <img 
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
        alt="Google logo" 
        className="w-5 h-5" 
      />
      <LogIn className="w-4 h-4" />
      <span>Sign in with Google</span>
    </Button>
  );
}

'use client';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, User } from "lucide-react";

export default function AuthHeader() {
  const { data: session, status } = useSession();
  
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">CSV/Excel Time Series Visualizer</h1>
          
          {status === 'loading' ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="w-20 h-4 bg-muted rounded animate-pulse" />
            </div>
          ) : session?.user ? (
            <div className="flex items-center space-x-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src={session.user.image || undefined} alt={session.user.name || 'User'} />
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{session.user.name}</span>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => signOut()}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => signIn('google')}
              className="flex items-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 
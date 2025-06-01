'use client';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function AuthHeader() {
  const { data: session, status } = useSession();
  return (
    <header className="flex justify-between items-center p-4 bg-gray-100 border-b">
      <h1 className="text-2xl font-bold">CSV/Excel Time Series Visualizer</h1>
      {status === 'loading' ? null : session?.user ? (
        <div className="flex items-center space-x-4">
          {session.user.image && (
            <img src={session.user.image} alt="avatar" className="w-8 h-8 rounded-full" />
          )}
          <span>{session.user.name}</span>
          <button
            onClick={() => signOut()}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={() => signIn('google')}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign In with Google
        </button>
      )}
    </header>
  );
} 
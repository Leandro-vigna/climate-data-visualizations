'use client';

import { useState, useEffect } from 'react';
import { useDeepgram } from '../lib/contexts/DeepgramContext';
import { addDocument } from '../lib/firebase/firebaseUtils';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Save } from "lucide-react";

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const { connectToDeepgram, disconnectFromDeepgram, connectionState, realtimeTranscript } = useDeepgram();

  const handleStartRecording = async () => {
    await connectToDeepgram();
    setIsRecording(true);
  };

  const handleStopRecording = async () => {
    disconnectFromDeepgram();
    setIsRecording(false);
    
    // Save the note to Firebase
    if (realtimeTranscript) {
      await addDocument('notes', {
        text: realtimeTranscript,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="w-full max-w-md">
      <Button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        variant={isRecording ? "destructive" : "default"}
        size="lg"
        className="w-full flex items-center space-x-2"
      >
        {isRecording ? (
          <>
            <MicOff className="w-4 h-4" />
            <span>Stop Recording</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            <span>Start Recording</span>
          </>
        )}
      </Button>
      
      {isRecording && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary" className="flex items-center space-x-1">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-2 h-2 bg-red-500 rounded-full"
                />
                <span>Recording...</span>
              </Badge>
              <Badge variant="outline">
                {connectionState}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Live Transcript:</p>
              <p className="text-sm bg-muted p-3 rounded-md min-h-[60px]">
                {realtimeTranscript || "Listening..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
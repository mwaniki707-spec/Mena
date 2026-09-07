import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceToolProps {
  onTranscript: (text: string) => void;
  isListening?: boolean;
  onToggleListening?: () => void;
  compact?: boolean;
  className?: string;
}

export function VoiceTool({
  onTranscript,
  isListening: externalIsListening,
  onToggleListening,
  compact = false,
  className,
}: VoiceToolProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setHasSpeechSupport(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    synthesisRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (onToggleListening) {
      onToggleListening();
      return;
    }

    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    }
  };

  const speak = (text: string) => {
    if (!synthesisRef.current) {
      alert("Speech synthesis is not supported in your browser");
      return;
    }

    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const actualIsListening = externalIsListening !== undefined ? externalIsListening : isListening;

  if (compact) {
    return (
      <Button
        type="button"
        variant={actualIsListening ? "default" : "outline"}
        size="icon"
        onClick={toggleListening}
        disabled={!hasSpeechSupport}
        title={actualIsListening ? "Stop listening" : "Start voice dictation"}
        aria-label={actualIsListening ? "Stop listening" : "Start voice dictation"}
        className={cn(
          "!h-10 !w-10 rounded-full p-0 transition-all",
          actualIsListening && "bg-red-500 hover:bg-red-600 animate-pulse text-white",
          className,
        )}
      >
        {actualIsListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={actualIsListening ? "default" : "outline"}
        size="sm"
        onClick={toggleListening}
        disabled={!hasSpeechSupport}
        className={cn(
          "gap-2",
          actualIsListening && "bg-red-500 hover:bg-red-600 animate-pulse text-white",
          className,
        )}
      >
        {actualIsListening ? (
          <>
            <MicOff className="h-4 w-4" />
            Listening...
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Voice Input
          </>
        )}
      </Button>

      {isSpeaking ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={stopSpeaking}
          className="gap-2"
        >
          <VolumeX className="h-4 w-4" />
          Stop Speaking
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => speak("Voice audio playback is ready.")}
          className="gap-2"
        >
          <Volume2 className="h-4 w-4" />
          Test Voice
        </Button>
      )}
    </div>
  );
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthesisRef.current = window.speechSynthesis;
    return () => {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (!synthesisRef.current) return;

    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    synthesisRef.current.speak(utterance);
  };

  return {
    isListening,
    setIsListening,
    transcript,
    setTranscript,
    speak,
  };
}

export default VoiceTool;


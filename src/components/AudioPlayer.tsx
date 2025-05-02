
import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, Volume1, VolumeX } from "lucide-react";
import { Button } from "./Button";

interface AudioPlayerProps {
  audioSrc: string;
  onEnded?: () => void;
}

export const AudioPlayer = ({ audioSrc, onEnded }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    const audio = new Audio(`data:audio/mp3;base64,${audioSrc}`);
    audioRef.current = audio;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onEnded) onEnded();
    };
    
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    
    // Set initial volume
    audio.volume = volume;
    
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audioRef.current = null;
    };
  }, [audioSrc, onEnded]);
  
  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };
  
  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    
    const newTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX />;
    if (volume < 0.5) return <Volume1 />;
    return <Volume2 />;
  };
  
  return (
    <div className="bg-card rounded-lg shadow-md p-4">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-center space-x-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => skip(-10)}
            className="h-10 w-10 rounded-full"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            onClick={togglePlayPause}
            className="h-14 w-14 rounded-full"
          >
            {isPlaying ? 
              <Pause className="h-6 w-6" /> : 
              <Play className="h-6 w-6" />
            }
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => skip(10)}
            className="h-10 w-10 rounded-full"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground min-w-[40px]">
            {formatTime(currentTime)}
          </span>
          
          <div className="relative flex-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              step="1"
              onChange={handleSeek}
              className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <span className="text-sm text-muted-foreground min-w-[40px]">
            {formatTime(duration)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8"
          >
            {getVolumeIcon()}
          </Button>
          
          <div className="relative flex-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-accent rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

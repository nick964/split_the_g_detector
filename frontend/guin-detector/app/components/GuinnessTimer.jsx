import { useEffect, useState } from 'react';

export default function GuinnessTimer({ isRecording, onTimeUpdate }) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let interval;
    if (isRecording) {
      const startTime = Date.now() - time;
      interval = setInterval(() => {
        const currentTime = Date.now() - startTime;
        setTime(currentTime);
        onTimeUpdate(currentTime);
      }, 10); // Update every 10ms for smooth display
    }
    return () => clearInterval(interval);
  }, [isRecording, onTimeUpdate]);

  const formatTime = (time) => {
    const seconds = Math.floor(time / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="text-4xl font-bold font-mono tabular-nums">
      {formatTime(time)}
    </div>
  );
}
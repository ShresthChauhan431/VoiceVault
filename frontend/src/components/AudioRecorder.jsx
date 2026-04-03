import { useState, useRef, useEffect, useCallback } from 'react';
import RecordRTC from 'recordrtc';

export default function AudioRecorder({ 
  onRecordingComplete, 
  minDurationSeconds = 3, 
  label = 'Record your voice' 
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle');
  const [timer, setTimer] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [silenceWarning, setSilenceWarning] = useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timerRef = useRef(null);
  const silenceStartRef = useRef(null);
  const startTimeRef = useRef(null);

  const calculateRMS = (dataArray) => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  };

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);

      const barCount = 64;
      const barWidth = width / barCount - 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
        const barHeight = (value / 255) * height * 0.9;
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = isRecording ? '#10B981' : '#374151';
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      // Silence detection
      if (isRecording) {
        const rms = calculateRMS(dataArray);
        if (rms < 0.01) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > 2000) {
            setSilenceWarning(true);
          }
        } else {
          silenceStartRef.current = null;
          setSilenceWarning(false);
        }
      }
    };

    draw();
  }, [isRecording]);

  const drawIdleLine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    const barCount = 64;
    const barWidth = width / barCount - 2;
    const barHeight = 4;

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + 2);
      const y = (height - barHeight) / 2;
      ctx.fillStyle = '#374151';
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, []);

  const startRecording = async () => {
    setError(null);
    setSilenceWarning(false);
    setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Setup recorder
      recorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        desiredSampRate: 16000
      });

      recorderRef.current.startRecording();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setStatus('Recording...');
      setTimer(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

      // Start visualization
      drawWaveform();

    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access.');
      } else {
        setError(err.message || 'Failed to access microphone');
      }
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;

    setStatus('Processing...');
    
    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current.getBlob();
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      // Cleanup
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      setIsRecording(false);
      setSilenceWarning(false);
      silenceStartRef.current = null;

      // Validation
      if (duration < minDurationSeconds) {
        setError(`Recording must be at least ${minDurationSeconds} seconds. You recorded ${duration} seconds.`);
        setStatus('idle');
        drawIdleLine();
        return;
      }

      setAudioUrl(URL.createObjectURL(blob));
      setStatus('Ready to submit');
      drawIdleLine();

      if (onRecordingComplete) {
        onRecordingComplete(blob);
      }
    });
  };

  // Setup canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const updateSize = () => {
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = 80 * window.devicePixelRatio;
        canvas.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
        drawIdleLine();
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, [drawIdleLine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-gray-900 border rounded-xl p-6 ${
      isRecording 
        ? 'border-red-500 ring-1 ring-red-500 animate-pulse' 
        : 'border-gray-700'
    }`}>
      <label className="block text-sm font-medium text-gray-300 mb-4">
        {label}
      </label>

      {/* Waveform Visualizer */}
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg mb-4"
        style={{ height: '80px' }}
      />

      {/* Timer Display */}
      <div className="text-center mb-4">
        <span className="text-2xl font-mono text-white">{formatTime(timer)}</span>
        {status !== 'idle' && (
          <p className={`text-sm mt-1 ${
            status === 'Recording...' ? 'text-red-400' : 
            status === 'Processing...' ? 'text-yellow-400' : 
            'text-green-400'
          }`}>
            {status}
          </p>
        )}
      </div>

      {/* Silence Warning */}
      {silenceWarning && (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm">
            No audio detected. Please speak louder or check your microphone.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex justify-center gap-4 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 py-3 flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-6 py-3 flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            Stop Recording
          </button>
        )}
      </div>

      {/* Playback */}
      {audioUrl && (
        <div className="border-t border-gray-700 pt-4">
          <p className="text-sm text-gray-400 mb-2">
            Recorded: {timer} seconds
          </p>
          <audio 
            src={audioUrl} 
            controls 
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Audio playback and speech synthesis utilities
 */

let activeAudio: HTMLAudioElement | null = null;

/**
 * Play an audio from a URL or Data URI.
 * If no audioUrl is provided, it uses the Web Speech Synthesis API to pronounce the text in English.
 */
export function playAudioOrTTS(
  audioUrl?: string,
  fallbackText?: string,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  // Stop any currently playing audio
  stopCurrentAudio();

  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      activeAudio = audio;
      if (onStart) {
        audio.onplay = onStart;
      }
      audio.onended = () => {
        activeAudio = null;
        if (onEnd) onEnd();
      };
      audio.onerror = () => {
        activeAudio = null;
        // Fallback to TTS if audio fails to load
        if (fallbackText) {
          speakText(fallbackText, onStart, onEnd);
        } else if (onEnd) {
          onEnd();
        }
      };
      audio.play().catch(() => {
        if (fallbackText) {
          speakText(fallbackText, onStart, onEnd);
        } else if (onEnd) {
          onEnd();
        }
      });

      return () => {
        audio.pause();
        audio.currentTime = 0;
        activeAudio = null;
        if (onEnd) onEnd();
      };
    } catch {
      if (fallbackText) {
        speakText(fallbackText, onStart, onEnd);
      }
      return () => {};
    }
  } else if (fallbackText) {
    return speakText(fallbackText, onStart, onEnd);
  }

  return () => {};
}

/**
 * Speak text using native browser Web Speech API
 */
export function speakText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return () => {};
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // natural pace for learning

    // Attempt to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    if (onStart) utterance.onstart = onStart;
    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      if (onEnd) onEnd();
    };
  } catch {
    if (onEnd) onEnd();
    return () => {};
  }
}

/**
 * Stop any current sound playing
 */
export function stopCurrentAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Convert a File object to base64 Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

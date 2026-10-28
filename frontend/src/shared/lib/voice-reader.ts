/**
 * SAMANVAY — Voice Accessibility & Bhashini Speech Reader
 * Standard Web Speech API synthesis for screen-reading & audio accessibility
 */

export class VoiceReader {
  private static synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : null;

  private static currentUtterance: SpeechSynthesisUtterance | null = null;

  static isSupported(): boolean {
    return !!this.synth;
  }

  static speak(text: string, lang = 'en', onEnd?: () => void): void {
    if (!this.synth) return;

    this.stop();

    // Clean markdown/special characters for speech
    const cleanText = text
      .replace(/[#*`_~\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95; // Clear government pacing
    utterance.pitch = 1.0;

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  static stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  static isSpeaking(): boolean {
    return !!this.synth && (this.synth.speaking || this.synth.pending);
  }
}

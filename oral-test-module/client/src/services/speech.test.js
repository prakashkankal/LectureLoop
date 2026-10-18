import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRecognitionConstructor, SPEECH_RECOGNITION_LANGUAGE, speakQuestion } from './speech.js';

afterEach(() => vi.unstubAllGlobals());

describe('browser speech adapters', () => {
  it('detects standard and prefixed browser recognition', () => {
    class Recognition {}
    vi.stubGlobal('window', { SpeechRecognition: Recognition });
    expect(getRecognitionConstructor()).toBe(Recognition);
    vi.stubGlobal('window', { webkitSpeechRecognition: Recognition });
    expect(getRecognitionConstructor()).toBe(Recognition);
    vi.stubGlobal('window', {});
    expect(getRecognitionConstructor()).toBeNull();
  });

  it('uses Indian English for spoken answers in every practice mode', () => {
    expect(SPEECH_RECOGNITION_LANGUAGE).toBe('en-IN');
  });

  it('returns false when browser text-to-speech is missing', () => {
    vi.stubGlobal('window', {});
    expect(speakQuestion('Explain a candidate key.')).toBe(false);
  });

  it('speaks the question using the browser service', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    class Utterance { constructor(text) { this.text = text; } }
    vi.stubGlobal('window', { speechSynthesis: { speak, cancel } });
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    expect(speakQuestion('Explain a candidate key.')).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0][0].text).toBe('Explain a candidate key.');
  });
});
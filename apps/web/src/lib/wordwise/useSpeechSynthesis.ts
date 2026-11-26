"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechRateMode = "normal" | "slow";

export interface SpeechVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  isDefault: boolean;
}

export interface SpeakTextOptions {
  clipId: string;
  text: string;
  rateMode?: SpeechRateMode;
  voiceURI?: string;
}

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isPlaying: boolean;
  activeClipId: string | null;
  rateMode: SpeechRateMode;
  setRateMode: (mode: SpeechRateMode) => void;
  voices: SpeechVoiceOption[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (uri: string) => void;
  errorMessage: string | null;
  speak: (options: SpeakTextOptions) => void;
  stop: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [rateMode, setRateMode] = useState<SpeechRateMode>("normal");
  const [voices, setVoices] = useState<SpeechVoiceOption[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadEnglishVoices = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    try {
      const allVoices = window.speechSynthesis.getVoices() ?? [];
      const googleUsVoices = allVoices.filter(
        (v) =>
          v.name.toLowerCase().includes("google us english") ||
          v.voiceURI.toLowerCase().includes("google us english")
      );
      const englishVoices = allVoices.filter((v) =>
        v.lang.toLowerCase().startsWith("en")
      );
      const sourceList =
        googleUsVoices.length > 0
          ? googleUsVoices
          : englishVoices.length > 0
          ? englishVoices
          : allVoices;
      const mapped: SpeechVoiceOption[] = sourceList.map((v) => ({
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        isDefault: Boolean(v.default),
      }));

      setVoices(mapped);

      setSelectedVoiceURI(() => {
        const googleUs = mapped.find(
          (v) =>
            v.name.toLowerCase().includes("google us english") ||
            v.voiceURI.toLowerCase().includes("google us english")
        );
        if (googleUs) {
          return googleUs.voiceURI;
        }
        const preferredUs =
          mapped.find(
            (v) => v.lang.toLowerCase() === "en-us" && v.isDefault
          ) ??
          mapped.find((v) => v.lang.toLowerCase() === "en-us") ??
          mapped.find((v) => v.isDefault) ??
          mapped[0];
        return preferredUs?.voiceURI ?? "";
      });
    } catch {
      // Ignore voice enumeration errors on restricted webviews
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsSupported(false);
      return;
    }
    if (
      !("speechSynthesis" in window) ||
      typeof window.SpeechSynthesisUtterance === "undefined"
    ) {
      // Fallback for mobile WebViews without Web Speech API: use HTML5 Audio + dictionary audio
      setIsSupported(typeof Audio !== "undefined");
      return;
    }

    setIsSupported(true);
    loadEnglishVoices();

    const synth = window.speechSynthesis;
    const handleVoicesChanged = () => {
      loadEnglishVoices();
    };

    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", handleVoicesChanged);
    } else {
      synth.onvoiceschanged = handleVoicesChanged;
    }

    return () => {
      try {
        synth.cancel();
      } catch {
        // Ignore cleanup errors
      }
      if (typeof synth.removeEventListener === "function") {
        synth.removeEventListener("voiceschanged", handleVoicesChanged);
      }
    };
  }, [loadEnglishVoices]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch { /* ignore */ }
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    utteranceRef.current = null;
    setIsPlaying(false);
    setActiveClipId(null);
  }, []);

  const speak = useCallback(
    (options: SpeakTextOptions) => {
      const trimmedText = options.text.trim();
      if (!trimmedText) return;

      const isMobileApp = Boolean((window as unknown as { isLMSMobileApp?: boolean }).isLMSMobileApp);
      const hasWebSpeech =
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        typeof window.SpeechSynthesisUtterance !== "undefined";
      const hasVoices = hasWebSpeech && (window.speechSynthesis.getVoices()?.length ?? 0) > 0;

      if (!hasWebSpeech || (isMobileApp && !hasVoices)) {
        if (typeof Audio === "undefined") {
          setErrorMessage("Audio playback is not supported in this browser.");
          return;
        }
        const word = trimmedText.split(/\s+/)[0]?.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
        if (!word) return;
        stop();
        setErrorMessage(null);
        setIsPlaying(true);
        setActiveClipId(options.clipId);
        // Instantiate Audio synchronously within the user gesture for mobile WebView
        const audio = new Audio();
        audio.playbackRate = (options.rateMode ?? rateMode) === "slow" ? 0.75 : 1.0;
        audioRef.current = audio;
        void fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((entries) => {
            if (audioRef.current !== audio) return;
            const list = Array.isArray(entries) ? entries : [];
            const phonetics = list.flatMap((e: { phonetics?: Array<{ audio?: string }> }) => e.phonetics ?? []);
            const rawAudio = phonetics.find((p) => p.audio && p.audio.trim().length > 0)?.audio || "";
            const audioUrl = rawAudio.startsWith("http") ? rawAudio : rawAudio.startsWith("//") ? `https:${rawAudio}` : "";
            if (!audioUrl) {
              audioRef.current = null;
              setIsPlaying(false);
              setActiveClipId(null);
              setErrorMessage(`No audio recording found for "${word}".`);
              return;
            }
            audio.src = audioUrl;
            audio.onended = () => {
              if (audioRef.current === audio) audioRef.current = null;
              setIsPlaying(false);
              setActiveClipId(null);
            };
            audio.onerror = () => {
              if (audioRef.current === audio) audioRef.current = null;
              setIsPlaying(false);
              setActiveClipId(null);
              setErrorMessage("Could not play pronunciation audio.");
            };
            void audio.play().catch(() => {
              if (audioRef.current === audio) audioRef.current = null;
              setIsPlaying(false);
              setActiveClipId(null);
              setErrorMessage("Tap again to allow audio playback.");
            });
          })
          .catch(() => {
            if (audioRef.current === audio) audioRef.current = null;
            setIsPlaying(false);
            setActiveClipId(null);
            setErrorMessage("Could not load pronunciation audio.");
          });
        return;
      }

      setErrorMessage(null);

      try {
        const synth = window.speechSynthesis;
        // Always cancel any ongoing speech to prevent overlapping audio
        synth.cancel();

        const utterance = new window.SpeechSynthesisUtterance(trimmedText);
        utterance.lang = "en-US";
        const effectiveRateMode = options.rateMode ?? rateMode;
        utterance.rate = effectiveRateMode === "slow" ? 0.75 : 1.0;

        const rawVoices = synth.getVoices() ?? [];
        const googleUsVoice = rawVoices.find(
          (v) =>
            v.name.toLowerCase().includes("google us english") ||
            v.voiceURI.toLowerCase().includes("google us english")
        );
        const targetVoiceUri = options.voiceURI ?? selectedVoiceURI;
        const matchedVoice =
          googleUsVoice ??
          (targetVoiceUri
            ? rawVoices.find((v) => v.voiceURI === targetVoiceUri)
            : undefined);
        if (matchedVoice) {
          utterance.voice = matchedVoice;
          utterance.lang = matchedVoice.lang || "en-US";
        }

        utterance.onstart = () => {
          setIsPlaying(true);
          setActiveClipId(options.clipId);
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setActiveClipId(null);
          utteranceRef.current = null;
        };

        utterance.onerror = (event) => {
          // 'canceled' and 'interrupted' are normal when switching clips
          if (
            event.error !== "canceled" &&
            event.error !== "interrupted"
          ) {
            setErrorMessage(
              "Audio playback could not be completed on this device."
            );
          }
          setIsPlaying(false);
          setActiveClipId(null);
          utteranceRef.current = null;
        };

        utteranceRef.current = utterance;
        setIsPlaying(true);
        setActiveClipId(options.clipId);
        synth.speak(utterance);
      } catch {
        setIsPlaying(false);
        setActiveClipId(null);
        setErrorMessage("Unable to start browser speech playback.");
      }
    },
    [rateMode, selectedVoiceURI]
  );

  return {
    isSupported,
    isPlaying,
    activeClipId,
    rateMode,
    setRateMode,
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    errorMessage,
    speak,
    stop,
  };
}


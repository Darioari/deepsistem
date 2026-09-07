'use client';

import { Check, Copy, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff, FileText, Clock, Save, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { RealtimeBrowserTranscriber } from '@/lib/realtime-browser-transcriber';

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

type Role = 'professional' | 'patient';
type SignalPayload = { type?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit; text?: string; active?: boolean };
type IncomingMessage = { action?: string; payload?: SignalPayload; status?: string; participants?: number };
type SelfieSegmentationResult = { image: CanvasImageSource; segmentationMask: CanvasImageSource };
type SelfieSegmentationInstance = { setOptions: (options: Record<string, unknown>) => void; onResults: (callback: (results: SelfieSegmentationResult) => void) => void; send: (input: { image: HTMLVideoElement }) => Promise<void>; close?: () => void };
type SelfieSegmentationConstructor = new (config: { locateFile: (file: string) => string }) => SelfieSegmentationInstance;

declare global {
  interface Window { SelfieSegmentation?: SelfieSegmentationConstructor; __deepsistemSelfieSegmentation?: Promise<void>; }
}

function loadSelfieSegmentation() {
  if (typeof window === 'undefined') return Promise.reject(new Error('O processamento do fundo só pode ser iniciado no navegador.'));
  if (window.SelfieSegmentation) return Promise.resolve();
  if (window.__deepsistemSelfieSegmentation) return window.__deepsistemSelfieSegmentation;
  window.__deepsistemSelfieSegmentation = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
    script.async = true;
    script.onload = () => window.SelfieSegmentation ? resolve() : reject(new Error('O recurso de fundo da videochamada não ficou disponível.'));
    script.onerror = () => reject(new Error('Não foi possível carregar o recurso de fundo da videochamada.'));
    document.head.appendChild(script);
  });
  return window.__deepsistemSelfieSegmentation;
}

async function createVirtualBackgroundStream(source: MediaStream, backgroundUrl: string) {
  await loadSelfieSegmentation();
  const Constructor = window.SelfieSegmentation;
  if (!Constructor) throw new Error('Processador de fundo indisponível.');
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const background = new Image();
    background.onload = () => resolve(background);
    background.onerror = () => reject(new Error('Não foi possível carregar a imagem do fundo.'));
    background.src = backgroundUrl;
  });
  const sourceVideo = document.createElement('video');
  sourceVideo.muted = true;
  sourceVideo.playsInline = true;
  sourceVideo.srcObject = source;
  await sourceVideo.play();
  const settings = source.getVideoTracks()[0]?.getSettings();
  const width = Math.min(Number(settings?.width) || 1280, 1280);
  const height = Math.min(Number(settings?.height) || 720, 720);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context || typeof canvas.captureStream !== 'function') throw new Error('Seu navegador não oferece suporte ao fundo virtual.');
  const processor = new Constructor({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
  processor.setOptions({ modelSelection: 1 });
  processor.onResults(results => {
    context.save();
    context.clearRect(0, 0, width, height);
    context.drawImage(results.segmentationMask, 0, 0, width, height);
    context.globalCompositeOperation = 'source-in';
    context.drawImage(results.image, 0, 0, width, height);
    context.globalCompositeOperation = 'destination-over';
    context.drawImage(image, 0, 0, width, height);
    context.restore();
  });
  let stopped = false;
  const processFrame = async () => {
    if (stopped) return;
    try { await processor.send({ image: sourceVideo }); } catch { /* a próxima imagem pode recuperar o processamento */ }
    if (!stopped) window.requestAnimationFrame(() => void processFrame());
  };
  const output = canvas.captureStream(30);
  source.getAudioTracks().forEach(track => output.addTrack(track));
  void processFrame();
  return {
    stream: output,
    cleanup: () => {
      stopped = true;
      processor.close?.();
      sourceVideo.pause();
      sourceVideo.srcObject = null;
      output.getVideoTracks().forEach(track => track.stop());
    },
  };
}

const STUN_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
];

export function OnlineCareRoom({
  token,
  role,
  name,
  patientPhone,
  onTranscript,
  onSaveNote,
}: {
  token: string;
  role: Role;
  name: string;
  patientPhone?: string;
  onTranscript?: (text: string) => Promise<void>;
  onSaveNote?: (text: string) => Promise<void> | void;
}) {
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const sourceStream = useRef<MediaStream | null>(null);
  const virtualBackgroundCleanup = useRef<(() => void) | null>(null);
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const signalingReady = useRef(false);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const pendingSignals = useRef<SignalPayload[]>([]);
  const isSettingRemoteDescription = useRef(false);
  const makingOffer = useRef(false);
  const ignoreOffer = useRef(false);
  const turnConfigured = useRef(false);
  const turnFallbackTimer = useRef<number | null>(null);
  const presenceTimer = useRef<number | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const reconnectInFlight = useRef(false);
  const reconnectAttempts = useRef(0);
  const roomActive = useRef(false);
  const connectedRef = useRef(false);
  const intentionalClose = useRef(false);
  const isPolite = role === 'patient';
  const transcriber = useRef<RealtimeBrowserTranscriber | null>(null);
  const textRef = useRef('');
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [notes, setNotes] = useState<Array<{ id: string; time: string; text: string }>>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);
  const [transcription, setTranscription] = useState<'off' | 'full' | 'manual'>('off');
  const [recording, setRecording] = useState(false);
  const [transcriptionConsent, setTranscriptionConsent] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState('');
  const [videoBackgroundUrl, setVideoBackgroundUrl] = useState('');
  const other = role === 'professional' ? 'patient' : 'professional';

  useEffect(() => {
    if (role !== 'professional') return;
    fetch('/api/brand/settings', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => setVideoBackgroundUrl(String(data?.video_background_url || data?.brand?.video_background_url || '')))
      .catch(() => undefined);
  }, [role]);

  useEffect(() => {
    if (joined && localVideo.current && localStreamState) {
      localVideo.current.srcObject = localStreamState;
      localVideo.current.play().catch(() => undefined);
    }
  }, [joined, localStreamState]);

  useEffect(() => {
    if (remoteVideo.current && remoteStreamState) {
      remoteVideo.current.srcObject = remoteStreamState;
      remoteVideo.current.play().catch(() => undefined);
    }
  }, [joined, remoteStreamState]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/atendimento/${token}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setError('Não foi possível copiar o link.');
    }
  }

  function handleSendWhatsapp() {
    const url = `${window.location.origin}/atendimento/${token}`;
    void navigator.clipboard.writeText(url).catch(() => undefined);
    const rawDigits = (patientPhone || '').replace(/\D/g, '');
    const cleanPhone = rawDigits.length === 10 || rawDigits.length === 11 ? `55${rawDigits}` : rawDigits;
    const message = `Olá, ${name || 'Paciente'}! Segue o link para a nossa chamada de vídeo:\n\n${url}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  function signalingUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let url = `${protocol}//${window.location.host}/api/atendimento/${encodeURIComponent(token)}?transport=websocket&role=${role}`;
    if (role === 'professional' && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('psistem_token');
      if (storedToken) url += `&token=${encodeURIComponent(storedToken)}`;
    }
    return url;
  }

  function signal(payload: SignalPayload) {
    if (signalingReady.current && socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ action: 'signal', payload }));
      return;
    }
    if (pendingSignals.current.length < 128) pendingSignals.current.push(payload);
  }

  async function createProfessionalOffer(force = false) {
    const current = peer.current;
    if (role !== 'professional' || !current || current.signalingState === 'closed' || !signalingReady.current) return;
    if (makingOffer.current) return;
    makingOffer.current = true;
    try {
      const offer = await current.createOffer({ iceRestart: force });
      if (current.signalingState !== 'stable') return;
      await current.setLocalDescription(offer);
      signal({ type: 'offer', sdp: offer });
    } catch (err) {
      console.warn('Erro ao criar oferta WebRTC:', err);
    } finally {
      makingOffer.current = false;
    }
  }

  function clearTurnFallbackTimer() {
    if (turnFallbackTimer.current !== null) {
      window.clearTimeout(turnFallbackTimer.current);
      turnFallbackTimer.current = null;
    }
  }

  function clearPresenceTimer() {
    if (presenceTimer.current !== null) {
      window.clearTimeout(presenceTimer.current);
      presenceTimer.current = null;
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimer.current !== null) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }

  function schedulePresenceChecks() {
    if (role !== 'professional' || presenceTimer.current !== null || connectedRef.current) return;
    presenceTimer.current = window.setTimeout(() => {
      presenceTimer.current = null;
      if (!roomActive.current || connectedRef.current) return;
      if (signalingReady.current && socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify({ action: 'presence' }));
      }
      schedulePresenceChecks();
    }, 1500);
  }

  function scheduleTurnFallback() {
    if (turnFallbackTimer.current !== null) return;
    turnFallbackTimer.current = window.setTimeout(() => {
      turnFallbackTimer.current = null;
      const current = peer.current;
      if (current && current.connectionState !== 'connected' && current.iceConnectionState !== 'connected' && current.iceConnectionState !== 'completed') {
        void requestTurnFallback();
      }
    }, 6000);
  }

  async function flushCandidates() {
    const current = peer.current;
    if (!current || !current.remoteDescription) return;
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      if (!candidate) continue;
      try {
        await current.addIceCandidate(candidate);
      } catch {
        /* ICE candidate may be obsolete after an ICE restart */
      }
    }
  }

  async function requestTurnFallback() {
    const current = peer.current;
    if (!current) return;
    try {
      if (!turnConfigured.current) {
        const response = await fetch(`/api/atendimento/${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'turn-credentials' }),
        });
        const data = await response.json().catch(() => null) as { iceServers?: RTCIceServer[] } | null;
        if (response.ok && data?.iceServers?.length) {
          current.setConfiguration({ iceServers: [...STUN_ICE_SERVERS, ...data.iceServers] });
          turnConfigured.current = true;
        }
      }
      if (role === 'patient') {
        signal({ type: 'turn-needed' });
      } else {
        current.restartIce?.();
        await createProfessionalOffer(true);
      }
    } catch {
      setError('Não foi possível preparar a conexão alternativa.');
    }
  }

  async function handleSignal(payload: SignalPayload) {
    const current = peer.current;
    if (!current || !payload?.type) return;

    if (payload.type === 'offer' && payload.sdp) {
      const offerCollision = makingOffer.current || current.signalingState !== 'stable';
      ignoreOffer.current = !isPolite && offerCollision;
      if (ignoreOffer.current) {
        console.warn('Oferta WebRTC ignorada por colisão (peer impolite/autoritativo).');
        return;
      }
      try {
        isSettingRemoteDescription.current = true;
        if (offerCollision && isPolite) {
          try {
            await current.setLocalDescription({ type: 'rollback' });
          } catch {}
        }
        await current.setRemoteDescription(payload.sdp);
        isSettingRemoteDescription.current = false;
        await flushCandidates();
        const answer = await current.createAnswer();
        await current.setLocalDescription(answer);
        signal({ type: 'answer', sdp: answer });
      } catch (err) {
        isSettingRemoteDescription.current = false;
        console.warn('Falha ao processar oferta remota:', err);
      }
    } else if (payload.type === 'answer' && payload.sdp) {
      try {
        isSettingRemoteDescription.current = true;
        await current.setRemoteDescription(payload.sdp);
        isSettingRemoteDescription.current = false;
        await flushCandidates();
      } catch (err) {
        isSettingRemoteDescription.current = false;
        console.warn('Falha ao processar resposta remota:', err);
      }
    } else if (payload.type === 'candidate' && payload.candidate) {
      if (!current.remoteDescription || isSettingRemoteDescription.current) {
        pendingCandidates.current.push(payload.candidate);
      } else {
        try {
          await current.addIceCandidate(payload.candidate);
        } catch {}
      }
    } else if (payload.type === 'turn-needed' || payload.type === 'ice-restart-needed') {
      await requestTurnFallback();
    }
  }

  function scheduleSignalingReconnect() {
    if (!roomActive.current || intentionalClose.current || reconnectTimer.current !== null || reconnectInFlight.current) return;
    const delay = Math.min(1000 * (2 ** Math.min(reconnectAttempts.current, 3)), 8000);
    reconnectTimer.current = window.setTimeout(() => {
      reconnectTimer.current = null;
      reconnectInFlight.current = true;
      signalingReady.current = false;
      void connectSignaling(true).then(() => {
        reconnectAttempts.current = 0;
        setError('');
      }).catch(() => {
        reconnectAttempts.current += 1;
        scheduleSignalingReconnect();
      }).finally(() => {
        reconnectInFlight.current = false;
      });
    }, delay);
  }

  async function connectSignaling(reconnecting = false) {
    const current = new WebSocket(signalingUrl());
    socket.current = current;
    let settled = false;
    let timeout: number | null = null;
    const resolveOnce = (resolve: () => void) => {
      if (settled) return;
      settled = true;
      if (timeout !== null) window.clearTimeout(timeout);
      resolve();
    };
    const rejectOnce = (reject: (reason?: unknown) => void, reason: unknown) => {
      if (settled) return;
      settled = true;
      if (timeout !== null) window.clearTimeout(timeout);
      reject(reason);
    };
    await new Promise<void>((resolve, reject) => {
      timeout = window.setTimeout(() => rejectOnce(reject, new Error('A sinalização demorou para responder. Tente entrar novamente na sala.')), 10000);
      current.onmessage = event => {
        void (async () => {
          try {
            const incoming = JSON.parse(String(event.data)) as IncomingMessage & { role?: Role };
            if (incoming.action === 'ready') {
              signalingReady.current = true;
              const queued = pendingSignals.current.splice(0);
              for (const payload of queued) signal(payload);
              resolveOnce(resolve);
              if (role === 'professional' && Number(incoming.participants) > 1) {
                if (reconnecting) makingOffer.current = false;
                void createProfessionalOffer();
              }
              schedulePresenceChecks();
              return;
            }
            if (incoming.action === 'signal' && incoming.payload) await handleSignal(incoming.payload);
            if (incoming.action === 'status') {
              if (incoming.status === 'ended') {
                setError('O outro participante encerrou a sala.');
              } else if (incoming.status === 'participant-joined') {
                if (role === 'professional') {
                  void createProfessionalOffer(true);
                }
              } else if (incoming.status === 'participant-left') {
                connectedRef.current = false;
                setConnected(false);
              }
            }
            if (incoming.action === 'presence' && role === 'professional' && Number(incoming.participants) > 1) {
              void createProfessionalOffer();
            }
          } catch {
            setError('A sinalização da sala recebeu uma mensagem inválida.');
          }
        })();
      };
      current.onopen = () => {
        current.send(JSON.stringify({ action: 'join', role }));
      };
      current.onerror = () => rejectOnce(reject, new Error('Não foi possível conectar à sinalização da sala.'));
      current.onclose = () => {
        if (!settled) rejectOnce(reject, new Error('A conexão com a sala foi encerrada antes de entrar.'));
      };
    });
    current.onclose = () => {
      signalingReady.current = false;
      if (roomActive.current && !intentionalClose.current) {
        setError('Conexão interrompida. Reconectando a sala...');
        scheduleSignalingReconnect();
      }
    };
  }

  async function setup() {
    setError('');
    intentionalClose.current = false;
    roomActive.current = false;
    connectedRef.current = false;
    reconnectAttempts.current = 0;
    clearPresenceTimer();
    clearReconnectTimer();
    signalingReady.current = false;
    pendingCandidates.current = [];
    pendingSignals.current = [];
    makingOffer.current = false;
    isSettingRemoteDescription.current = false;
    turnConfigured.current = false;
    clearTurnFallbackTimer();
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      sourceStream.current = cameraStream;
      let stream = cameraStream;
      let configuredBackground = videoBackgroundUrl;
      if (role === 'professional' && !configuredBackground) {
        configuredBackground = await fetch('/api/brand/settings', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(data => String(data?.video_background_url || data?.brand?.video_background_url || '')).catch(() => '');
      }
      if (role === 'professional' && configuredBackground) {
        try {
          const processed = await createVirtualBackgroundStream(cameraStream, configuredBackground);
          virtualBackgroundCleanup.current = processed.cleanup;
          stream = processed.stream;
        } catch {
          setError('A imagem de fundo não pôde ser processada; a câmera foi iniciada sem o fundo virtual.');
        }
      }
      localStream.current = stream;
      setLocalStreamState(stream);
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
        localVideo.current.play().catch(() => undefined);
      }
      const current = new RTCPeerConnection({ iceServers: STUN_ICE_SERVERS });
      peer.current = current;
      stream.getTracks().forEach(track => current.addTrack(track, stream));
      current.ontrack = event => {
        const rStream = event.streams[0];
        setRemoteStreamState(rStream);
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = rStream;
          remoteVideo.current.play().catch(() => undefined);
        }
        connectedRef.current = true;
        clearPresenceTimer();
        setConnected(true);
        if (role === 'professional' && transcription === 'full') startRecording(rStream);
      };
      current.onicecandidate = event => {
        if (event.candidate) signal({ type: 'candidate', candidate: event.candidate.toJSON() });
      };
      current.oniceconnectionstatechange = () => {
        if (current.iceConnectionState === 'connected' || current.iceConnectionState === 'completed') clearTurnFallbackTimer();
        else if (current.iceConnectionState === 'failed' || current.iceConnectionState === 'disconnected') void requestTurnFallback();
        else if (current.iceConnectionState === 'checking') scheduleTurnFallback();
      };
      current.onconnectionstatechange = () => {
        const isConnected = current.connectionState === 'connected';
        connectedRef.current = isConnected;
        setConnected(isConnected);
        if (isConnected) {
          clearTurnFallbackTimer();
          clearPresenceTimer();
        }
        else if (current.connectionState === 'failed') void requestTurnFallback();
        else if (current.connectionState === 'connecting') scheduleTurnFallback();
      };
      roomActive.current = true;
      await connectSignaling();
      setJoined(true);
    } catch (cause) {
      virtualBackgroundCleanup.current?.();
      virtualBackgroundCleanup.current = null;
      clearTurnFallbackTimer();
      pendingCandidates.current = [];
      pendingSignals.current = [];
      signalingReady.current = false;
      roomActive.current = false;
      intentionalClose.current = true;
      clearPresenceTimer();
      clearReconnectTimer();
      sourceStream.current?.getTracks().forEach(track => track.stop());
      localStream.current?.getTracks().forEach(track => track.stop());
      peer.current?.close();
      socket.current?.close();
      setError(cause instanceof Error ? cause.message : 'Não foi possível acessar câmera e microfone.');
    }
  }

  useEffect(() => () => {
    roomActive.current = false;
    intentionalClose.current = true;
    clearPresenceTimer();
    clearReconnectTimer();
    socket.current?.close();
    clearTurnFallbackTimer();
    virtualBackgroundCleanup.current?.();
    sourceStream.current?.getTracks().forEach(track => track.stop());
    localStream.current?.getTracks().forEach(track => track.stop());
    peer.current?.close();
  }, []);

  function startRecording(remote?: MediaStream) {
    if (role !== 'professional' || recording || transcriber.current) return;
    const sources = [localStream.current, remote || ((remoteVideo.current?.srcObject as MediaStream | null) || null)].filter((value): value is MediaStream => Boolean(value && value.getAudioTracks().length));
    if (!sources.length) return;
    const current = new RealtimeBrowserTranscriber();
    transcriber.current = current;
    textRef.current = '';
    void current.start({ sources, onText: value => { textRef.current = value; }, onError: setError }).then(() => setRecording(true)).catch(() => { transcriber.current = null; setRecording(false); });
  }

  function stopRecording() {
    const current = transcriber.current;
    if (!current) return;
    transcriber.current = null;
    void current.stop().then(value => { if (value.trim()) return onTranscript?.(value); }).finally(() => setRecording(false));
  }

  function toggleTranscription(mode: 'full' | 'manual') {
    if (!transcriptionConsent) { setError('Confirme o consentimento do paciente antes de transcrever.'); return; }
    setError('');
    if (transcription === mode) {
      stopRecording();
      setTranscription('off');
      signal({ type: 'transcription', active: false });
    } else {
      setTranscription(mode);
      signal({ type: 'transcription', active: true });
      if (connected) startRecording();
    }
  }

  async function handleAddNote(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = newNote.trim();
    if (!text || savingNote) return;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const noteItem = { id: crypto.randomUUID(), time, text };
    setNotes(prev => [noteItem, ...prev]);
    setNewNote('');
    setSavingNote(true);
    try {
      await fetch(`/api/atendimento/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-clinical-note', text }),
      });
      void onSaveNote?.(text);
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 2500);
    } catch (err) {
      console.warn('Erro ao salvar anotação:', err);
    } finally {
      setSavingNote(false);
    }
  }

  async function share() {
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const track = display.getVideoTracks()[0];
    const sender = peer.current?.getSenders().find(item => item.track?.kind === 'video');
    await sender?.replaceTrack(track);
    track.onended = () => {
      const camera = localStream.current?.getVideoTracks()[0];
      if (camera) void sender?.replaceTrack(camera);
    };
  }

  function leave() {
    roomActive.current = false;
    intentionalClose.current = true;
    connectedRef.current = false;
    reconnectAttempts.current = 0;
    clearPresenceTimer();
    clearReconnectTimer();
    stopRecording();
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ action: 'leave' }));
    socket.current?.close();
    clearTurnFallbackTimer();
    signalingReady.current = false;
    pendingCandidates.current = [];
    pendingSignals.current = [];
    makingOffer.current = false;
    isSettingRemoteDescription.current = false;
    turnConfigured.current = false;
    virtualBackgroundCleanup.current?.();
    virtualBackgroundCleanup.current = null;
    sourceStream.current?.getTracks().forEach(track => track.stop());
    localStream.current?.getTracks().forEach(track => track.stop());
    peer.current?.close();
    signalingReady.current = false;
    pendingCandidates.current = [];
    pendingSignals.current = [];
    setJoined(false);
    setConnected(false);
  }

  if (!joined) return (
    <div className="online-prejoin">
      <Video />
      <h2>Atendimento online</h2>
      <p>{role === 'professional' ? `Sala individual de ${name}` : `Você foi convidado(a) para o atendimento com ${name}.`}</p>
      <button className="button-primary" onClick={setup}>Entrar na sala</button>
      {error && <p className="capture-error">{error}</p>}
    </div>
  );

  return (
    <div className={`online-room ${role === 'patient' ? 'patient-view' : ''}`}>
      <div className="video-stage">
        <video ref={remoteVideo} autoPlay playsInline />
        {!connected && (
          <div className="remote-placeholder">
            {role === 'patient' ? 'O profissional já vai te atender, só um momento...' : 'Aguardando o paciente entrar...'}
          </div>
        )}
        <video className="local-video" ref={localVideo} autoPlay muted playsInline />
        <div className="video-controls">
          <button onClick={() => { const track = localStream.current?.getAudioTracks()[0]; if (track) track.enabled = !track.enabled; setMuted(!muted); }}>
            {muted ? <MicOff /> : <Mic />}
          </button>
          <button onClick={() => { const enabled = !cameraOff; const outputTrack = localStream.current?.getVideoTracks()[0]; const cameraTrack = sourceStream.current?.getVideoTracks()[0]; if (outputTrack) outputTrack.enabled = enabled; if (cameraTrack) cameraTrack.enabled = enabled; setCameraOff(!cameraOff); }}>
            {cameraOff ? <VideoOff /> : <Video />}
          </button>
          <button onClick={share}><MonitorUp /></button>
          <button className="hangup" onClick={leave}><PhoneOff /></button>
        </div>
      </div>

      {role === 'professional' && (
        <aside className="online-sidebar">
          <div className="room-link">
            <strong>Link do paciente</strong>
            <div className="room-link-buttons">
              <button className={`room-link-btn ${copiedLink ? 'copied' : ''}`} onClick={handleCopyLink} title="Copiar link da chamada de vídeo">
                {copiedLink ? <><Check />Link copiado!</> : <><Copy />Copiar link</>}
              </button>
              {Boolean(patientPhone && patientPhone.replace(/\D/g, '').length >= 10) && (
                <button className="room-link-whatsapp-btn" onClick={handleSendWhatsapp} title="Enviar link pelo WhatsApp">
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" /> Enviar link
                </button>
              )}
            </div>
          </div>

          <div className="room-transcription">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong>Transcrição da sessão</strong>
              {recording && <span style={{ color: '#059669', fontSize: '0.72rem', fontWeight: 700 }}>● Ativa</span>}
            </div>
            <button className={transcription === 'full' ? 'active' : ''} onClick={() => toggleTranscription('full')}>
              Sessão inteira
            </button>
            <button className={transcription === 'manual' ? 'active' : ''} onClick={() => toggleTranscription('manual')}>
              {transcription === 'manual' && recording ? 'Parar trecho' : 'Transcrever trecho'}
            </button>
            <small>{recording ? 'Transcrevendo e vinculando ao prontuário automaticamente.' : 'Escolha quando deseja transcrever o áudio.'}</small>
          </div>

          <div className="room-notes">
            <div className="room-notes-header">
              <div className="room-notes-title">
                <FileText style={{ width: 16, height: 16, color: 'var(--color-primary)' }} />
                <strong>Anotações da sessão</strong>
              </div>
              <small>Gravadas no prontuário do paciente</small>
            </div>

            <div className="room-notes-list">
              {notes.length === 0 ? (
                <div className="room-notes-empty">
                  <p>Nenhuma anotação registrada ainda.</p>
                  <small>Digite abaixo observações clínicas para gravar no prontuário em tempo real.</small>
                </div>
              ) : (
                notes.map(item => (
                  <div key={item.id} className="room-note-card">
                    <div className="room-note-meta">
                      <span><Clock style={{ width: 12, height: 12 }} /> {item.time}</span>
                      <span className="room-note-badge"><Check style={{ width: 12, height: 12 }} /> No prontuário</span>
                    </div>
                    <p className="room-note-text">{item.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddNote} className="room-notes-form">
              <textarea
                value={newNote}
                onChange={event => setNewNote(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleAddNote();
                  }
                }}
                placeholder="Escreva uma anotação clínica desta sessão..."
                rows={2}
              />
              <div className="room-notes-form-footer">
                {noteSavedFeedback && <span className="room-note-saved"><Check style={{ width: 14, height: 14 }} /> Gravado no prontuário!</span>}
                <button type="submit" disabled={!newNote.trim() || savingNote}>
                  {savingNote ? <RefreshCw style={{ width: 14, height: 14 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14 }} />}
                  <span>Gravar</span>
                </button>
              </div>
            </form>
          </div>
        </aside>
      )}

      {error && <p className="online-error">{error}</p>}
    </div>
  );
}

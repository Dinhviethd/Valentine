import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { HeartIcon } from './HeartIcon';
import { KeyIcon } from './KeyIcon';
import { Bouquet } from './Bouquet';
import './App.css';

const SCENE = {
  LOCKED: 'locked',
  UNLOCKING: 'unlocking',
  READY: 'ready',
  TRANSFORMING: 'transforming',
  REVEALED: 'revealed',
};

const LOCK_NEAR_DISTANCE = 95;
const LETTER_PULL_LIMIT = 250;
const LETTER_PULL_THRESHOLD = 205;
const KEY_SNAP_DURATION = 360;

const drawHeart = (ctx) => {
  ctx.beginPath();
  for (let i = 0; i < Math.PI * 2; i += 0.1) {
    const x = 16 * Math.pow(Math.sin(i), 3);
    const y =
      -(13 * Math.cos(i) -
        5 * Math.cos(2 * i) -
        2 * Math.cos(3 * i) -
        Math.cos(4 * i));
    ctx.lineTo(x, y);
  }
  ctx.fill();
  ctx.closePath();
};

function App() {
  const [scene, setScene] = useState(SCENE.LOCKED);
  const [isNear, setIsNear] = useState(false);
  const [isDraggingKey, setIsDraggingKey] = useState(false);
  const [letterPull, setLetterPull] = useState(0);
  const [keySnap, setKeySnap] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const lockRef = useRef(null);
  const keyRef = useRef(null);
  const bgmAudioRef = useRef(null);
  const unlockAudioRef = useRef(null);
  const sceneTimerRef = useRef(null);
  const keySnapTimerRef = useRef(null);
  const heartbeatLoopRef = useRef(null);
  const letterDragPlayedRef = useRef(false);
  const pendingUnlockClickRef = useRef(false);
  const sfxTimeoutsRef = useRef([]);
  const mutedRef = useRef(false);
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const musicGainRef = useRef(null);
  const sfxGainRef = useRef(null);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (scene === SCENE.UNLOCKING) {
      sceneTimerRef.current = setTimeout(() => {
        setScene(SCENE.READY);
      }, 780);
    }

    if (scene === SCENE.TRANSFORMING) {
      sceneTimerRef.current = setTimeout(() => {
        setScene(SCENE.REVEALED);
      }, 1100);
    }

    return () => {
      clearTimeout(sceneTimerRef.current);
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      clearTimeout(keySnapTimerRef.current);
    };
  }, []);

  const playTone = useCallback((options) => {
    const ctx = audioCtxRef.current;
    const musicGain = musicGainRef.current;
    const sfxGain = sfxGainRef.current;
    if (!ctx || !sfxGain || mutedRef.current) return;

    const {
      freq = 440,
      type = 'sine',
      duration = 0.2,
      volume = 0.16,
      attack = 0.01,
      release = 0.16,
      pan = 0,
      detune = 0,
      startOffset = 0,
      target = 'sfx',
    } = options;

    const startAt = ctx.currentTime + startOffset;
    const outGain = target === 'music' ? (musicGain || sfxGain) : sfxGain;

    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, startAt);
    oscillator.detune.setValueAtTime(detune, startAt);

    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, startAt);
    noteGain.gain.exponentialRampToValueAtTime(
      Math.max(volume, 0.0001),
      startAt + Math.max(attack, 0.005),
    );
    noteGain.gain.exponentialRampToValueAtTime(
      0.0001,
      startAt + duration + Math.max(release, 0.02),
    );

    let lastNode = noteGain;
    if (typeof ctx.createStereoPanner === 'function') {
      const stereo = ctx.createStereoPanner();
      stereo.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), startAt);
      noteGain.connect(stereo);
      lastNode = stereo;
    }

    oscillator.connect(noteGain);
    lastNode.connect(outGain);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + release + 0.06);
  }, []);

  const playBackgroundMusic = useCallback(async () => {
    const bgm = bgmAudioRef.current;
    if (!bgm || isMuted) return false;

    bgm.loop = true;
    bgm.volume = 0.45;
    bgm.muted = false;

    try {
      await bgm.play();
      return true;
    } catch {
      return false;
    }
  }, [isMuted]);

  const ensureAudio = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioCtxRef.current) {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();

      master.gain.value = isMuted ? 0.0001 : 0.95;
      music.gain.value = 0.5;
      sfx.gain.value = 0.6;

      music.connect(master);
      sfx.connect(master);
      master.connect(ctx.destination);

      audioCtxRef.current = ctx;
      masterGainRef.current = master;
      musicGainRef.current = music;
      sfxGainRef.current = sfx;
    }

    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
  }, [isMuted]);

  useEffect(() => {
    let removed = false;
    let resumeBgm = null;

    const tryStartBgm = async () => {
      const played = await playBackgroundMusic();
      if (removed || played) return;

      resumeBgm = async () => {
        if (removed) return;
        void ensureAudio();
        const retryPlayed = await playBackgroundMusic();
        if (retryPlayed) {
          window.removeEventListener('pointerdown', resumeBgm);
          window.removeEventListener('keydown', resumeBgm);
          window.removeEventListener('touchstart', resumeBgm);
        }
      };

      window.addEventListener('pointerdown', resumeBgm);
      window.addEventListener('keydown', resumeBgm);
      window.addEventListener('touchstart', resumeBgm);
    };

    void tryStartBgm();

    return () => {
      removed = true;
      if (resumeBgm) {
        window.removeEventListener('pointerdown', resumeBgm);
        window.removeEventListener('keydown', resumeBgm);
        window.removeEventListener('touchstart', resumeBgm);
      }
    };
  }, [ensureAudio, playBackgroundMusic]);

  const playKeyPickupSfx = useCallback(() => {
    playTone({ freq: 520, type: 'square', duration: 0.05, release: 0.12, volume: 2 });
    playTone({ freq: 780, type: 'triangle', duration: 0.08, release: 0.16, volume: 1, startOffset: 0.03 });
  }, [playTone]);

  const playHeartbeatPulseSfx = useCallback(() => {
    playTone({ freq: 130, type: 'square', duration: 0.08, release: 0.08, volume: 9, pan: -0.05 });
    playTone({ freq: 95, type: 'triangle', duration: 0.1, release: 0.12, volume: 8, pan: 0.08, startOffset: 0.18 });
  }, [playTone]);

  const playUnlockSound = useCallback(() => {
    const unlockAudio = unlockAudioRef.current;
    if (!unlockAudio || isMuted) return;

    unlockAudio.currentTime = 0;
    unlockAudio.volume = 0.9;
    void unlockAudio.play().catch(() => {});
  }, [isMuted]);

  const playLockOpenClickSfx = useCallback(() => {
    playTone({ freq: 860, type: 'square', duration: 0.05, release: 0.08, volume: 0.01 });
    playTone({ freq: 480, type: 'sawtooth', duration: 0.06, release: 0.1, volume: 0.08, startOffset: 0.01 });
  }, [playTone]);

  const playLetterPullSfx = useCallback(() => {
    playTone({ freq: 420, type: 'triangle', duration: 0.09, release: 0.14, volume: 0.07 });
    playTone({ freq: 360, type: 'square', duration: 0.07, release: 0.14, volume: 0.05, startOffset: 0.03 });
  }, [playTone]);

  const queueTone = useCallback((delayMs, toneConfig) => {
    const timeoutId = setTimeout(() => {
      playTone(toneConfig);
    }, delayMs);
    sfxTimeoutsRef.current.push(timeoutId);
  }, [playTone]);

  const playRevealSfx = useCallback(() => {
    queueTone(0, { freq: 523.25, type: 'triangle', duration: 0.16, release: 0.2, volume: 0.09 });
    queueTone(120, { freq: 659.25, type: 'triangle', duration: 0.18, release: 0.2, volume: 0.09 });
    queueTone(260, { freq: 783.99, type: 'triangle', duration: 0.2, release: 0.24, volume: 0.1 });
    queueTone(430, { freq: 1046.5, type: 'sine', duration: 0.34, release: 0.26, volume: 0.08 });
  }, [queueTone]);

  const handleUnlockAudio = useCallback(() => {
    void ensureAudio();
    void playBackgroundMusic();
  }, [ensureAudio, playBackgroundMusic]);

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      void ensureAudio();
      void playBackgroundMusic();
      return;
    }

    setIsMuted(true);
  }, [ensureAudio, isMuted, playBackgroundMusic]);

  const handleKeyDragStart = useCallback(() => {
    setIsDraggingKey(true);
    handleUnlockAudio();
    playKeyPickupSfx();
  }, [handleUnlockAudio, playKeyPickupSfx]);

  const handleLetterDragStart = useCallback(() => {
    if (letterDragPlayedRef.current) return;
    letterDragPlayedRef.current = true;
    handleUnlockAudio();
    playLetterPullSfx();
  }, [handleUnlockAudio, playLetterPullSfx]);

  useEffect(() => {
    mutedRef.current = isMuted;
    const bgm = bgmAudioRef.current;
    const unlockAudio = unlockAudioRef.current;
    if (bgm) {
      bgm.muted = isMuted;
      if (isMuted) {
        bgm.pause();
      } else {
        void bgm.play().catch(() => {});
      }
    }

    if (unlockAudio) {
      unlockAudio.muted = isMuted;
      if (isMuted) {
        unlockAudio.pause();
        unlockAudio.currentTime = 0;
      }
    }

    if (!audioCtxRef.current || !masterGainRef.current) return;

    masterGainRef.current.gain.setTargetAtTime(
      isMuted ? 0.0001 : 0.95,
      audioCtxRef.current.currentTime,
      0.05,
    );
  }, [isMuted]);

  useEffect(() => {
    const shouldPlayHeartbeat =
      scene === SCENE.LOCKED && isNear && !keySnap && !isMuted;

    if (!shouldPlayHeartbeat) {
      clearInterval(heartbeatLoopRef.current);
      heartbeatLoopRef.current = null;
      return;
    }

    handleUnlockAudio();
    playHeartbeatPulseSfx();
    heartbeatLoopRef.current = setInterval(() => {
      playHeartbeatPulseSfx();
    }, 620);

    return () => {
      clearInterval(heartbeatLoopRef.current);
      heartbeatLoopRef.current = null;
    };
  }, [
    handleUnlockAudio,
    isMuted,
    isNear,
    keySnap,
    playHeartbeatPulseSfx,
    scene,
  ]);

  useEffect(() => {
    if (scene === SCENE.READY && pendingUnlockClickRef.current) {
      playLockOpenClickSfx();
      pendingUnlockClickRef.current = false;
    }

    if (scene === SCENE.TRANSFORMING) {
      playTone({
        freq: 700,
        type: 'sine',
        duration: 0.24,
        release: 0.24,
        volume: 0.08,
      });
    }

    if (scene === SCENE.REVEALED) {
      playRevealSfx();
    }
  }, [playLockOpenClickSfx, playRevealSfx, playTone, scene]);

  useEffect(() => {
    return () => {
      clearTimeout(sceneTimerRef.current);
      clearTimeout(keySnapTimerRef.current);
      clearInterval(heartbeatLoopRef.current);
      sfxTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));

      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.currentTime = 0;
      }

      if (unlockAudioRef.current) {
        unlockAudioRef.current.pause();
        unlockAudioRef.current.currentTime = 0;
      }

      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  const handleKeyDrag = (_, info) => {
    if (scene !== SCENE.LOCKED || keySnap || !lockRef.current || !keyRef.current) return;

    const lockRect = lockRef.current.getBoundingClientRect();
    const lockCenter = {
      x: lockRect.left + lockRect.width / 2,
      y: lockRect.top + lockRect.height / 2,
    };
    const pointer = info?.point;
    if (!pointer) return;

    const distance = Math.hypot(
      pointer.x - lockCenter.x,
      pointer.y - lockCenter.y,
    );

    setIsNear(distance < LOCK_NEAR_DISTANCE);
  };

  const handleKeyDragEnd = (_, info) => {
    setIsDraggingKey(false);
    setIsNear(false);

    if (scene !== SCENE.LOCKED || keySnap || !lockRef.current || !keyRef.current) return;

    const lockRect = lockRef.current.getBoundingClientRect();
    const lockCenter = {
      x: lockRect.left + lockRect.width / 2,
      y: lockRect.top + lockRect.height / 2,
    };
    const pointer = info?.point;
    if (!pointer) return;

    const pointerDistance = Math.hypot(
      pointer.x - lockCenter.x,
      pointer.y - lockCenter.y,
    );
    const isInside = pointerDistance <= Math.max(lockRect.width, lockRect.height) * 0.55;

    if (!isInside) return;

    handleUnlockAudio();
    playUnlockSound();
    pendingUnlockClickRef.current = true;

    const keyRect = keyRef.current.getBoundingClientRect();
    const keyCenter = {
      x: keyRect.left + keyRect.width / 2,
      y: keyRect.top + keyRect.height / 2,
    };

    setKeySnap({
      left: keyRect.left,
      top: keyRect.top,
      width: keyRect.width,
      height: keyRect.height,
      deltaX: lockCenter.x - keyCenter.x,
      deltaY: lockCenter.y - keyCenter.y,
    });

    clearTimeout(keySnapTimerRef.current);
    keySnapTimerRef.current = setTimeout(() => {
      setKeySnap(null);
      setScene(SCENE.UNLOCKING);
    }, KEY_SNAP_DURATION);
  };

  const handleLetterDrag = (_, info) => {
    if (scene !== SCENE.READY) return;

    const pulled = Math.max(0, Math.min(LETTER_PULL_LIMIT, -info.offset.y));
    setLetterPull(pulled);
  };

  const handleLetterDragEnd = (_, info) => {
    if (scene !== SCENE.READY) return;

    const pulled = Math.max(0, -info.offset.y);
    if (pulled >= LETTER_PULL_THRESHOLD) {
      letterDragPlayedRef.current = false;
      setLetterPull(LETTER_PULL_LIMIT);
      setScene(SCENE.TRANSFORMING);
      return;
    }

    letterDragPlayedRef.current = false;
    setLetterPull(0);
  };

  const shouldShowEnvelope = scene !== SCENE.REVEALED;
  const letterProgress = letterPull / LETTER_PULL_LIMIT;

  return (
    <div className="valentine-scene" onPointerDown={handleUnlockAudio}>
      <div className="ambient-layer">
        {[1, 2, 3, 4, 5].map((id) => (
          <motion.div
            key={id}
            className={`ambient-heart heart-${id}`}
            animate={{ y: [0, -16, 0], opacity: [0.16, 0.32, 0.16] }}
            transition={{
              duration: 6 + id,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <HeartIcon className="ambient-heart-icon" />
          </motion.div>
        ))}
      </div>

      {shouldShowEnvelope && (
        <motion.div
          className={`envelope-wrapper ${scene === SCENE.TRANSFORMING ? 'is-fading' : ''}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="envelope">
            <div className="envelope-back" />

            <div className="letter-shell-wrap">
              <motion.div
                className="letter-shell"
                animate={
                  scene === SCENE.LOCKED
                    ? { y: 34, opacity: 0, scale: 0.98, rotate: 0 }
                  : scene === SCENE.UNLOCKING
                      ? { y: -8, opacity: 1, scale: 1, rotate: 0 }
                    : scene === SCENE.TRANSFORMING
                      ? { y: -170, opacity: 0, scale: 0.92, rotate: -4 }
                      : { y: -8, opacity: 1, scale: 1, rotate: 0 }
                }
                transition={{ type: 'spring', stiffness: 130, damping: 18 }}
              >
                <motion.div
                  className={`letter-draggable ${scene === SCENE.READY ? 'is-ready' : ''}`}
                  drag={scene === SCENE.READY ? 'y' : false}
                  dragConstraints={{ top: -LETTER_PULL_LIMIT, bottom: 0 }}
                  dragElastic={0.08}
                  dragSnapToOrigin
                  whileTap={scene === SCENE.READY ? { scale: 1.02 } : {}}
                  onDragStart={handleLetterDragStart}
                  onDrag={handleLetterDrag}
                  onDragEnd={handleLetterDragEnd}
                >
                  <p className="letter-kicker">Love Invitation</p>
                  <h2>Gửi Na iu của anh</h2>
                  <p>
                    Anh có một bất ngờ nho nhỏ cho e vào ngày Valentine này.
                    <br />
                    Bé kéo tiếp mảnh giấy trong thư ra để xem điều bất ngờ nha.
                  </p>

                  <div className="letter-progress-track">
                    <motion.div
                      className="letter-progress-value"
                      animate={{ width: `${Math.max(8, letterProgress * 100)}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              className="envelope-flap"
              animate={{
                y: scene === SCENE.LOCKED ? 0 : -132,
                scaleY: scene === SCENE.LOCKED ? 1 : 0.86,
                opacity: scene === SCENE.LOCKED ? 1 : 0,
              }}
              transition={{
                duration: 0.56,
                ease: [0.22, 0.86, 0.24, 1],
              }}
            />

            <div className="envelope-front" />

            <div ref={lockRef} className={`lock-anchor ${isNear ? 'is-near' : ''}`}>
              <AnimatePresence mode="wait">
                {scene === SCENE.LOCKED ? (
                  <motion.div
                    key="lock-intact"
                    className="heart-lock intact"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: isNear ? [1, 1.16, 0.96, 1.14, 1] : [1, 1.05, 1],
                      opacity: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.18,
                      transition: { duration: 0.18, ease: 'easeIn' },
                    }}
                    transition={{
                      opacity: { duration: 0.2 },
                      scale: {
                        repeat: Infinity,
                        duration: isNear ? 0.52 : 1.45,
                        ease: 'easeInOut',
                      },
                    }}
                  >
                    <HeartIcon className="heart-lock-svg" />
                  </motion.div>
                ) : (
                  <div key="lock-broken" className="lock-shards">
                    <motion.div
                      className="heart-lock shard shard-left"
                      initial={{ x: 0, y: 0, scale: 0.38, rotate: 0, opacity: 0 }}
                      animate={{
                        x: -78,
                        y: -44,
                        scale: 1.2,
                        rotate: -46,
                        opacity: [0, 1, 0],
                      }}
                      transition={{ duration: 0.68, ease: [0.2, 0.9, 0.28, 1] }}
                    >
                      <HeartIcon className="heart-lock-svg" />
                    </motion.div>
                    <motion.div
                      className="heart-lock shard shard-right"
                      initial={{ x: 0, y: 0, scale: 0.38, rotate: 0, opacity: 0 }}
                      animate={{
                        x: 78,
                        y: -42,
                        scale: 1.2,
                        rotate: 48,
                        opacity: [0, 1, 0],
                      }}
                      transition={{ duration: 0.68, ease: [0.2, 0.9, 0.28, 1] }}
                    >
                      <HeartIcon className="heart-lock-svg" />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {scene === SCENE.LOCKED && !keySnap && (
          <motion.div
            ref={keyRef}
            className={`key-floating ${isDraggingKey ? 'is-dragging' : ''}`}
            drag
            dragConstraints={{
              top: -height / 2 + 80,
              left: -width / 2 + 80,
              right: width / 2 - 80,
              bottom: height / 2 - 80,
            }}
            dragElastic={0.34}
            dragSnapToOrigin
            dragTransition={{ bounceStiffness: 360, bounceDamping: 18 }}
            onDragStart={handleKeyDragStart}
            onDrag={handleKeyDrag}
            onDragEnd={handleKeyDragEnd}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 1.14, y: -6 }}
            animate={
              isDraggingKey
                ? { y: 0, rotate: -22 }
                : { y: [0, -14, 0], rotate: [-22, -28, -22] }
            }
            transition={
              isDraggingKey
                ? { duration: 0.18, ease: 'easeOut' }
                : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
            }
            exit={{ opacity: 0, y: 20 }}
          >
            <KeyIcon className="key-icon" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {keySnap && (
          <motion.div
            className="key-snap"
            style={{
              left: keySnap.left,
              top: keySnap.top,
              width: keySnap.width,
              height: keySnap.height,
            }}
            initial={{ x: 0, y: 0, scale: 1, rotate: -22, opacity: 1 }}
            animate={{
              x: keySnap.deltaX,
              y: keySnap.deltaY,
              scale: [1, 1.2, 0.36],
              rotate: [-22, 0, 120],
              opacity: [1, 1, 0.18],
            }}
            transition={{
              duration: KEY_SNAP_DURATION / 1000,
              ease: [0.12, 0.88, 0.22, 1],
            }}
          >
            <KeyIcon className="key-icon" />
          </motion.div>
        )}
      </AnimatePresence>

      {scene === SCENE.TRANSFORMING && (
        <motion.div
          className="transform-stage"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="transform-letter"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 0.45, opacity: 0, rotate: -18 }}
            transition={{ duration: 0.65, ease: 'easeIn' }}
          />

          <motion.div
            className="transform-bouquet"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8, ease: 'backOut' }}
          >
            <Bouquet className="bouquet-svg preview" />
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {(scene === SCENE.REVEALED || scene === SCENE.TRANSFORMING) && (
          <Confetti
            width={width}
            height={height}
            numberOfPieces={scene === SCENE.REVEALED ? 320 : 160}
            recycle={scene === SCENE.REVEALED}
            gravity={0.14}
            colors={['#ff3f7f', '#ff8e3c', '#ffd166', '#ffffff']}
            drawShape={drawHeart}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scene === SCENE.REVEALED && (
          <motion.div
            className="finale-card"
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 90, damping: 14 }}
          >
            <Bouquet className="bouquet-svg" />
            <h1>Happy Valentine&apos;s Day</h1>
            <p>
              Gửi Na iu, a muốn dành tặng bó hoa nho nhỏ này cho e vì e 
              đã đem lại cho a rất nhiều điều đặc biệt trong suốt thời gian qua.
              <br />
              Mong rằng sau này, dù có bận rộn đến đâu, chúng ta vẫn dành cho nhau sự ưu tiên và sự tử tế như những ngày đầu. Mong rằng ngày này năm sau, chúng ta sẽ đón valentine cùng nhau nhaaaa
            </p>
            <p>Yêu em nhiều lắm luôn áaaaaaaaa</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scene === SCENE.LOCKED && (
          <motion.p
            className="hint-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Bé hãy dùng chìa khóa kế bên để mở khóa trái tim trên phong bì nhaaaaaaaa.
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scene === SCENE.READY && (
          <motion.p
            className="hint-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Bé kéo típ mảnh giấy trong thư ra nèee :3
          </motion.p>
        )}
      </AnimatePresence>

      <audio ref={bgmAudioRef} src="/background_music.mp3" loop preload="auto" />
      <audio ref={unlockAudioRef} src="/unlock_sound.mp3" preload="auto" />

      <button type="button" className="audio-toggle" onClick={handleToggleMute}>
        {isMuted ? 'Audio: Off' : 'Audio: On'}
      </button>
    </div>
  );
}

export default App;

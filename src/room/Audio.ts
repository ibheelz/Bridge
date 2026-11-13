import * as THREE from 'three';
import type Camera from './Camera';
import type Navigation from './Navigation';
import type World from './world/World';
import VideoScreen from './world/screens/VideoScreen';
import { EVENTS, type CrtModeDetail, type MuteDetail } from './events';
import { readMuted } from './utils/mutePref';

// Analysis section 9. Everything is synthesized; there are no sample files.
const MASTER_LEVEL = 0.9;
const FADE_IN_S = 8;
const MUTE_DOWN_S = 0.15;
const MUTE_UP_S = 0.4;
const PARAM_SMOOTH_S = 0.05;

const ROOM_TONE_GAIN = 0.6;
const ROOM_TONE_LEVEL = 0.05;
const ROOM_TONE_LOWPASS = 400;
const NOISE_SECONDS = 4;

const ROOMBA_GAIN = 0.22;
const ROOMBA_NOISE_BANDPASS = 400;
const ROOMBA_NOISE_Q = 0.9;
const ROOMBA_NOISE_GAIN = 0.9;
const ROOMBA_HUM_HZ = 120;
const ROOMBA_HUM_GAIN = 0.16;
const LFOS = [
  { hz: 3.1, depth: 3 },
  { hz: 0.73, depth: 4 },
];
const LOWPASS_NEAR = 9000;
const LOWPASS_FAR = 1800;
const SEND_NEAR = 0.06;
const SEND_FAR = 0.35;
const DIST_NEAR = 8;
const DIST_FAR = 19;
const IMPULSE_SECONDS = 0.4;

const PANNER: PannerOptions = {
  panningModel: 'HRTF',
  distanceModel: 'inverse',
  refDistance: 7.3,
  rolloffFactor: 1,
};
const AZIMUTH_RANGE = Math.PI / 2; // 90 degrees at the screen edge
const ELEVATION_RANGE = THREE.MathUtils.degToRad(20);
const EAR_FRACTION = 0.3; // ear point: 30% of the way from the look-at target to the camera

/** TV chain (section 9), built only when the TV plays a real video file. */
const TV = { highpass: 300, lowpass: 3500, peakHz: 1500, peakDb: 4, dry: 0.75, wet: 0.25, gain: 0.16 };

const START_EVENTS = ['pointerdown', 'touchend', 'keydown'] as const;

type AudioContextClass = typeof AudioContext;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** `last = (last + 0.02 * white) / 1.02; sample = last * 3.5`, looped. */
function brownNoise(context: AudioContext, seconds: number, level = 1): AudioBuffer {
  const buffer = context.createBuffer(1, Math.round(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5 * level;
  }
  return buffer;
}

/** Stereo room impulse: smoothed white noise under a cubic decay. */
function roomImpulse(context: AudioContext, seconds: number): AudioBuffer {
  const length = Math.round(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  const SMOOTH = 4;
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    const window: number[] = [];
    let sum = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      window.push(white);
      sum += white;
      if (window.length > SMOOTH) sum -= window.shift()!;
      data[i] = (sum / window.length) * Math.pow(1 - i / length, 3);
    }
  }
  return buffer;
}

interface Source {
  panner: PannerNode;
}

/**
 * The room's sound (analysis section 9): a quiet room tone and the roomba's
 * motor, placed by where the roomba is on screen so it pans as you orbit.
 * Nothing is created until the first user gesture. Suspends when the tab is
 * hidden or the window loses focus. `kai:mute` and CRT mode turn it down.
 */
export default class RoomAudio {
  context: AudioContext | null = null;

  private camera: Camera;
  private navigation: Navigation;
  private world: World;

  private master: GainNode | null = null;
  private motor: GainNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private send: GainNode | null = null;
  private roomba: Source | null = null;
  private tv: Source | null = null;
  private tvVideo: HTMLVideoElement | null = null;
  private sources: AudioScheduledSourceNode[] = [];

  private muted = readMuted();
  private ducked = false;
  private fadeEnds = 0;
  private hidden = document.hidden;
  private blurred = !document.hasFocus();

  private point = new THREE.Vector3();
  private ndc = new THREE.Vector3();
  private ear = new THREE.Vector3();
  private toPoint = new THREE.Vector3();
  private forward = new THREE.Vector3();

  constructor(camera: Camera, navigation: Navigation, world: World) {
    this.camera = camera;
    this.navigation = navigation;
    this.world = world;

    for (const name of START_EVENTS) window.addEventListener(name, this.start, { passive: true });
    window.addEventListener(EVENTS.mute, this.onMute);
    window.addEventListener(EVENTS.crtMode, this.onCrtMode);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);
  }

  // --- Start-up --------------------------------------------------------------

  private start = (): void => {
    for (const name of START_EVENTS) window.removeEventListener(name, this.start);
    if (this.context) return;
    const Ctor: AudioContextClass | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.context = new Ctor();
      this.build(this.context);
    } catch (error) {
      console.warn('[room] audio could not start.', error);
      this.context?.close().catch(() => {});
      this.context = null;
      return;
    }
    if (this.context.state === 'suspended' && !this.hidden && !this.blurred) {
      this.context.resume().catch(() => {});
    }
  };

  private build(context: AudioContext): void {
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0, now);
    if (this.targetLevel() > 0) master.gain.linearRampToValueAtTime(MASTER_LEVEL, now + FADE_IN_S);
    this.fadeEnds = now + FADE_IN_S;
    master.connect(context.destination);
    this.master = master;

    const convolver = context.createConvolver();
    convolver.buffer = roomImpulse(context, IMPULSE_SECONDS);
    convolver.connect(master);

    // Room tone: stands in for the missing room-tone sample.
    const tone = this.loop(context, brownNoise(context, NOISE_SECONDS, ROOM_TONE_LEVEL));
    const toneFilter = new BiquadFilterNode(context, { type: 'lowpass', frequency: ROOM_TONE_LOWPASS });
    const toneGain = new GainNode(context, { gain: ROOM_TONE_GAIN });
    tone.connect(toneFilter).connect(toneGain).connect(master);

    // Roomba: noise band + wobbling hum → motor → 0.22 → (lowpass → panner) + (send → convolver).
    const motor = new GainNode(context, { gain: 0 });
    const noise = this.loop(context, brownNoise(context, NOISE_SECONDS));
    noise
      .connect(new BiquadFilterNode(context, { type: 'bandpass', frequency: ROOMBA_NOISE_BANDPASS, Q: ROOMBA_NOISE_Q }))
      .connect(new GainNode(context, { gain: ROOMBA_NOISE_GAIN }))
      .connect(motor);
    const hum = new OscillatorNode(context, { type: 'sine', frequency: ROOMBA_HUM_HZ });
    for (const lfo of LFOS) {
      const osc = new OscillatorNode(context, { type: 'sine', frequency: lfo.hz });
      osc.connect(new GainNode(context, { gain: lfo.depth })).connect(hum.frequency);
      this.startSource(osc);
    }
    hum.connect(new GainNode(context, { gain: ROOMBA_HUM_GAIN })).connect(motor);
    this.startSource(hum);

    const level = new GainNode(context, { gain: ROOMBA_GAIN });
    const lowpass = new BiquadFilterNode(context, { type: 'lowpass', frequency: LOWPASS_NEAR });
    const panner = new PannerNode(context, PANNER);
    const send = new GainNode(context, { gain: SEND_NEAR });
    motor.connect(level);
    level.connect(lowpass).connect(panner).connect(master);
    level.connect(send).connect(convolver);
    this.motor = motor;
    this.lowpass = lowpass;
    this.send = send;
    this.roomba = { panner };

    this.buildTv(context, convolver);
  }

  /** Only when the TV plays a real video; the generated pattern is silent. */
  private buildTv(context: AudioContext, convolver: ConvolverNode): void {
    const content = this.world.liveScreens.get('screenTV');
    if (!(content instanceof VideoScreen) || !this.master) return;
    const video = content.video;
    const source = context.createMediaElementSource(video);
    const compressor = new DynamicsCompressorNode(context, { threshold: -24, ratio: 3 });
    source
      .connect(new BiquadFilterNode(context, { type: 'highpass', frequency: TV.highpass }))
      .connect(new BiquadFilterNode(context, { type: 'lowpass', frequency: TV.lowpass }))
      .connect(new BiquadFilterNode(context, { type: 'peaking', frequency: TV.peakHz, gain: TV.peakDb }))
      .connect(compressor);
    const out = new GainNode(context, { gain: TV.gain });
    compressor.connect(new GainNode(context, { gain: TV.dry })).connect(out);
    // Own convolver, so the wet path goes through the TV's level and panner (section 9).
    compressor
      .connect(new ConvolverNode(context, { buffer: convolver.buffer }))
      .connect(new GainNode(context, { gain: TV.wet }))
      .connect(out);
    const panner = new PannerNode(context, PANNER);
    out.connect(panner).connect(this.master);
    this.tv = { panner };
    this.tvVideo = video;
    // Unmuted only now that the context exists, so the video never plays out loud on its own.
    video.muted = false;
  }

  private loop(context: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
    const node = new AudioBufferSourceNode(context, { buffer, loop: true });
    this.startSource(node);
    return node;
  }

  private startSource(node: AudioScheduledSourceNode): void {
    node.start();
    this.sources.push(node);
  }

  // --- Level: mute, duck, fade-in ------------------------------------------------

  private targetLevel(): number {
    return this.muted || this.ducked ? 0 : MASTER_LEVEL;
  }

  private applyLevel(): void {
    const context = this.context;
    if (!context || !this.master) return;
    const now = context.currentTime;
    const level = this.targetLevel();
    const gain = this.master.gain;
    gain.cancelScheduledValues(now);
    if (level > 0 && now < this.fadeEnds) {
      // Still inside the start-up fade: carry on to full over the time that is left.
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(level, this.fadeEnds);
      return;
    }
    gain.setTargetAtTime(level, now, level > 0 ? MUTE_UP_S : MUTE_DOWN_S);
  }

  private onMute = (event: Event): void => {
    this.muted = Boolean((event as CustomEvent<MuteDetail>).detail?.muted);
    this.applyLevel();
  };

  private onCrtMode = (event: Event): void => {
    const ducked = (event as CustomEvent<CrtModeDetail>).detail?.phase !== 'idle';
    if (ducked === this.ducked) return;
    this.ducked = ducked;
    this.applyLevel();
  };

  // --- Suspend while away ------------------------------------------------------

  private onVisibility = (): void => {
    this.hidden = document.hidden;
    this.syncRunning();
  };

  private onBlur = (): void => {
    this.blurred = true;
    this.syncRunning();
  };

  private onFocus = (): void => {
    this.blurred = false;
    this.syncRunning();
  };

  private syncRunning(): void {
    const context = this.context;
    if (!context || context.state === 'closed') return;
    if (this.hidden || this.blurred) context.suspend().catch(() => {});
    else context.resume().catch(() => {});
  }

  // --- Per frame ----------------------------------------------------------------

  /** Places the sources from their screen positions. Runs after `navigation.update()`. */
  update(): void {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.roomba || !this.motor) return;
    const now = context.currentTime;

    this.world.roomba.getWorldPosition(this.point);
    const roomba = this.place(this.roomba.panner, this.point, now);
    const far = THREE.MathUtils.clamp((roomba.distance - DIST_NEAR) / (DIST_FAR - DIST_NEAR), 0, 1);
    this.lowpass?.frequency.setTargetAtTime(LOWPASS_NEAR + (LOWPASS_FAR - LOWPASS_NEAR) * far, now, PARAM_SMOOTH_S);
    this.send?.gain.setTargetAtTime(SEND_NEAR + (SEND_FAR - SEND_NEAR) * far, now, PARAM_SMOOTH_S);
    const edgeFade = 1 - smoothstep(0.85, 1.15, Math.abs(roomba.ndcX));
    this.motor.gain.setTargetAtTime(this.world.roomba.motor * edgeFade, now, PARAM_SMOOTH_S);

    if (this.tv) {
      this.world.screens.screenTV.getWorldPosition(this.point);
      this.place(this.tv.panner, this.point, now);
    }
  }

  /**
   * Listener at the origin facing −z; the source goes where the point sits on
   * screen: azimuth from ndc.x (mirrored when behind the camera), elevation
   * from ndc.y, distance from the ear point.
   */
  private place(panner: PannerNode, point: THREE.Vector3, now: number): { ndcX: number; distance: number } {
    const camera = this.camera.instance;
    this.ndc.copy(point).project(camera);
    camera.getWorldDirection(this.forward);
    const behind = this.toPoint.copy(point).sub(camera.position).dot(this.forward) < 0;
    const ndcX = THREE.MathUtils.clamp(this.ndc.x, -1.5, 1.5);
    let azimuth = THREE.MathUtils.clamp(ndcX, -1, 1) * AZIMUTH_RANGE;
    if (behind) azimuth = Math.PI - azimuth;
    const elevation = THREE.MathUtils.clamp(this.ndc.y, -1, 1) * ELEVATION_RANGE;

    this.ear.copy(this.navigation.target.smoothed).lerp(camera.position, EAR_FRACTION);
    const distance = this.ear.distanceTo(point);
    const flat = Math.cos(elevation) * distance;
    panner.positionX.setTargetAtTime(Math.sin(azimuth) * flat, now, PARAM_SMOOTH_S);
    panner.positionY.setTargetAtTime(Math.sin(elevation) * distance, now, PARAM_SMOOTH_S);
    panner.positionZ.setTargetAtTime(-Math.cos(azimuth) * flat, now, PARAM_SMOOTH_S);
    return { ndcX, distance };
  }

  // --- Clean-up -------------------------------------------------------------------

  destroy(): void {
    for (const name of START_EVENTS) window.removeEventListener(name, this.start);
    window.removeEventListener(EVENTS.mute, this.onMute);
    window.removeEventListener(EVENTS.crtMode, this.onCrtMode);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    for (const node of this.sources) {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }
    }
    this.sources = [];
    if (this.tvVideo) this.tvVideo.muted = true;
    this.context?.close().catch(() => {});
    this.context = null;
    this.master = this.motor = this.lowpass = this.send = null;
    this.roomba = this.tv = null;
  }
}

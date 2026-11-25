// The kitchen's sounds: every effect is synthesised with WebAudio, so the
// game ships no audio files and makes no network request.
//
// A lazy AudioContext is created on the first user gesture (browsers block
// sound before one). Each effect is a short oscillator blip or a burst of
// filtered noise; a failed context simply stays silent.

let context = null;
let master = null;

/** Create (or reuse) the audio context after a user gesture. */
export function unlockAudio() {
  try {
    if (!context) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      context = new AudioCtx();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

/** Short tone: frequency slide from `from` to `to` over `seconds`. */
function tone(from, to, seconds, type, volume) {
  if (!context || !master) return;
  try {
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + seconds);
    gain.gain.setValueAtTime(volume || 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  } catch {
    // A sound that cannot play is never worth crashing the game over.
  }
}

/** A burst of filtered noise, for chops, sizzles and the bin lid. */
function noise(seconds, filterFreq, volume) {
  if (!context || !master) return;
  try {
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume || 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  } catch {
    // See tone(): silence is safer than a crash.
  }
}

/** Play one named kitchen effect. Unknown names do nothing. */
export function playEffect(name) {
  if (!context) return;
  switch (name) {
    case 'pickup':
      tone(520, 760, 0.09, 'triangle', 0.45);
      break;
    case 'place':
      tone(340, 240, 0.08, 'triangle', 0.4);
      break;
    case 'chop':
      noise(0.06, 1800, 0.5);
      break;
    case 'chopped':
      tone(660, 880, 0.1, 'triangle', 0.45);
      noise(0.05, 2400, 0.25);
      break;
    case 'sizzle':
      noise(0.35, 5200, 0.3);
      break;
    case 'ding':
      tone(880, 880, 0.18, 'sine', 0.5);
      tone(1318, 1318, 0.22, 'sine', 0.35);
      break;
    case 'serve':
      tone(523, 523, 0.1, 'triangle', 0.5);
      tone(659, 659, 0.1, 'triangle', 0.5);
      tone(784, 784, 0.22, 'triangle', 0.5);
      break;
    case 'wrong':
      tone(220, 140, 0.25, 'square', 0.25);
      break;
    case 'deny':
      tone(180, 150, 0.08, 'square', 0.18);
      break;
    case 'trash':
      noise(0.16, 900, 0.4);
      break;
    case 'burnt':
      tone(160, 90, 0.3, 'sawtooth', 0.22);
      break;
    case 'ladle':
      tone(400, 600, 0.12, 'sine', 0.4);
      break;
    case 'tick':
      tone(980, 980, 0.05, 'square', 0.15);
      break;
    case 'start':
      tone(392, 392, 0.1, 'triangle', 0.45);
      tone(523, 523, 0.1, 'triangle', 0.45);
      tone(659, 659, 0.18, 'triangle', 0.45);
      break;
    default:
      break;
  }
}

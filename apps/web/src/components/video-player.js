import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { icon } from '../lib/icons.js';
import { formatTime } from '../lib/format.js';
import { app, actions } from '../store.js';

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const bufferedRanges = (m) => {
  const d = m.duration;
  if (!d || !Number.isFinite(d)) return [];
  const out = [];
  for (let i = 0; i < m.buffered.length; i++) {
    const s = m.buffered.start(i);
    const e = m.buffered.end(i);
    out.push({ left: (s / d) * 100, width: ((e - s) / d) * 100 });
  }
  return out;
};

const fresh = () => ({
  playing: false,
  waiting: true,
  ended: false,
  current: 0,
  duration: 0,
  buffered: [],
  hover: null,
  active: true,
  menu: false,
  countdown: null,
  flash: null,
});

/**
 * <video-player .video=${v} .startAt=${seconds} .next=${{ video, href }}>
 * Custom controls over a plain <video> whose src is a range-streamed endpoint.
 * Events: player-started, player-progress {position, duration}, player-next.
 */
class VideoPlayer extends Component {
  static props = ['video', 'startAt', 'next'];
  static styles = [
    shared,
    css`
      :host { position: relative; background: #000; color: #fff; overflow: hidden; user-select: none; }
      :host(:fullscreen) { width: 100vw; height: 100vh; }
      .player { position: absolute; inset: 0; }
      video { width: 100%; height: 100%; display: block; object-fit: contain; background: #000; }
      .player.idle { cursor: none; }

      .spinner {
        position: absolute; left: 50%; top: 50%; width: 56px; height: 56px; margin: -28px 0 0 -28px;
        border: 4px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%;
        animation: spin .8s linear infinite; pointer-events: none;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .flash {
        position: absolute; left: 50%; top: 50%; width: 64px; height: 64px; margin: -32px 0 0 -32px;
        border-radius: 50%; background: rgba(0,0,0,.6); display: grid; place-items: center;
        animation: flash .6s ease-out forwards; pointer-events: none;
      }
      .flash svg.i { width: 36px; height: 36px; }
      .flash.text { width: auto; padding: 0 16px; margin-left: 0; transform: translateX(-50%); border-radius: 24px; height: 40px; font-size: 16px; }
      @keyframes flash { from { opacity: 1; } to { opacity: 0; transform: scale(1.4); } }
      .flash.text { animation-name: flashtext; }
      @keyframes flashtext { from { opacity: 1; } 70% { opacity: 1; } to { opacity: 0; } }

      .controls {
        position: absolute; left: 0; right: 0; bottom: 0; padding: 0 12px;
        background: linear-gradient(transparent, rgba(0,0,0,.7));
        transition: opacity .25s;
      }
      .player.idle .controls { opacity: 0; }

      .bar { position: relative; height: 16px; display: flex; align-items: center; cursor: pointer; touch-action: none; }
      .track { position: relative; width: 100%; height: 3px; background: rgba(255,255,255,.2); transition: height .1s; }
      .bar:hover .track, .bar.drag .track { height: 5px; }
      .track > div { position: absolute; top: 0; bottom: 0; }
      .buf { background: rgba(255,255,255,.4); }
      .hov { background: rgba(255,255,255,.5); left: 0; }
      .played { background: var(--accent); left: 0; }
      .knob {
        position: absolute; top: 50%; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px; border-radius: 50%;
        background: var(--accent); transform: scale(0); transition: transform .1s;
      }
      .bar:hover .knob, .bar.drag .knob { transform: scale(1); }
      .tooltip {
        position: absolute; bottom: 22px; transform: translateX(-50%); padding: 4px 8px; border-radius: 4px;
        background: rgba(0,0,0,.8); font-size: 13px; font-weight: 500; white-space: nowrap; pointer-events: none;
      }

      .row { display: flex; align-items: center; height: 48px; gap: 4px; }
      .row button { width: 44px; height: 44px; display: grid; place-items: center; opacity: .92; border-radius: 50%; }
      .row button:hover { opacity: 1; }
      .row svg.i { width: 28px; height: 28px; }
      .time { font-size: 13px; padding: 0 8px; white-space: nowrap; font-variant-numeric: tabular-nums; }
      .spacer { flex: 1; }
      .vol { display: flex; align-items: center; }
      .vol-slider { width: 0; overflow: hidden; transition: width .2s; height: 44px; display: flex; align-items: center; cursor: pointer; touch-action: none; }
      .vol:hover .vol-slider, .vol-slider.drag { width: 64px; padding: 0 6px; }
      .vol-track { position: relative; width: 100%; height: 3px; background: rgba(255,255,255,.3); }
      .vol-track div { position: absolute; left: 0; top: 0; bottom: 0; background: #fff; }
      .vol-track span { position: absolute; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #fff; }
      .rate-btn { font-size: 14px; font-weight: 500; width: auto !important; padding: 0 8px; border-radius: 16px !important; }
      .menu {
        position: absolute; right: 12px; bottom: 60px; padding: 8px 0; border-radius: 12px;
        background: rgba(28,28,28,.92); min-width: 160px; font-size: 14px;
      }
      .menu h4 { margin: 0; padding: 8px 16px; font-size: 14px; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,.2); margin-bottom: 4px; }
      .menu button { display: flex; align-items: center; gap: 12px; width: 100%; height: 36px; padding: 0 16px; text-align: left; }
      .menu button:hover { background: rgba(255,255,255,.1); }
      .menu svg.i { width: 18px; height: 18px; }
      .menu .none { width: 18px; }

      .endscreen {
        position: absolute; inset: 0; background: rgba(0,0,0,.75); display: grid; place-items: center; text-align: center;
      }
      .endscreen .box { display: grid; gap: 12px; justify-items: center; max-width: 360px; padding: 16px; }
      .endscreen small { color: #aaa; font-size: 14px; }
      .endscreen h3 { margin: 0; font-size: 18px; font-weight: 500; }
      .endscreen img { width: 240px; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; }
      .endscreen .btns { display: flex; gap: 12px; }
      .endscreen .btns button { height: 36px; padding: 0 18px; border-radius: 18px; background: rgba(255,255,255,.15); font-weight: 500; }
      .endscreen .btns button.primary { background: #fff; color: #000; }
      .replay { position: absolute; inset: 0; display: grid; place-items: center; }
      .replay button { width: 72px; height: 72px; border-radius: 50%; background: rgba(0,0,0,.6); display: grid; place-items: center; }
      .replay svg.i { width: 44px; height: 44px; }
    `,
  ];

  state = fresh();

  propChanged(name, v, old) {
    if (name === 'video' && v?.id !== old?.id) {
      this.stopCountdown();
      this.state = fresh();
      this.started = false;
      this.lastSaved = 0;
    }
  }

  get media() {
    return this.$('video');
  }

  onMount() {
    this.use(app, (s) => s.theater);
    this.on(document, 'keydown', this.onKey);
    this.on(document, 'fullscreenchange', () => this.update());
  }

  onUnmount() {
    this.stopCountdown();
    clearTimeout(this.idleTimer);
    this.saveProgress();
  }

  // ---- media events ------------------------------------------------------

  onLoadedMetadata = (e) => {
    const m = e.target;
    const { volume, muted } = app.get();
    m.volume = volume;
    m.muted = muted;
    m.playbackRate = this.rate ?? 1;
    const s = this.startAt;
    if (s && s > 3 && s < m.duration - 5) m.currentTime = s;
    this.setState({ duration: m.duration, current: m.currentTime });
    m.play().catch(() => this.setState({ playing: false, waiting: false }));
  };

  onTimeUpdate = (e) => {
    const m = e.target;
    this.setState({ current: m.currentTime, buffered: bufferedRanges(m) });
    if (Math.abs(m.currentTime - this.lastSaved) >= 5) this.saveProgress();
  };

  onPlay = () => {
    this.setState({ playing: true, ended: false });
    this.stopCountdown();
    this.poke();
    if (!this.started) {
      this.started = true;
      this.emit('player-started', { id: this.video.id });
    }
  };

  onPause = () => {
    this.setState({ playing: false, active: true });
    this.saveProgress();
  };

  onEnded = () => {
    this.setState({ playing: false, ended: true, active: true });
    this.saveProgress();
    if (this.next && app.get().autoplay) this.startCountdown();
  };

  saveProgress() {
    const m = this.media;
    if (!m || !this.video || !m.duration || !Number.isFinite(m.duration)) return;
    this.lastSaved = m.currentTime;
    this.emit('player-progress', { id: this.video.id, position: m.currentTime, duration: m.duration });
  }

  // ---- autoplay countdown -----------------------------------------------

  startCountdown() {
    this.stopCountdown();
    this.setState({ countdown: 5 });
    this.countdownTimer = setInterval(() => {
      const n = this.state.countdown - 1;
      if (n <= 0) this.goNext();
      else this.setState({ countdown: n });
    }, 1000);
  }

  stopCountdown() {
    clearInterval(this.countdownTimer);
    this.countdownTimer = null;
    if (this.state.countdown != null) this.setState({ countdown: null });
  }

  goNext() {
    this.stopCountdown();
    if (this.next) this.emit('player-next', this.next);
  }

  // ---- controls -----------------------------------------------------------

  togglePlay() {
    const m = this.media;
    if (!m) return;
    if (m.paused || m.ended) m.play().catch(() => {});
    else m.pause();
    this.flash(m.paused ? 'pause' : 'play');
  }

  flash(name, text) {
    this.setState({ flash: { name, text, id: Math.random() } });
  }

  seekBy(sec) {
    const m = this.media;
    if (!m?.duration) return;
    m.currentTime = Math.max(0, Math.min(m.duration, m.currentTime + sec));
    this.setState({ current: m.currentTime });
    this.flash(null, `${sec > 0 ? '+' : ''}${sec}s`);
  }

  setVolume(volume, muted = volume === 0) {
    const m = this.media;
    volume = Math.max(0, Math.min(1, volume));
    if (m) {
      m.volume = volume;
      m.muted = muted;
    }
    actions.setVolume(volume, muted);
    this.update();
  }

  toggleMute() {
    const { volume, muted } = app.get();
    this.setVolume(volume || 0.5, !muted);
  }

  setRate(rate) {
    if (this.media) this.media.playbackRate = rate;
    this.rate = rate;
    this.setState({ menu: false });
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else this.requestFullscreen?.().catch(() => {});
  }

  // Hide controls after inactivity while playing.
  poke = () => {
    if (!this.state.active) this.setState({ active: true });
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.state.playing && !this.state.menu && !this.dragging) this.setState({ active: false });
    }, 2500);
  };

  // ---- scrubbing ----------------------------------------------------------

  fraction(e, el) {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  }

  onBarDown = (e, el) => {
    if (e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    this.dragging = 'seek';
    this.seekTo(this.fraction(e, el));
  };

  onBarMove = (e, el) => {
    const f = this.fraction(e, el);
    this.setState({ hover: f });
    if (this.dragging === 'seek') this.seekTo(f);
  };

  onBarUp = () => {
    this.dragging = null;
    this.update();
  };

  seekTo(f) {
    const m = this.media;
    if (!m?.duration) return;
    m.currentTime = f * m.duration;
    this.setState({ current: m.currentTime, ended: false });
  }

  onVolDown = (e, el) => {
    if (e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    this.dragging = 'vol';
    this.setVolume(this.fraction(e, el));
  };

  onVolMove = (e, el) => {
    if (this.dragging === 'vol') this.setVolume(this.fraction(e, el));
  };

  // ---- keyboard shortcuts -------------------------------------------------

  onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.composedPath()[0];
    if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName)) return;
    const m = this.media;
    if (!m) return;
    const key = e.key.toLowerCase();
    const handled = {
      ' ': () => this.togglePlay(),
      k: () => this.togglePlay(),
      j: () => this.seekBy(-10),
      l: () => this.seekBy(10),
      arrowleft: () => this.seekBy(-5),
      arrowright: () => this.seekBy(5),
      arrowup: () => this.setVolume(app.get().volume + 0.05, false),
      arrowdown: () => this.setVolume(app.get().volume - 0.05),
      m: () => this.toggleMute(),
      f: () => this.toggleFullscreen(),
      t: () => actions.toggleTheater(),
      n: () => e.shiftKey && this.goNext(),
    }[key];
    if (handled) {
      e.preventDefault();
      handled();
    } else if (/^[0-9]$/.test(key) && m.duration) {
      m.currentTime = (Number(key) / 10) * m.duration;
    } else return;
    this.poke();
  };

  // ---- render -------------------------------------------------------------

  renderEnd() {
    const { ended, countdown } = this.state;
    if (!ended) return '';
    const next = this.next;
    if (next && countdown != null) {
      return html`<div class="endscreen">
        <div class="box">
          <small>Up next in ${countdown}</small>
          ${next.video.thumbnail ? html`<img src="${next.video.thumbnail}" alt="" />` : ''}
          <h3>${next.video.title}</h3>
          <small>${next.video.channel}</small>
          <div class="btns">
            <button @click=${() => this.stopCountdown()}>Cancel</button>
            <button class="primary" @click=${() => this.goNext()}>Play now</button>
          </div>
        </div>
      </div>`;
    }
    return html`<div class="replay"><button aria-label="Replay" @click=${() => this.togglePlay()}>${icon('replay')}</button></div>`;
  }

  render() {
    const v = this.video;
    if (!v) return html``;
    const { playing, waiting, current, duration, buffered, hover, active, menu, flash, ended } = this.state;
    const { volume, muted, theater } = app.get();
    const vol = muted ? 0 : volume;
    const pct = duration ? (current / duration) * 100 : 0;
    const fs = document.fullscreenElement === this;
    const idle = playing && !active && !menu;
    const rate = this.rate ?? 1;

    return html`
      <div class="player ${idle ? 'idle' : ''}" @mousemove=${this.poke} @mouseleave=${() => playing && this.setState({ active: false })}
        @contextmenu=${(e) => e.preventDefault()}>
        <video
          src="${v.stream}"
          poster="${v.thumbnail ?? ''}"
          preload="auto"
          playsinline
          controlslist="nodownload noremoteplayback"
          disableremoteplayback
          @loadedmetadata=${this.onLoadedMetadata}
          @timeupdate=${this.onTimeUpdate}
          @progress=${(e) => this.setState({ buffered: bufferedRanges(e.target) })}
          @play=${this.onPlay}
          @pause=${this.onPause}
          @ended=${this.onEnded}
          @waiting=${() => this.setState({ waiting: true })}
          @playing=${() => this.setState({ waiting: false })}
          @canplay=${() => this.setState({ waiting: false })}
          @click=${() => this.togglePlay()}
          @dblclick=${() => this.toggleFullscreen()}
        ></video>

        ${waiting && !ended ? html`<div class="spinner"></div>` : ''}
        ${flash ? html`<div class="flash ${flash.text ? 'text' : ''}" key="${flash.id}">${flash.text ?? icon(flash.name)}</div>` : ''}
        ${this.renderEnd()}

        <div class="controls">
          <div class="bar ${this.dragging === 'seek' ? 'drag' : ''}" role="slider" aria-label="Seek slider"
            aria-valuemin="0" aria-valuemax="${Math.round(duration)}" aria-valuenow="${Math.round(current)}"
            @pointerdown=${this.onBarDown} @pointermove=${this.onBarMove} @pointerup=${this.onBarUp}
            @pointerleave=${() => this.setState({ hover: null })}>
            <div class="track">
              ${buffered.map((b) => html`<div class="buf" style="left:${b.left}%;width:${b.width}%"></div>`)}
              ${hover != null ? html`<div class="hov" style="width:${hover * 100}%"></div>` : ''}
              <div class="played" style="width:${pct}%"></div>
            </div>
            <div class="knob" style="left:${pct}%"></div>
            ${hover != null && duration
              ? html`<div class="tooltip" style="left:clamp(24px, ${hover * 100}%, calc(100% - 24px))">${formatTime(hover * duration)}</div>`
              : ''}
          </div>

          <div class="row">
            <button aria-label="${playing ? 'Pause (k)' : 'Play (k)'}" title="${playing ? 'Pause (k)' : 'Play (k)'}" @click=${() => this.togglePlay()}>
              ${icon(ended ? 'replay' : playing ? 'pause' : 'play')}
            </button>
            ${this.next
              ? html`<button aria-label="Next (SHIFT+n)" title="Next (SHIFT+n)" @click=${() => this.goNext()}>${icon('next')}</button>`
              : ''}
            <div class="vol">
              <button aria-label="${vol ? 'Mute (m)' : 'Unmute (m)'}" title="${vol ? 'Mute (m)' : 'Unmute (m)'}" @click=${() => this.toggleMute()}>
                ${icon(vol === 0 ? 'volumeOff' : vol < 0.5 ? 'volumeLow' : 'volume')}
              </button>
              <div class="vol-slider ${this.dragging === 'vol' ? 'drag' : ''}" role="slider" aria-label="Volume"
                aria-valuenow="${Math.round(vol * 100)}"
                @pointerdown=${this.onVolDown} @pointermove=${this.onVolMove} @pointerup=${this.onBarUp}>
                <div class="vol-track"><div style="width:${vol * 100}%"></div><span style="left:${vol * 100}%"></span></div>
              </div>
            </div>
            <span class="time">${formatTime(current)} / ${formatTime(duration || v.duration)}</span>
            <span class="spacer"></span>
            <button class="rate-btn" aria-label="Playback speed" title="Playback speed" @click=${() => this.setState({ menu: !menu })}>
              ${rate === 1 ? icon('speed') : `${rate}×`}
            </button>
            <button aria-label="${theater ? 'Default view (t)' : 'Theater mode (t)'}" title="${theater ? 'Default view (t)' : 'Theater mode (t)'}"
              @click=${() => actions.toggleTheater()}>${icon('theater')}</button>
            <button aria-label="${fs ? 'Exit full screen (f)' : 'Full screen (f)'}" title="${fs ? 'Exit full screen (f)' : 'Full screen (f)'}"
              @click=${() => this.toggleFullscreen()}>${icon(fs ? 'fullscreenExit' : 'fullscreen')}</button>
          </div>
        </div>

        ${menu
          ? html`<div class="menu" role="menu">
              <h4>Playback speed</h4>
              ${RATES.map(
                (r) => html`<button role="menuitemradio" aria-checked="${r === rate ? 'true' : 'false'}" @click=${() => this.setRate(r)}>
                  ${r === rate ? icon('check') : html`<span class="none"></span>`}${r === 1 ? 'Normal' : r}
                </button>`,
              )}
            </div>`
          : ''}
      </div>
    `;
  }
}

define('video-player', VideoPlayer);

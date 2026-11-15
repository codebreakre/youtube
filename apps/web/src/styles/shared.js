import { css } from 'mini';

/** Base styles adopted by every component's shadow root. */
export const shared = css`
  :host { display: block; box-sizing: border-box; font-family: var(--font); color: var(--text); }
  *, *::before, *::after { box-sizing: inherit; }
  [hidden] { display: none !important; }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
  input { font: inherit; color: inherit; }
  img { display: block; }
  :focus-visible { outline: 2px solid #3ea6ff; outline-offset: 2px; }

  svg.i { width: 24px; height: 24px; fill: currentColor; flex: none; display: block; }
  svg.i.sm { width: 20px; height: 20px; }

  .icon-btn {
    width: 40px; height: 40px; border-radius: 50%;
    display: inline-grid; place-items: center; flex: none;
    transition: background-color .1s;
  }
  .icon-btn:hover { background: var(--bg-soft); }
  .icon-btn:active { background: var(--bg-hover); }

  .pill {
    height: 36px; padding: 0 16px; border-radius: 18px;
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--bg-soft); font-size: 14px; font-weight: 500; white-space: nowrap;
    transition: background-color .1s;
  }
  .pill:hover { background: var(--bg-hover); }
  .pill.primary { background: var(--text); color: var(--bg); }
  .pill.primary:hover { opacity: .85; }
  .pill.on svg { color: var(--accent); }

  .avatar {
    border-radius: 50%; display: inline-grid; place-items: center; flex: none;
    color: #fff; font-weight: 500; user-select: none;
  }
  .muted { color: var(--text-2); }
  .clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .skeleton { background: var(--skeleton); border-radius: 8px; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .45; } }

  .empty {
    display: grid; justify-items: center; gap: 12px; text-align: center;
    padding: 80px 24px; color: var(--text-2);
  }
  .empty svg.i { width: 96px; height: 96px; opacity: .5; }
  .empty h2 { margin: 0; color: var(--text); font-size: 20px; font-weight: 500; }
  .empty p { margin: 0; max-width: 460px; line-height: 1.5; }
  .empty code { background: var(--bg-soft); padding: 2px 6px; border-radius: 4px; }
`;

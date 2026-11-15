import { Component, define, html, css } from 'mini';
import { shared } from '../styles/shared.js';
import { app } from '../store.js';

class ToastHost extends Component {
  static styles = [
    shared,
    css`
      .toast {
        position: fixed; left: 12px; bottom: 24px; z-index: 300;
        display: flex; align-items: center; gap: 24px; min-width: 288px; max-width: 560px;
        padding: 14px 16px; border-radius: 8px; font-size: 14px;
        background: var(--text); color: var(--bg); box-shadow: var(--shadow);
        animation: up .2s ease-out;
      }
      .toast span { flex: 1; }
      .toast button { color: #3ea6ff; font-weight: 500; padding: 6px 10px; border-radius: 18px; }
      :host-context([data-theme='light']) .toast button { color: #8fc9ff; }
      .toast button:hover { background: rgba(127,127,127,.2); }
      @keyframes up { from { transform: translateY(20px); opacity: 0; } }
    `,
  ];

  state = { toast: null };

  onMount() {
    this.subscribe(app, (s) => {
      if (s.toast && s.toast !== this.state.toast) {
        clearTimeout(this.timer);
        this.setState({ toast: s.toast });
        this.timer = setTimeout(() => this.setState({ toast: null }), 4000);
      }
    });
  }

  onUnmount() {
    clearTimeout(this.timer);
  }

  render() {
    const t = this.state.toast;
    if (!t) return html``;
    return html`<div class="toast" role="status" key="${t.id}">
      <span>${t.message}</span>
      ${t.action
        ? html`<button @click=${() => { this.setState({ toast: null }); t.action.run(); }}>${t.action.label}</button>`
        : ''}
    </div>`;
  }
}

define('toast-host', ToastHost);

import { Component, define, html, raw, css } from 'mini';
import { shared } from '../styles/shared.js';
import { router } from '../router.js';
import { app, actions } from '../store.js';

/** Application shell: top bar, guide (side nav), routed page, toasts. */
class AppRoot extends Component {
  static styles = [
    shared,
    css`
      .layout { display: flex; align-items: flex-start; padding-top: var(--topbar-h); }
      main { flex: 1; min-width: 0; }
    `,
  ];

  onMount() {
    this.wide = matchMedia('(min-width: 1312px)');
    this.mid = matchMedia('(min-width: 792px)');
    const refresh = () => this.update();
    this.on(this.wide, 'change', refresh);
    this.on(this.mid, 'change', refresh);

    this.use(router.store, (r) => r.route);
    this.use(app, (s) => s.guideCollapsed);
    this.subscribe(router.store, () => actions.closeDrawer());
    actions.loadMe();
  }

  guideVariant() {
    if (router.store.get().route?.name === 'watch') return 'none';
    if (this.wide.matches) return app.get().guideCollapsed ? 'mini' : 'full';
    if (this.mid.matches) return 'mini';
    return 'none';
  }

  render() {
    const tag = router.store.get().route?.component ?? 'page-not-found';
    return html`
      <top-bar></top-bar>
      <div class="layout">
        <side-nav variant="${this.guideVariant()}"></side-nav>
        <main>${raw(`<${tag}></${tag}>`)}</main>
      </div>
      <toast-host></toast-host>
    `;
  }
}

define('app-root', AppRoot);

import { Component, define, html } from 'mini';
import { shared } from '../styles/shared.js';
import { icon } from '../lib/icons.js';

class PageNotFound extends Component {
  static styles = [shared];

  onMount() {
    document.title = 'Not found - Vidora';
  }

  render() {
    return html`<div class="empty">${icon('video')}<h2>This page isn't available.</h2>
      <p>Sorry about that. Try searching for something else.</p><a class="pill" href="/">Go home</a></div>`;
  }
}

define('page-not-found', PageNotFound);

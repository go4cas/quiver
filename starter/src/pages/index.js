import { html } from '@arrow-js/core'
import { Counter } from '../components/Counter.js'
import { userState } from '../state/userState.js'

export const meta = {
  layout: 'menu',
  nav: { label: 'Dashboard', order: 1 },
  title: 'Dashboard',
}

function HomePage() {
  return html`
    <div class="page">
      <div>
        <h1 class="page__title">Dashboard</h1>
        <p class="page__lead">Two scopes side by side — global store state and local component state.</p>
        <div class="chips">
          <span class="chip q-accent" data-tone="brand">reactive()</span>
          <span class="chip">watch()</span>
          <span class="chip">onCleanup()</span>
          <span class="chip">component()</span>
        </div>
      </div>

      <section class="section">
        <div>
          <div class="section__head">
            <h2 class="section__title">Live metrics</h2>
            <span class="tag q-accent">global store</span>
          </div>
          <p class="section__note">Read from <code>userState</code> — shared across all routes. Navigate to Team, add or remove a member, and these numbers update instantly.</p>
        </div>
        <div class="grid" data-cols="3">
          <div data-testid="metric-card" class="card metric q-panel">
            <p class="metric__label">Team members</p>
            <p class="metric__value">${() => userState.users.length}</p>
            <p class="metric__note q-accent" data-tone="brand">userState.users.length</p>
          </div>
          <div data-testid="metric-card" class="card metric q-panel">
            <p class="metric__label">Online</p>
            <p class="metric__value">${() => userState.users.filter((u) => u.status === 'online').length}</p>
            <p class="metric__note">derived · filter()</p>
          </div>
          <div data-testid="metric-card" class="card metric q-panel">
            <p class="metric__label">Away</p>
            <p class="metric__value">${() => userState.users.filter((u) => u.status === 'away').length}</p>
            <p class="metric__note">derived · filter()</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div>
          <div class="section__head">
            <h2 class="section__title">Interactive components</h2>
            <span class="tag q-accent">local state</span>
          </div>
          <p class="section__note">Each Counter holds its own count — isolated per instance, invisible to the rest of the app. State is lost when the component unmounts (navigating away resets it).</p>
        </div>
        <div class="grid" data-cols="2">${Counter({ label: 'Tickets Resolved' })} ${Counter({ label: 'Replies Drafted' })}</div>
      </section>
    </div>
  `
}

export default HomePage

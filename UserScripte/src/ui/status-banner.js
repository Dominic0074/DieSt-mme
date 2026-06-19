import { formatDuration } from '../utils/time.js';

export class StatusBanner {
  /**
   * @param {import('../types/global-state.js').AppState} state
   */
  constructor(state) {
    this.state = state;
    this.root = null;
  }

  mount() {
    if (document.getElementById('ds-oo-status-banner')) {
      this.root = document.getElementById('ds-oo-status-banner');
      this.update();
      return;
    }

    this.injectStyle();

    const root = document.createElement('div');
    root.id = 'ds-oo-status-banner';
    root.innerHTML = `
      <div class="ds-oo-title">DS Auto</div>
      <div class="ds-oo-line"><span>Seite</span><strong data-field="page">-</strong></div>
      <div class="ds-oo-line"><span>Raubzug</span><strong data-field="raid">-</strong></div>
      <div class="ds-oo-line ds-oo-line-top"><span>Fertig</span><strong class="ds-oo-multiline" data-field="scavengeFinished">-</strong></div>
      <div class="ds-oo-line"><span>Rekrutierung</span><strong data-field="recruit">-</strong></div>
      <div class="ds-oo-line"><span>Status</span><strong data-field="status">-</strong></div>
    `;

    document.body.appendChild(root);
    this.root = root;
    this.update();
  }

  update() {
    if (!this.root) return;

    this.setField('page', this.state.page.name);
    this.setField('raid', this.formatRaidStatus());
    this.setField('scavengeFinished', this.formatScavengeFinished());
    this.setField('recruit', this.state.recruit.enabled ? 'aktiv' : 'aus');
    this.setField('status', this.state.runtime.botProtectionTriggered ? 'gestoppt' : 'ok');
  }

  formatRaidStatus() {
    if (!this.state.raid.enabled) return 'aus';
    const activeCount = this.getActiveReadyEntries().length;
    return activeCount > 0 ? `${activeCount} unterwegs` : 'bereit';
  }

  formatScavengeFinished() {
    const lines = [1, 2, 3, 4]
      .map(slot => this.formatScavengeSlotLine(slot))
      .filter(Boolean);

    return lines.length > 0 ? lines.join('\n') : '-';
  }

  formatScavengeSlotLine(slot) {
    const timestamp = Number(this.state.scavenge.readyTimes?.[slot]);
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
    return `${slot}: ${formatDuration(timestamp - Date.now())}`;
  }

  getActiveReadyEntries() {
    return Object.entries(this.state.scavenge.readyTimes || {})
      .map(([slot, timestamp]) => [slot, Number(timestamp)])
      .filter(([, timestamp]) => Number.isFinite(timestamp) && timestamp > Date.now());
  }

  setField(name, value) {
    const node = this.root?.querySelector(`[data-field="${name}"]`);
    if (node) node.textContent = String(value);
  }

  injectStyle() {
    if (document.getElementById('ds-oo-status-style')) return;

    const style = document.createElement('style');
    style.id = 'ds-oo-status-style';
    style.textContent = `
      #ds-oo-status-banner {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 99999;
        width: 230px;
        padding: 10px;
        border: 1px solid #6f5635;
        background: rgba(248, 244, 232, 0.96);
        color: #2f2417;
        font: 12px Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
      }
      #ds-oo-status-banner .ds-oo-title {
        margin-bottom: 6px;
        font-weight: bold;
        font-size: 13px;
        color: #5b2d14;
      }
      #ds-oo-status-banner .ds-oo-line {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        line-height: 1.55;
        white-space: nowrap;
      }
      #ds-oo-status-banner .ds-oo-line-top {
        align-items: flex-start;
      }
      #ds-oo-status-banner .ds-oo-line span {
        flex: 0 0 auto;
        color: #6f5635;
      }
      #ds-oo-status-banner .ds-oo-line strong {
        overflow: hidden;
        max-width: 128px;
        text-align: right;
        text-overflow: ellipsis;
      }
      #ds-oo-status-banner .ds-oo-multiline {
        white-space: pre-line;
        line-height: 1.35;
      }
    `;
    document.head.appendChild(style);
  }
}
const BANNER_ID = 'ds-mass-recruting-status-banner';
const STYLE_ID = 'ds-mass-recruting-status-style';

export class StatusBanner {
  /**
   * @param {{ runtime: { botProtectionTriggered: boolean, botProtectionLastCheckAt: number | null } }} state
   */
  constructor(state) {
    this.state = state;
    this.root = null;
  }

  mount() {
    if (document.getElementById(BANNER_ID)) {
      this.root = document.getElementById(BANNER_ID);
      this.update();
      return;
    }

    this.injectStyle();

    const root = document.createElement('div');
    root.id = BANNER_ID;
    root.innerHTML = `
      <div class="ds-mr-title">Mass Recruting</div>
      <div class="ds-mr-line">
        <span>Botschutz</span>
        <strong data-field="botProtection">-</strong>
      </div>
      <div class="ds-mr-line">
        <span>Letzter Check</span>
        <strong data-field="lastCheck">-</strong>
      </div>
    `;

    document.body.appendChild(root);
    this.root = root;
    this.update();
  }

  update() {
    if (!this.root) return;

    const isTriggered = this.state.runtime.botProtectionTriggered;
    this.root.classList.toggle('is-stopped', isTriggered);
    this.setField('botProtection', isTriggered ? 'erkannt' : 'ok');
    this.setField('lastCheck', this.formatLastCheck());
  }

  formatLastCheck() {
    const timestamp = this.state.runtime.botProtectionLastCheckAt;
    if (!timestamp) return '-';

    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  setField(name, value) {
    const node = this.root?.querySelector(`[data-field="${name}"]`);
    if (node) node.textContent = String(value);
  }

  injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BANNER_ID} {
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
      #${BANNER_ID}.is-stopped {
        border-color: #a40000;
        background: rgba(243, 199, 199, 0.96);
      }
      #${BANNER_ID} .ds-mr-title {
        margin-bottom: 6px;
        font-weight: bold;
        font-size: 13px;
        color: #5b2d14;
      }
      #${BANNER_ID} .ds-mr-line {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        line-height: 1.55;
        white-space: nowrap;
      }
      #${BANNER_ID} .ds-mr-line span {
        flex: 0 0 auto;
        color: #6f5635;
      }
      #${BANNER_ID} .ds-mr-line strong {
        overflow: hidden;
        max-width: 128px;
        text-align: right;
        text-overflow: ellipsis;
      }
    `;
    document.head.appendChild(style);
  }
}

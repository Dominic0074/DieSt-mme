const STATUS_ID = 'ds-angriffs-planer-status';

export class StatusBanner {
  show(text, isError = false) {
    const box = this.getOrCreate();
    box.classList.toggle('is-error', isError);
    box.textContent = `AngriffsPlaner: ${text}`;
  }

  error(text) {
    this.show(text, true);
  }

  getOrCreate() {
    let box = document.getElementById(STATUS_ID);
    if (box) return box;

    this.injectStyle();
    box = document.createElement('div');
    box.id = STATUS_ID;
    document.body.appendChild(box);
    return box;
  }

  injectStyle() {
    if (document.getElementById(`${STATUS_ID}-style`)) return;

    const style = document.createElement('style');
    style.id = `${STATUS_ID}-style`;
    style.textContent = `
      #${STATUS_ID} {
        position: fixed;
        right: 12px;
        top: 12px;
        z-index: 10000;
        max-width: 360px;
        padding: 10px 14px;
        border: 1px solid #7d510f;
        border-radius: 4px;
        background: #f4e4bc;
        color: #2f2416;
        font: bold 13px Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      }
      #${STATUS_ID}.is-error {
        border-color: #a40000;
        background: #f3c7c7;
      }
    `;
    document.head.appendChild(style);
  }
}

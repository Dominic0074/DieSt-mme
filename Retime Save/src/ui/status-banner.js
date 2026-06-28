const STATUS_ID = 'retime-save-status';

export class StatusBanner {
  show(text, isError = false) {
    const box = this.getOrCreate();
    box.style.background = isError ? '#f3c7c7' : '#f4e4bc';
    box.style.borderColor = isError ? '#a40000' : '#7d510f';
    box.textContent = `Retime Save: ${text}`;
  }

  error(text) {
    this.show(text, true);
  }

  getOrCreate() {
    let box = document.getElementById(STATUS_ID);
    if (box) return box;

    box = document.createElement('div');
    box.id = STATUS_ID;
    Object.assign(box.style, {
      position: 'fixed',
      right: '12px',
      top: '12px',
      zIndex: '10000',
      maxWidth: '360px',
      padding: '10px 14px',
      border: '1px solid #7d510f',
      borderRadius: '4px',
      background: '#f4e4bc',
      color: '#2f2416',
      font: 'bold 13px Arial, sans-serif',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)'
    });
    document.body.appendChild(box);
    return box;
  }
}

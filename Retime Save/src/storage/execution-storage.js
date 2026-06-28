export class ExecutionStorage {
  constructor({ sourceVillageId, target }) {
    this.sourceVillageId = sourceVillageId || 'unknown';
    this.target = target;
  }

  getSentKey(sendAt) {
    return [
      'retime_save_sent_v1',
      this.sourceVillageId,
      `${this.target.x}|${this.target.y}`,
      sendAt
    ].join(':');
  }

  getPreparedKey(sendAt) {
    return this.getSentKey(sendAt).replace(
      'retime_save_sent_v1',
      'retime_save_prepared_v1'
    );
  }

  wasSent(sendAt) {
    return Boolean(localStorage.getItem(this.getSentKey(sendAt)));
  }

  markSent(sendAt, sentAt) {
    localStorage.setItem(this.getSentKey(sendAt), String(sentAt));
  }

  markFirstClick(sendAt, clickedAt) {
    sessionStorage.setItem(this.getPreparedKey(sendAt), String(clickedAt));
  }

  getFirstClickAt(sendAt) {
    return Number(sessionStorage.getItem(this.getPreparedKey(sendAt)));
  }

  clearFirstClick(sendAt) {
    sessionStorage.removeItem(this.getPreparedKey(sendAt));
  }
}

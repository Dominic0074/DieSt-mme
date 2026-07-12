export function createDefaultState() {
  return {
    runtime: {
      botProtectionTriggered: false,
      botProtectionLastCheckAt: null,
      running: false,
      status: 'bereit'
    }
  };
}

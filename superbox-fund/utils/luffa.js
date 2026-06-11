/**
 * Promise wrapper around wx.invokeNativePlugin for Luffa SuperBox native bridge.
 * Used by:
 *   - app.js onLaunch  → 'language'
 *   - cockpit page     → 'connect' (PM identity for signing调仓单)
 *   - rotation page    → 'signMessageV2' (sign rotation proposal hash)
 *
 * Never auto-retry on REJECTED — user dismissed the wallet popup.
 */

export function luffa(methodName, data = {}) {
  return new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || !wx.invokeNativePlugin) {
      reject(new Error('wx.invokeNativePlugin is unavailable. Run inside Luffa Cloud-Devtools or a real Luffa client.'));
      return;
    }
    wx.invokeNativePlugin({
      api_name: 'luffaWebRequest',
      data: { methodName, ...data },
      success: resolve,
      fail:    reject
    });
  });
}

export function sessionUuid() {
  return 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

/** Compute a deterministic hash-ish fingerprint of a rotation proposal so the signed
 *  message ties to the exact (out, in, before, after) state, not a free-form string. */
export function rotationFingerprint(out, into, before, after) {
  const payload = JSON.stringify({ out, in: into, before, after });
  let h = 0; for (let i = 0; i < payload.length; i++) { h = ((h<<5) - h + payload.charCodeAt(i)) | 0; }
  return 'rot-' + (h >>> 0).toString(16).padStart(8, '0');
}

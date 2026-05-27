export function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 4 + Math.floor(Math.random() * 3);
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

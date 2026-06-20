/**
 * Type declarations for audiobuffer-to-wav@1.x
 * The package ships CommonJS without bundled types.
 */
declare module "audiobuffer-to-wav" {
  /**
   * Convert an AudioBuffer to a WAV-format ArrayBuffer.
   * @param buffer   Native Web Audio AudioBuffer
   * @param options  { float32: true } for 32-bit float output; default 16-bit PCM
   */
  function audioBufferToWav(
    buffer: AudioBuffer,
    options?: { float32?: boolean }
  ): ArrayBuffer;

  export default audioBufferToWav;
}

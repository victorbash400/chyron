export async function mixAudio(source: MediaStream, microphone: boolean) {
  const context = new AudioContext({ sampleRate: 48000 });
  const destination = context.createMediaStreamDestination();
  const silence = context.createConstantSource();
  silence.offset.value = 0;
  silence.connect(destination);
  silence.start();
  let mic: MediaStream | undefined;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    mic?.getTracks().forEach((track) => track.stop());
    silence.stop();
    destination.stream.getTracks().forEach((track) => track.stop());
    void context.close();
  };
  try {
    if (source.getAudioTracks().length)
      context
        .createMediaStreamSource(new MediaStream(source.getAudioTracks()))
        .connect(destination);
    if (microphone) {
      mic = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      context.createMediaStreamSource(mic).connect(destination);
    }
    await context.resume();
    return {
      track: destination.stream.getAudioTracks()[0],
      hasInput: microphone || source.getAudioTracks().length > 0,
      close,
    };
  } catch (error) {
    close();
    throw error;
  }
}

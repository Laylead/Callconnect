// agora.js
// DO NOT put your App Certificate here
// DO NOT generate tokens in the frontend

// Your Agora App ID (Safe to expose)
const AGORA_APP_ID = "974f4c7b124940a1a6ee5e526175118d";

// Create Agora client
const rtc = {
  client: null,
  localAudioTrack: null,
  joined: false,
  uid: null
};

// Fetch token from your backend
async function getAgoraToken(channelName, uid) {
  const response = await fetch(
    `https://your-backend.com/agora-token?channel=${channelName}&uid=${uid}`
  );
  const data = await response.json();
  return data.token;
}

// Initialize and join the channel
async function joinChannel(channelName, isWhisperMode = false) {
  if (rtc.joined) return;

  rtc.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  rtc.uid = Math.floor(Math.random() * 100000);

  const token = await getAgoraToken(channelName, rtc.uid);

  await rtc.client.join(AGORA_APP_ID, channelName, token, rtc.uid);
  rtc.joined = true;

  // Create mic track
  rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
    encoderConfig: {
      bitrate: isWhisperMode ? 8000 : 32000   // whisper = very low bitrate
    }
  });

  // Whisper mode → 5–10% volume
  if (isWhisperMode) {
    rtc.localAudioTrack.setVolume(15);  
  }

  await rtc.client.publish([rtc.localAudioTrack]);

  console.log("Agora: joined channel:", channelName);
}

// Leave the voice channel
async function leaveChannel() {
  if (!rtc.joined) return;

  rtc.localAudioTrack.stop();
  rtc.localAudioTrack.close();

  await rtc.client.leave();
  rtc.joined = false;

  console.log("Agora: left channel");
}

// Enable/Disable mic
function setMicEnabled(enable) {
  if (!rtc.localAudioTrack) return;

  rtc.localAudioTrack.setEnabled(enable);
}

// Change between whisper mode and normal mode
function setWhisperMode(enable) {
  if (!rtc.localAudioTrack) return;

  rtc.localAudioTrack.setVolume(enable ? 15 : 100);
}

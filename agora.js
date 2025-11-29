// agora.js
// Basic push-to-talk voice for the watch party.
// Uses your Agora App ID. For production, tokens should be generated from a secure backend.

const AGORA_APP_ID = "974f4c7b124940a1a6ee5e526175118d";
// NOTE: App certificate should NOT be exposed here in real production.
// We're not generating tokens on the client side, so we do NOT use the certificate here.

let rtcClient = null;
let localAudioTrack = null;
let joinedChannel = false;

async function initAgoraVoice({ firebase, auth, roomId, isHost, holdTalkBtn, voiceStatus }) {
  try {
    rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  } catch (e) {
    console.error("Agora init error:", e);
    if (voiceStatus) voiceStatus.textContent = "Voice: failed to init";
    return;
  }

  const user = auth.currentUser;
  const uid = (user && user.uid) || Math.floor(Math.random() * 100000);

  const channelName = "room_" + roomId;

  async function joinChannel() {
    if (joinedChannel) return;
    try {
      await rtcClient.join(AGORA_APP_ID, channelName, null, uid);
      joinedChannel = true;
      if (voiceStatus) voiceStatus.textContent = "Voice ready — hold button to talk";
      rtcClient.on("user-published", async (remoteUser, mediaType) => {
        await rtcClient.subscribe(remoteUser, mediaType);
        if (mediaType === "audio") {
          const remoteAudioTrack = remoteUser.audioTrack;
          remoteAudioTrack && remoteAudioTrack.play();
        }
      });
    } catch (err) {
      console.error("Agora join error:", err);
      if (voiceStatus) voiceStatus.textContent = "Voice join failed";
    }
  }

  async function createLocalTrack() {
    if (!localAudioTrack) {
      localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    }
  }

  async function startTalking() {
    try {
      await joinChannel();
      await createLocalTrack();
      if (localAudioTrack) {
        await rtcClient.publish(localAudioTrack);
        holdTalkBtn.textContent = "Talking...";
        if (voiceStatus) voiceStatus.textContent = "You are talking";
      }
    } catch (err) {
      console.error("startTalking error:", err);
    }
  }

  async function stopTalking() {
    try {
      if (localAudioTrack && joinedChannel) {
        await rtcClient.unpublish(localAudioTrack);
      }
      holdTalkBtn.textContent = "Hold to Talk";
      if (voiceStatus) voiceStatus.textContent = "Voice ready — hold button to talk";
    } catch (err) {
      console.error("stopTalking error:", err);
    }
  }

  // Push-to-talk behavior: mouse/ touch
  holdTalkBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startTalking();
  });
  holdTalkBtn.addEventListener("mouseup", (e) => {
    e.preventDefault();
    stopTalking();
  });
  holdTalkBtn.addEventListener("mouseleave", (e) => {
    e.preventDefault();
    stopTalking();
  });

  holdTalkBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startTalking();
  }, { passive: false });
  holdTalkBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    stopTalking();
  });

  if (voiceStatus) voiceStatus.textContent = "Initializing voice...";
}

window.initAgoraVoice = initAgoraVoice;

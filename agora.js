// agora.js
// Client-side Agora voice logic (hold-to-talk + two-way audio).
// NOTE: Do NOT put App Certificate in frontend. This file uses only App ID.
// If you require token-based auth, create a backend token generator and add fetching logic.

const AGORA_APP_ID = '974f4c7b124940a1a6ee5e526175118d'; // public App ID
const AGORA_TOKEN_ENDPOINT = ''; // optional: set to your token endpoint if you use tokens
const AGORA_CHANNEL_PREFIX = 'watchparty_';

let agoraClient = null;
let localAudioTrack = null;
let published = false;
let _uid = null;
let remoteAudioTracks = {}; // uid -> track

async function _fetchToken(channel, uid){
  if(!AGORA_TOKEN_ENDPOINT) return null;
  try {
    const r = await fetch(`${AGORA_TOKEN_ENDPOINT}?channel=${channel}&uid=${uid}`);
    if(!r.ok) return null;
    const j = await r.json();
    return j.token || null;
  } catch(e) {
    console.warn('token fetch failed', e);
    return null;
  }
}

/**
 * Initialize Agora and join channel
 * firebase, auth: passed from test.html
 */
async function initAgoraVoice(firebase, auth, roomId, isHost){
  try {
    if(!AGORA_APP_ID) {
      console.warn('Agora App ID missing');
      return;
    }

    const user = auth.currentUser;
    _uid = user && user.uid ? user.uid : String(Math.floor(Math.random()*1000000));
    const channel = AGORA_CHANNEL_PREFIX + roomId;

    agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    const token = await _fetchToken(channel, _uid);

    await agoraClient.join(AGORA_APP_ID, channel, token || null, _uid);

    // Create microphone track (muted by default)
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    // publish immediately so other side can subscribe; we keep it muted until user holds to talk
    await agoraClient.publish([localAudioTrack]);
    published = true;
    // disable by default (muted)
    localAudioTrack.setEnabled(false);

    // subscribe to remote users
    agoraClient.on('user-published', async (userObj, mediaType) => {
      await agoraClient.subscribe(userObj, mediaType);
      if(mediaType === 'audio'){
        const track = userObj.audioTrack;
        remoteAudioTracks[userObj.uid] = track;
        // play remote track
        try { track.play(); } catch(e){ console.warn('remote play error', e); }
      }
    });

    agoraClient.on('user-unpublished', userObj => {
      if(remoteAudioTracks[userObj.uid]){
        try { remoteAudioTracks[userObj.uid].stop(); } catch(e){}
        delete remoteAudioTracks[userObj.uid];
      }
    });

    // expose start/stop whisper for UI
    window.startWhisper = async function(){
      if(!localAudioTrack) return;
      try {
        await localAudioTrack.setEnabled(true);
        // Notify DB so other clients can optionally increase volume for this uid (not required)
        try {
          firebase.database().ref('rooms/' + roomId + '/whispers').push({ uid: _uid, at: firebase.database.ServerValue.TIMESTAMP });
        } catch(e){}
      } catch(e){ console.warn('startWhisper error', e); }
    };

    window.stopWhisper = function(){
      if(!localAudioTrack) return;
      try{ localAudioTrack.setEnabled(false); } catch(e){ console.warn(e); }
    };

    window.leaveAgora = async function(){
      try{
        if(localAudioTrack){ localAudioTrack.stop(); localAudioTrack.close(); localAudioTrack = null; }
        if(agoraClient){ await agoraClient.leave(); agoraClient = null; }
        published = false;
      }catch(e){ console.warn('leaveAgora', e); }
    };

    // Cleanup whispers node quickly to avoid growth
    const wr = firebase.database().ref('rooms/' + roomId + '/whispers');
    wr.on('child_added', snap => {
      setTimeout(()=> snap.ref.remove(), 4000);
    });

    console.log('Agora joined channel', channel, 'uid', _uid);
    return true;
  } catch(err){
    console.error('Agora init error', err);
    throw err;
  }
}

// Expose functions
window.initAgoraVoice = initAgoraVoice;

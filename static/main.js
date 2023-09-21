window.addEventListener('load', (e) => {
  let pc

  const call = document.getElementById('call')
  const hangup = document.getElementById('hangup')
  console.log(call)
  
  // WEBSOCKET
  let ws = new WebSocket('ws://localhost:8080/ws')
  
   ws.onopen = (e) => {
       console.log("ws open", e)
   }
  
   ws.onclose = (e) => {
       console.log("ws close", e)
   }
  
   ws.onmessage = (e) => {
    console.log(e.data)
    let msg = JSON.parse(e.data)
    // switch (msg.topic) {
    //     case 'candidate':
    //         console.log('ice candidate-raspberry', JSON.parse(msg.data))
    //         const candidate = new RTCIceCandidate(JSON.parse(msg.data))
    //         rtcpc.addIceCandidate(candidate)
    //             .catch(err => console.log(err))
    //         break
    //     case 'answer':
    //         console.log('answer coming')
    //         rtcpc.setRemoteDescription(JSON.parse(msg.data))
    //         break;
    //     default:
    //         break;
    // }
  }
  
  // WEBRTC
  const iceServers = {
    'iceServer': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'}
    ]
}
  // On this codelab, you will be streaming only video (video: true).
  const mediaStreamConstraints = {
    video: true,
  };
  
  // Video element where stream will be placed.
  const localVideo = document.querySelector('video');
  
  // Local stream that will be reproduced on the video.
  let localStream;
  
  // Handles success by adding the MediaStream to the video element.
  function gotLocalMediaStream(mediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
    console.log('Received local stream.');
    call.disabled = false;  // Enable call button.
  }
  
  // Handles error by logging a message to the console with the error message.
  function handleLocalMediaStreamError(error) {
    console.log('navigator.getUserMedia error: ', error);
  }
  
  // Initializes media stream.
  call.addEventListener('click', () => {
    console.log("click")
    pc = new RTCPeerConnection(iceServers)
    pc.onsignalingstatechange = signalingStateCallback
    pc.oniceconnectionstatechange = iceStateCallback
    pc.onconnectionstatechange = connStateCallback
    pc.onicecandidate = onIceCandidate
    pc.ontrack = onAddStream
    const sessionDescription = await pc.createOffer(offerOptions)
    pc.setLocalDescription(sessionDescription)
    ws.send(JSON.stringify({
        topic: 'offer',
        data: {
            sessionDescription: sessionDescription
        }
    }))
    console.log("offer send, data: ", sessionDescription)
  
    // navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    // .then(gotLocalMediaStream).catch(handleLocalMediaStreamError)
    // .catch(handleLocalMediaStreamError);
  
  })
  
  // === WEBRTC SERVER ===
  
 // callback
 function onAddStream(e) {
  console.log("got remote stream")
  remoteVideo.srcObject = e.streams[0]
  remoteStream = e.streams[0]
}

function signalingStateCallback() {
  let state;
  if (pc) {
      state = pc.signalingState
      console.log("signaling state: ", state)
  }
}

function iceStateCallback() {
  let iceState
  if (pc) {
      iceState = pc.iceConnectionState
      console.log("ICE connection state: ", iceState)
  }
}

function connStateCallback() {
  let connState
  if (pc) {
      connState = pc.connectionState
      console.log("Connection state: ", connectionState)
  }
}

function onIceCandidate(e) {
  if (e.candidate) {
      console.log('sending ice candidate', e.candidate)
      ws.send(JSON.stringify({
          topic: 'candidate',
          data: {
              label: e.candidate.sdpMLineIndex,
              id: e.candidate.sdpMid,
              candidate: e.candidate
          }
      }))
  }
}

  })
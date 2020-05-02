const configuration = {
    iceServers: [
      {
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
      },
    ],
    iceCandidatePoolSize: 10,
};
var localStream = null;
var socket=null;
var peerConnections = {};
var currentId=null;
var roomId="pawan";
socket = io();
document.getElementById('startBtn').addEventListener('click', start);
document.getElementById('createBtn').addEventListener('click', createRoom);
document.getElementById('joinBtn').addEventListener('click', joinRoom);
async function start(){
    localStream = await navigator.mediaDevices.getUserMedia({video: false, audio: true});
    socket.on('msg', function (data) {
        handleMessage(data);
    });
    socket.on('peer.connected', function (params) {
        makeOffer(params.id);
    });
}

async function createRoom(){
  socket.emit('init', null, function (roomid, id) {
    roomId = roomid;
    currentId = id;
  });
}

async function joinRoom(){
  var r = prompt("Enter id");
  socket.emit('init', { room: r }, function (roomid, id) {
    roomId = roomid;
    currentId = id;
  });
}

function getPeerConnection(id) {
    if (peerConnections[id]) {
      return peerConnections[id];
    }
    var pc = new RTCPeerConnection(configuration);
    peerConnections[id] = pc;
    pc.addStream(localStream);
    pc.onicecandidate = function (evnt) {
      socket.emit('msg', { by: currentId, to: id, ice: evnt.candidate, type: 'ice' });
    };
    pc.onaddstream = function (evnt) {
      console.log('Received new stream');
      var audio = document.createElement("audio");
      audio.srcObject=evnt.stream;
      document.body.appendChild(audio);
      console.log(evnt.stream);
    };
    return pc;
}

function makeOffer(id) {
    var pc = getPeerConnection(id);
    pc.createOffer(function (sdp) {
      pc.setLocalDescription(sdp);
      console.log('Creating an offer for', id);
      socket.emit('msg', { by: currentId, to: id, sdp: sdp, type: 'sdp-offer' });
    }, function (e) {
      console.log(e);
    },
    { mandatory: { OfferToReceiveVideo: false, OfferToReceiveAudio: true }});
}

function handleMessage(data) {
    var pc = getPeerConnection(data.by);
    switch (data.type) {
      case 'sdp-offer':
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
          console.log('Setting remote description by offer');
          pc.createAnswer(function (sdp) {
            pc.setLocalDescription(sdp);
            socket.emit('msg', { by: currentId, to: data.by, sdp: sdp, type: 'sdp-answer' });
          });
          console.log("by:"+currentId+"to: "+data.by);
        });
        break;
      case 'sdp-answer':
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
          console.log('Setting remote description by answer');
        }, function (e) {
          console.error(e);
        });
        break;
      case 'ice':
        if (data.ice) {
          console.log('Adding ice candidates');
          pc.addIceCandidate(new RTCIceCandidate(data.ice));
        }
        break;
    }
}

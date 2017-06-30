var inject = '('+function() {
  var origPeerConnection = window.RTCPeerConnection;
  var id = 0;
  window.RTCPeerConnection = function() {
    var pc = new origPeerConnection(arguments[0], arguments[1]);
    pc._id = 'RTCPeerConnection_' + id++;
    return pc;
  };
  window.RTCPeerConnection.prototype = origPeerConnection.prototype;

  ['createOffer', 'createAnswer',
      'setLocalDescription', 'setRemoteDescription'].forEach(function(method) {
    var nativeMethod = RTCPeerConnection.prototype[method];
    RTCPeerConnection.prototype[method] = function() {
      window.postMessage(['WebRTCExternals', window.location.href, this._id, method, JSON.stringify(arguments)], '*');
      return nativeMethod.apply(this, arguments);
    };
  });
}+')();';
var script = document.createElement('script');
script.textContent = inject;
(document.head||document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

var channel = chrome.runtime.connect();
window.addEventListener('message', function (event) {
    if (typeof(event.data) === 'string') return;
    if (event.data[0] !== 'WebRTCExternals') return;
    channel.postMessage(event.data);
});

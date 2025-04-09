function run() {
  const origPeerConnection = window.RTCPeerConnection;
  if (!origPeerConnection) {
    return; // can happen e.g. when peerconnection is disabled in Firefox.
  }
  window.RTCPeerConnection = function(...args) {
    const pc = new origPeerConnection(...args);
    pc.addEventListener('datachannel', e => {
      e.channel.addEventListener('message', function(...args) {
	console.log('RECV', args[0]);
      });
      // TODO: keep track and remove listeners in overridden close?
    });
    // Can set pc.__id for correlation.
    return pc;
  };
  window.RTCPeerConnection.prototype = origPeerConnection.prototype;
  // wrap static methods. Currently just generateCertificate.
  if ('generateCertificate' in origPeerConnection) {
    Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
      get() {
        return OrigPeerConnection.generateCertificate;
      }
    });
  }

  // Can also be overridden on datachannel prototype but this is easier if you want
  // to know more about the peerconnection such as an id.
  const origCreateDataChannel = window.RTCPeerConnection.prototype.createDataChannel;
  window.RTCPeerConnection.prototype.createDataChannel = function (...args) {
    const pc = this;
    const dataChannel = origCreateDataChannel.apply(pc, args);
    const origSend = dataChannel.send;
    dataChannel.send = function (...args) {
      console.log('SEND', args[0]);
      return origSend.apply(this, args);
    };
    return dataChannel;
  };
};
run();

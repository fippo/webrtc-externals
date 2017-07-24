var inject = '('+function() {
  function trace(method, id, args) {
    window.postMessage(['WebRTCExternals', id, method, JSON.stringify(args || {})], '*');
  }

  var id = 0;
  var origPeerConnection = window.RTCPeerConnection;
  window.RTCPeerConnection = function() {
    var pc = new origPeerConnection(arguments[0], arguments[1]);
    pc._id = id++;
    trace('create', pc._id, arguments);

    pc.addEventListener('icecandidate', function(e) {
      trace('onicecandidate', pc._id, e.candidate);
    });
    pc.addEventListener('addstream', function(e) {
      trace('onaddstream', pc._id, e.stream.id + ' ' + e.stream.getTracks().map(function(t) { return t.kind + ':' + t.id; }));
    });
    pc.addEventListener('removestream', function(e) {
      trace('onremovestream', pc._id, e.stream.id + ' ' + e.stream.getTracks().map(function(t) { return t.kind + ':' + t.id; }));
    });
    pc.addEventListener('signalingstatechange', function() {
      trace('onsignalingstatechange', pc._id, pc.signalingState);
    });
    pc.addEventListener('iceconnectionstatechange', function() {
      trace('oniceconnectionstatechange', pc._id, pc.iceConnectionState);
    });
    pc.addEventListener('icegatheringstatechange', function() {
      trace('onicegatheringstatechange', pc._id, pc.iceGatheringState);
    });
    pc.addEventListener('negotiationneeded', function() {
      trace('onnegotiationneeded', pc._id, {});
    });
    pc.addEventListener('datachannel', function(event) {
      trace('ondatachannel', pc._id, [event.channel.id, event.channel.label]);
    });

    return pc;
  };
  window.RTCPeerConnection.prototype = origPeerConnection.prototype;

  ['createOffer', 'createAnswer'].forEach(function(method) {
    var nativeMethod = window.RTCPeerConnection.prototype[method];
    if (nativeMethod) {
      window.RTCPeerConnection.prototype[method] = function() {
        var pc = this;
        var args = arguments;
        var opts;
        if (arguments.length === 1 && typeof arguments[0] === 'object') {
          opts = arguments[0];
        } else if (arguments.length === 3 && typeof arguments[2] === 'object') {
          opts = arguments[2];
        }
        trace(method, pc._id, opts);
        return new Promise(function(resolve, reject) {
          nativeMethod.apply(pc, [
            function(description) {
              trace(method + 'OnSuccess', pc._id, description);
              resolve(description);
              if (args.length > 0 && typeof args[0] === 'function') {
                args[0].apply(null, [description]);
              }
            },
            function(err) {
              trace(method + 'OnFailure', pc._id, err.toString());
              reject(err);
              if (args.length > 1 && typeof args[1] === 'function') {
                args[1].apply(null, [err]);
              }
            },
            opts,
          ]);
        });
      };
    }
  });

  ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function(method) {
    var nativeMethod = window.RTCPeerConnection.prototype[method];
    if (nativeMethod) {
      window.RTCPeerConnection.prototype[method] = function() {
        var pc = this;
        var args = arguments;
        trace(method, pc._id, args[0]);
        return new Promise(function(resolve, reject) {
          nativeMethod.apply(pc, [args[0],
            function() {
              trace(method + 'OnSuccess', pc._id);
              resolve();
              if (args.length >= 2) {
                args[1].apply(null, []);
              }
            },
            function(err) {
              trace(method + 'OnFailure', pc._id, err.toString());
              reject(err);
              if (args.length >= 3) {
                args[2].apply(null, [err]);
              }
            }]
          );
        });
      };
    }
  });

  ['addStream'].forEach(function(method) {
    var nativeMethod = window.RTCPeerConnection.prototype[method];
    if (nativeMethod) {
      window.RTCPeerConnection.prototype[method] = function() {
        var pc = this;
        var stream = arguments[0];
        var streamInfo = stream.getTracks().map(function(t) {
          return t.kind + ':' + t.id;
        });

        trace(method, pc._id, stream.id + ' ' + streamInfo);
        return nativeMethod.apply(pc, arguments);
      };
    }
  });

  ['close'].forEach(function(method) {
    var nativeMethod = window.RTCPeerConnection.prototype[method];
    if (nativeMethod) {
      window.RTCPeerConnection.prototype[method] = function() {
        var pc = this;
        trace(method, pc._id);
        return nativeMethod.apply(pc, arguments);
      };
    }
  });
}+')();';

document.addEventListener('DOMContentLoaded', function() {
    var script = document.createElement('script');
    script.textContent = inject;
    (document.head||document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);
});

if (typeof browser === 'undefined') {
    browser = chrome;
}
var channel = browser.runtime.connect();
window.addEventListener('message', function (event) {
    if (typeof(event.data) === 'string') return;
    if (event.data[0] !== 'WebRTCExternals') return;
    channel.postMessage(event.data);
});

var inject = '('+function() {
  function trace(method, id, args) {
    window.postMessage(['WebRTCExternals', id, method, JSON.stringify(args || {})], '*');
  }

  // transforms a maplike to an object. Mostly for getStats +
  // JSON.parse(JSON.stringify())
  function map2obj(m) {
    if (!m.entries) {
      return m;
    }
    var o = {};
    m.forEach(function(v, k) {
      o[k] = v;
    });
    return o;
  }

  var id = 0;
  var origPeerConnection = window.RTCPeerConnection;
  if (!origPeerConnection) {
    return; // can happen e.g. when peerconnection is disabled in Firefox.
  }
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
    pc.addEventListener('track', function(e) {
      trace('ontrack', pc._id, e.track.kind + ':' + e.track.id + ' ' + e.streams.map(function(s) { return 'stream:' + s.id; }));
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

    window.setTimeout(function poll() {
      if (pc.signalingState !== 'closed') {
        window.setTimeout(poll, 1000);
      }
      pc.getStats()
      .then(function(stats) {
        trace('getStats', pc._id, map2obj(stats));
      });
    }, 1000);
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

  ['addStream', 'removeStream'].forEach(function(method) {
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

  ['addTrack'].forEach(function(method) {
    var nativeMethod = window.RTCPeerConnection.prototype[method];
    if (nativeMethod) {
      window.RTCPeerConnection.prototype[method] = function() {
        var pc = this;
        var track = arguments[0];
        var streams = [].slice.call(arguments, 1);
        trace(method, pc._id, track.kind + ':' + track.id + ' ' + (streams.map(function(s) { return 'stream:' + s.id; }).join(';') || '-'));
        var sender = nativeMethod.apply(pc, arguments);
        if (sender && sender.replaceTrack) {
          var nativeReplaceTrack = sender.replaceTrack;
          sender.replaceTrack = function(withTrack) {
            trace('replaceTrack', pc._id,
                (sender.track ? sender.track.kind + ':' + sender.track.id : 'null') +
                ' with ' +
                (withTrack ?  withTrack.kind + ':' + withTrack.id : 'null'));
            return nativeReplaceTrack.apply(sender, arguments);
          }
        }
        return sender;
      };
    }
  });

  ['removeTrack'].forEach(function(method) {
    var nativeMethod = window.RTCPeerConnection.prototype[method];
    if (nativeMethod) {
      window.RTCPeerConnection.prototype[method] = function() {
        var pc = this;
        var track = arguments[0].track;
        trace(method, pc._id, track ? track.kind + ':' + track.id : 'null');
        return nativeMethod.apply(pc, arguments);
      };
    }
  });

  ['close', 'createDataChannel'].forEach(function(method) {
    var nativeMethod = window.RTCPeerConnection.prototype[method];
    if (nativeMethod) {
      window.RTCPeerConnection.prototype[method] = function() {
        var pc = this;
        trace(method, pc._id, arguments);
        return nativeMethod.apply(pc, arguments);
      };
    }
  });

  function dumpStream(stream) {
    return {
      id: stream.id,
      tracks: stream.getTracks().map(function(track) {
        return {
          id: track.id,                 // unique identifier (GUID) for the track
          kind: track.kind,             // `audio` or `video`
          label: track.label,           // identified the track source
          enabled: track.enabled,       // application can control it
          muted: track.muted,           // application cannot control it (read-only)
          readyState: track.readyState, // `live` or `ended`
        };
      }),
    };
  }
  var origGetUserMedia;
  var gum;
  if (navigator.getUserMedia) {
    origGetUserMedia = navigator.getUserMedia.bind(navigator);
    gum = function() {
      var id = Math.random().toString(36).substr(2, 10);
      trace('getUserMedia', id, arguments[0]);
      var cb = arguments[1];
      var eb = arguments[2];
      origGetUserMedia(arguments[0],
        function(stream) {
          // we log the stream id, track ids and tracks readystate since that is ended GUM fails
          // to acquire the cam (in chrome)
          trace('getUserMediaOnSuccess', id, dumpStream(stream));
          if (cb) {
            cb(stream);
          }
        },
        function(err) {
          trace('getUserMediaOnFailure', id, err.name);
          if (eb) {
            eb(err);
          }
        }
      );
    };
    navigator.getUserMedia = gum.bind(navigator);
  }
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    gum = function() {
      var id = Math.random().toString(36).substr(2, 10);
      trace('navigator.mediaDevices.getUserMedia', id, arguments[0]);
      return origGetUserMedia.apply(navigator.mediaDevices, arguments)
      .then(function(stream) {
        trace('navigator.mediaDevices.getUserMediaOnSuccess', id, dumpStream(stream));
        return stream;
      }, function(err) {
        trace('navigator.mediaDevices.getUserMediaOnFailure', id, err.name);
        return Promise.reject(err);
      });
    };
    navigator.mediaDevices.getUserMedia = gum.bind(navigator.mediaDevices);
  }
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

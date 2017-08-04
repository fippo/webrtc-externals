// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/onConnect
if (typeof browser === 'undefined') {
    browser = chrome;
}

browser.runtime.onConnect.addListener(function (channel) {
    if (window === browser.extension.getBackgroundPage()) {
        return;
    }
    var url = channel.sender.url;
    var pid = Math.random().toString(36).substr(2, 10);
    channel.onDisconnect.addListener(function() {
        // TODO: remove / mark everything associated with that page/pid
    });
    channel.onMessage.addListener(function (message, port) {
        if (message[0] !== 'WebRTCExternals') return;

        var method = message[2];
        var args = message[3] ? JSON.parse(message[3]) : undefined;
        // emulate webrtc-internals format
        var data = {lid: message[1], pid: pid, type: message[2], time: Date.now()};
        data.value = typeof args === 'string' ? args : message[3];
        switch(method) {
        case 'create':
            data.url = url;
            // TODO: iterate and remove credential.
            data.rtcConfiguration = args[0];
            data.constraints = JSON.stringify(args[1]);
            addPeerConnection(data);
            break;
        case 'navigator.mediaDevices.getUserMedia':
        case 'navigator.getUserMedia':
            data = {
                rid: 0,
                pid: pid,
                origin: url,
                audio: JSON.stringify(args.audio),
                video: JSON.stringify(args.video),
                getUserMediaId: message[1],
            };
            addGetUserMedia(data);
            break;
        case 'navigator.mediaDevices.getUserMediaOnSuccess':
        case 'navigator.mediaDevices.getUserMediaOnFailure':
        case 'navigator.getUserMediaOnSuccess':
        case 'navigator.getUserMediaFailure':
            // TODO: find a way to display them.
            break;
        case 'getStats':
            // webrtc-internals uses a weird format for the stats...
			data.reports = [];
			Object.keys(args).forEach(function(reportName) {
                var report = args[reportName];
                var values = [];
                Object.keys(report).forEach(function(statName) {
                    if (statName === 'timestamp') {
                        return;
                    }
                    values.push(statName);
                    values.push(report[statName]);
                });

                data.reports.push({
                    type: report.type,
                    id: report.id,
                    stats: {
                        timestamp: report.timestamp,
                        values: values,
                    },
                });
			});
            if (navigator.userAgent.indexOf('Edge') === -1) {
                addStats(data);
            }
            break;
        case 'createOfferOnSuccess':
        case 'setLocalDescription':
        case 'setRemoteDescription':
            data.value = 'type: ' + args.type + ', sdp:\n' + args.sdp;
            // fall through
        default:
            addPeerConnectionUpdate($(getPeerConnectionId(data)), data);
        }
    });
});

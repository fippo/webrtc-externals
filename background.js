// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/onConnect
if (typeof browser === 'undefined') {
    browser = chrome;
}

browser.browserAction.onClicked.addListener(function() {
    browser.tabs.create({'url': browser.extension.getURL('background.html')});
});

browser.runtime.onConnect.addListener(function (channel) {
    channel.onMessage.addListener(function (message, port) {
        if (message[0] !== 'WebRTCExternals') return;
        console.log(message[1], message[2], JSON.parse(message[3]));

        var method = message[2];
        var args = message[3] ? JSON.parse(message[3]) : undefined;
        // emulate webrtc-internals format
        var data = {lid: message[1], pid: 'pid', type: message[2], value: message[3], time: Date.now()};
        if (method === 'create') {
            data.url = port.sender.url;
            data.rtcConfiguration = args[0];
            data.constraints = args[1];
            addPeerConnection(data);
            return;
        }
        var peerConnectionElement = $(getPeerConnectionId(data));
        addPeerConnectionUpdate(peerConnectionElement, data);
    });
});

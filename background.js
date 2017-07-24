// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/onConnect
if (typeof browser === 'undefined') {
    browser = chrome;
}
browser.runtime.onConnect.addListener(function (channel) {
    channel.onMessage.addListener(function (message, port) {
        if (message[0] !== 'WebRTCExternals') return;
        console.log(new Date(), message[1], message[2], message[3], JSON.parse(message[4]));
    });
});

browser.browserAction.onClicked.addListener(function(tab) {
    browser.tabs.create({'url': browser.extension.getURL('background.html')});
});

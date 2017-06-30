chrome.runtime.onConnect.addListener(function (channel) {
    channel.onMessage.addListener(function (message, port) {
        if (message[0] !== 'WebRTCExternals') return;
        console.log(new Date(), message[1], message[2], message[3], JSON.parse(message[4]));
    });
});

/*
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({'url': chrome.extension.getURL('background.html'), 'selected': true});
});
*/

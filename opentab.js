if (typeof browser === 'undefined') {
    browser = chrome;
}

browser.browserAction.onClicked.addListener(function() {
    browser.tabs.create({'url': browser.extension.getURL('background.html')});
});

browser.runtime.onConnect.addListener(function (channel) {
    // adds a dummy listener so that there is at least one listener.
    // TODO: could be used to persist data for background.html
});

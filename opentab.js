if (typeof browser === 'undefined') {
    browser = chrome;
}

browser.browserAction.onClicked.addListener(function() {
    browser.tabs.create({'url': browser.extension.getURL('background.html')});
});


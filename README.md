# WebRTC Externals

WebRTC Externals is a [WebExtension](https://developer.mozilla.org/en-US/Add-ons/WebExtensions) that 
aims to allow much of the same workflow that developers are using on Chrome's [webrtc-internals](https://testrtc.com/webrtc-internals-documentation/)
internal page. However, it is implemented as an extension and therefore does not rely on any internal infrastructure.
As a result, it can be run in other browsers like Firefox or Microsoft Edge.

## Usage
To debug a WebRTC call, make sure that the background page is open by clicking
the WebRTC icon labelled "Debug WebRTC" in your browser. Then make a call
on a page like [one of the WebRTC samples](https://webrtc.github.io/samples/src/content/peerconnection/pc1/). You should see a an API trace like shown in the
[WebRTCHacks blog post](https://webrtchacks.com/webrtc-externals/) as a result.

## Known issues
The content script only overrides RTCPeerConnection and not the Chrome legacy RTCPeerConnection. If the site you are testing is still using the old variant you might suggest they upgrade.

# LICENSE
MIT

This project reuses large parts of [rtcstats.js](https://github.com/opentok/rtcstats) which is licensed under the MIT license.
The files webrtc-internals.js, utils.js and background.html are taken from Chrome's webrtc-internals page and licensed under the BSD license. See NOTICE.md for details.
The WebRTC logo was taken from the [WebRTC Google Plus page](https://plus.google.com/+WebRTCorg/posts)

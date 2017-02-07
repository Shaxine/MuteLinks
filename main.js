let prefs = require("sdk/simple-prefs").prefs;
let webExtension = require("sdk/webextension");

let webExtPort;

webExtension.startup().then(({browser}) => {
  browser.runtime.onConnect.addListener(onConnect);
});

function onConnect(port) {
  if (port.name === "legacy-addon") {
    webExtPort = port;
    webExtPort.onMessage.addListener(function(msg) {
      const {type} = msg;

      switch (type) {
      case "request-prefs":
        let prefsRes = {};
        if (typeof prefs.blackList !== 'undefined' && typeof prefs.whitelist_check !== 'undefined' && typeof prefs.whiteList !== 'undefined' && typeof prefs.priavtetab_check !== 'undefined') {
          prefsRes = {
            blackList: prefs.blackList,
            whitelist_check: prefs.whitelist_check,
            whiteList: prefs.whiteList,
            priavtetab_check: prefs.priavtetab_check,
          };
        }
        webExtPort.postMessage({
          type: type,
          prefs: prefsRes
        });
        break;
      }
    });
  }
}
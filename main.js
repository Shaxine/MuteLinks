let tab_utils = require("sdk/tabs/utils");
let prefs = require("sdk/simple-prefs").prefs;
let { viewFor } = require("sdk/view/core");
let { modelFor } = require("sdk/model/core");
let webExtension = require("sdk/webextension");
let browserWindows = require("sdk/windows").browserWindows;
let window_utils = require('sdk/window/utils');

let webExtPort;
const menuId = "context_muteLinks";

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
        if (typeof prefs.blackList !== "undefined" && typeof prefs.whitelist_check !== "undefined" && typeof prefs.whiteList !== "undefined" && typeof prefs.priavtetab_check !== "undefined") {
          prefsRes = {
            blackList: prefs.blackList,
            whitelist_check: prefs.whitelist_check,
            whiteList: prefs.whiteList,
            privatetab_check: prefs.priavtetab_check,
          };
        }
        webExtPort.postMessage({
          type: type,
          prefs: prefsRes
        });
        break;
      case "entry-info":
        let tab = modelFor(tab_utils.getTabForId(msg.tabId));
        let doc = viewFor(tab.window).document;
        if (msg.entryIndex != -1) {
          doc.getElementById("context_MuteLinks_add").style.display = "none";
          doc.getElementById("context_MuteLinks_edit").style.display = "block";
        } else {
          doc.getElementById("context_MuteLinks_add").style.display = "block";
          doc.getElementById("context_MuteLinks_add").setAttribute("label", (msg.whiteList==true?"Add to Whitelist":"Add to Blacklist"));
          doc.getElementById("context_MuteLinks_edit").style.display = "none";
        }
        doc.getElementById("context_MuteLinks_private").setAttribute("checked", msg.priavteTab);
        break;
      case "context-check":
        if (msg.position != "none") {
          for (let window of browserWindows) {
            onWindowOpen(window);
          }
          browserWindows.on('open', onWindowOpen);
        } else {
          for (let window of browserWindows) {
            let chromeWindow = viewFor(window);
            removeMenu(chromeWindow);
          }
          browserWindows.removeListener('open', onWindowOpen);
        }
        break;
      case "context-position":
        if (msg.position != "none") {
          for (let window of browserWindows) {
            let chromeWindow = viewFor(window);
            if (window_utils.getOuterId(chromeWindow) == msg.windowId) {
              removeMenu(chromeWindow);
              addMenu(chromeWindow, msg.position);
            }
          }
        } else {
          removeMenu(chromeWindow);
        }
        break;
      }
    });
  }
}

function onWindowOpen(window) {
  let chromeWindow = viewFor(window);
  webExtPort.postMessage({type: "context-position", windowId: window_utils.getOuterId(chromeWindow)});
}

function addMenu(chromeWindow, position) {
  const doc = chromeWindow.document;
  const gB = chromeWindow.gBrowser;

  const newMenu = doc.createElement("menu");
  newMenu.setAttribute("id", menuId);
  newMenu.setAttribute("label", "MuteLinks");
  
  if (position == "top") {
    doc.getElementById("tabContextMenu").insertBefore(newMenu, doc.getElementById("tabContextMenu").firstChild);
  } else if (position == "bottom") {
    doc.getElementById("tabContextMenu").appendChild(newMenu);
  } else {
    return;
  }
  
  const newMenuPop = doc.createElement("menupopup");
  const menuPopId = "context_MuteLinks";
  newMenuPop.setAttribute("id", menuPopId);
  newMenuPop.addEventListener("popupshowing", function(event) {
    let tab = modelFor(gB.mContextTab);
    webExtPort.postMessage({type: "entry-info", tabId: tab.id, tabUrl: tab.url});
  }, false);
  doc.getElementById(menuId).appendChild(newMenuPop);

  const menuPop = doc.getElementById(menuPopId);

  var newItem;
  newItem = doc.createElement("menuitem");
  newItem.setAttribute("id", "context_MuteLinks_add");
  newItem.setAttribute("label", "Add to Blacklist");
  newItem.addEventListener("command", function(event) {
    let tab = modelFor(gB.mContextTab);
    webExtPort.postMessage({type: "add-popup", tabIndex: tab.index, windowId: tab.id.split("-")[1]});
  }, false);
  menuPop.appendChild(newItem);

  newItem = doc.createElement("menuitem");
  newItem.setAttribute("id", "context_MuteLinks_edit");
  newItem.setAttribute("label", "Edit Entry");
  newItem.addEventListener("command", function(event) {
    let tab = modelFor(gB.mContextTab);
    webExtPort.postMessage({type: "edit-popup", tabIndex: tab.index, windowId: tab.id.split("-")[1]});
  }, false);
  menuPop.appendChild(newItem);

  newItem = doc.createElement("menuitem");
  newItem.setAttribute("id", "context_MuteLinks_private");
  newItem.setAttribute("type", "checkbox");
  newItem.setAttribute("label", "Mute private tabs");
  newItem.addEventListener("command", function(event) {
    webExtPort.postMessage({type: "toggle-private-tab"});
  }, false);
  menuPop.appendChild(newItem);

  menuPop.appendChild(doc.createElement("menuseparator"));

  newItem = doc.createElement("menuitem");
  newItem.setAttribute("id", "context_MuteLinks_settings");
  newItem.setAttribute("label", "Settings");
  newItem.addEventListener("command", function(event) {
    webExtPort.postMessage({type: "open-settings"});
  }, false);
  menuPop.appendChild(newItem);

}

function removeMenu(chromeWindow) {
  const doc = chromeWindow.document;
  if (doc.getElementById(menuId)!= null) {
    doc.getElementById(menuId).remove();
  }
}
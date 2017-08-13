"use strict";

const extensionId = window.location.hostname;
const prefsNames = ["blackList","whitelist_check","whiteList","privatetab_check","context_menu"];
let prefs = {};

function init() {
  browser.storage.onChanged.addListener(onStorageChanged);
  browser.contextMenus.onClicked.addListener(onContextMenuClicked);
  function onContextMenuClicked(info, tab) {
    if (info.menuItemId == "add_edit") {
      let entry = false;
      let entryIndex = -1;
      if ((prefs.whitelist_check?prefs.whiteList:prefs.blackList)!="") {
        let itemsList = prefs.whitelist_check?prefs.whiteList.split(/, |,/):prefs.blackList.split(/, |,/);
        for (let item of itemsList) {
          let org_item = item;
          if ((item.indexOf("\"")==0 && item.slice(-1)=="\"") || (item.indexOf("'")==0 && item.slice(-1)=="'")) {
            item = item.replace(/\//g , "\\\/");
            item = "^"+item.slice(1, -1)+"$";
          }
          let pattern = new RegExp(item);
          if (pattern.test(tab.url)) {
            entry = org_item;
            entryIndex = itemsList.indexOf(org_item);
            break;
          }
        }
      }
      if (!entry) {
        browser.windows.create({
          url: browser.extension.getURL("popup/add-popup.html?info="+btoa(tab.url)+"-"+(prefs.whitelist_check?"1":"0")),
          type: "panel",
          height: 110,
          width: 400
        }).then({}, onError);
      } else {
        browser.windows.create({
          url: browser.extension.getURL("popup/edit-popup.html?info="+btoa(entry)+"-"+entryIndex),
          type: "panel",
          height: 110,
          width: 400
        }).then({}, onError);
      }
    } else if (info.menuItemId == "privatetab_check") {
      browser.storage.local.set({privatetab_check: !prefs.privatetab_check});
    } else if (info.menuItemId == "settings") {
      browser.runtime.openOptionsPage(); 
    }
  }
  retriveData();
}

init();

function onTabCreated(tab) {
  checkForMute(tab);
}

function checkForMute(tab) {
  if ((prefs.privatetab_check && (tab.incognito === true || (("privateTab" in window) && privateTab.isTabPrivate(tab)))) || (prefs.whitelist_check && prefs.whiteList=="")) {
    if (tab.mutedInfo.reason != "user") {
      muteTab(tab);
    }
    return true;
  } else if (prefs.privatetab_check && !((prefs.blackList != "" && !prefs.whitelist_check) || prefs.whitelist_check)) {
    if (tab.mutedInfo.muted && tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == extensionId) {
      unMuteTab(tab);
    }
    return true;
  }
  let itemsList = prefs.whitelist_check?prefs.whiteList.split(/, |,/):prefs.blackList.split(/, |,/);
  let url = tab.url;
  let mute;
  for (let item of itemsList) {
    if ((item.indexOf("\"") == 0 && item.slice(-1) == "\"") || (item.indexOf("'") == 0 && item.slice(-1) == "'")) {
      item = item.replace(/\//g , "\\\/");
      item = "^"+item.slice(1, -1)+"$";
    }
    let pattern = new RegExp(item);
    if (!prefs.whitelist_check) {
      if (pattern.test(url) && !tab.mutedInfo.muted) {
        if (tab.mutedInfo.reason != "user") {
          mute = true;
        }
        break;
      } else if (pattern.test(url) && tab.mutedInfo.muted) {
          mute = true;
        break;
      } else if ((tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == extensionId) && tab.mutedInfo.muted && !pattern.test(url)) {
        mute = false;
      }
    } else {
      if (!tab.mutedInfo.muted && !pattern.test(url)) {
        if (tab.mutedInfo.reason != "user") {
          mute = true;
        }
      } else if (pattern.test(url) && !tab.mutedInfo.muted) {
        break;
      } else if ((tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == extensionId) && tab.mutedInfo.muted && pattern.test(url)) {
        mute = false;
        break;
      }
    }
  }
  if (mute === true && !tab.mutedInfo.muted) {
    muteTab(tab);
  } else if (mute === false && tab.mutedInfo.muted) {
    unMuteTab(tab);
  }
}

function onTabUpdated(tabId, changeInfo, tabInfo) {
  if (changeInfo.url) {
    checkForMute(tabInfo);
  }
}

function muteTab(tab) {
  browser.tabs.update(tab.id, {muted: true}).then({}, onError);
}

function unMuteTab(tab) {
  browser.tabs.update(tab.id, {muted: false}).then({}, onError);
}

function retriveData() {
  browser.storage.local.get().then(onStorageGet, onError);
  function onStorageGet(items) {
    if (typeof items[0] !== "undefined") {
      items = items[0];
    }
    if (items.constructor === Object && Object.keys(items).length == 0) {
      browser.storage.local.set({
        blackList: "",
        whitelist_check: false,
        whiteList: "",
        privatetab_check: false,
        context_menu: true,
      });
    } else {
      if (typeof(items.context_menu) !== "boolean") {
        if (items.context_menu == "none") {
          items.context_menu = false;
        } else if(items.context_menu == "top" || items.context_menu == "bottom") {
          items.context_menu = true;
        }
        browser.storage.local.set({context_menu: items.context_menu});
      }
      prefs = items;
      setListeners(prefs);
    }
  }
}

function onStorageChanged(changes, area) {
  if (area == "local") {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      prefs[item] = changes[item].newValue;
    }
    setListeners(changes);
  }
}

function setListeners(data) {
  if ("blackList" in data || "whitelist_check" in data || "whiteList" in data || "privatetab_check" in data) {
    if (prefs.privatetab_check || (prefs.blackList != "" && !prefs.whitelist_check) || prefs.whitelist_check) {
      if (!browser.tabs.onCreated.hasListener(onTabCreated)) {
        browser.tabs.onCreated.addListener(onTabCreated);
        browser.tabs.onUpdated.addListener(onTabUpdated);
      }
      browser.tabs.query({}).then(getTabs, onError);
      function getTabs(tabs) {
        for (let tab of tabs) {
          checkForMute(tab);
        }
      }
    } else {
      if (browser.tabs.onCreated.hasListener(onTabCreated)) {
        browser.tabs.onCreated.removeListener(onTabCreated);
        browser.tabs.onUpdated.removeListener(onTabUpdated);
      }
      browser.tabs.query({muted:!prefs.whitelist_check}).then(getTabs, onError);
      function getTabs(tabs) {
        for (let tab of tabs) {
          if (!prefs.whitelist_check && (tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == extensionId) && tab.mutedInfo.muted) {
            unMuteTab(tab);
          } else {
            muteTab(tab);
          }
        }
      }
    }
    if ("privatetab_check" in data) {
      browser.contextMenus.update("privatetab_check", {
        checked: prefs.privatetab_check
      });
    }
    if ("whitelist_check" in data) {
      browser.contextMenus.update("add_edit", {
        title: (prefs.whitelist_check==true?"Add/edit entry to Whitelist":"Add/edit entry to Blacklist")
      });
    }
  }
  if ("context_menu" in data && typeof data["context_menu"] !== "undefined") {
    if (prefs.context_menu) {
      browser.contextMenus.create({
        id: "add_edit",
        title: (prefs.whitelist_check==true?"Add/edit entry to Whitelist":"Add/edit entry to Blacklist"),
        contexts: ["tab"]
      });
      browser.contextMenus.create({
        id: "privatetab_check",
        type: "checkbox",
        title: "Mute private tabs",
        contexts: ["tab"],
        checked: prefs.privatetab_check
      });
      browser.contextMenus.create({
        id: "separator",
        type: "separator",
        contexts: ["tab"]
      });
      browser.contextMenus.create({
        id: "settings",
        title: "Settings",
        contexts: ["tab"]
      });
    } else {
      browser.contextMenus.removeAll();
    }
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

browser.runtime.onMessage.addListener(msg => {
  const {type} = msg;

  let list = null;
  let listArray = null;
  switch (type) {
  case "add":
    if (prefs.whitelist_check) {
      if (prefs.whiteList != "") {
        list = {whiteList: prefs.whiteList+", "+msg.entry};
      } else {
        list = {whiteList: msg.entry};
      }
    } else {
      if (prefs.blackList != "") {
        list = {blackList: prefs.blackList+", "+msg.entry};
      } else {
        list = {blackList: msg.entry};
      }
    }
    browser.storage.local.set(list);
    break;
  case "edit":
    if (prefs.whitelist_check) {
      listArray = prefs.whiteList.split(/, |,/);
      listArray[msg.entryIndex] = msg.entry;
      list = {whiteList: listArray.join()};
    } else {
      listArray = prefs.blackList.split(/, |,/);
      listArray[msg.entryIndex] = msg.entry;
      list = {blackList: listArray.join()};
    }
    browser.storage.local.set(list);
    break;
  case "remove":
    if (prefs.whitelist_check) {
      listArray = prefs.whiteList.split(/, |,/);
      listArray.splice(msg.entryIndex, 1);
      list = {whiteList: listArray.join()};
    } else {
      listArray = prefs.blackList.split(/, |,/);
      listArray.splice(msg.entryIndex, 1);
      list = {blackList: listArray.join()};
    }
    browser.storage.local.set(list);
    break;
  }
});
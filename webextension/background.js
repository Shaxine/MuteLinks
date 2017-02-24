"use strict";

const extensionId = window.location.hostname;
const prefsNames = ["blackList","whitelist_check","whiteList","privatetab_check","context_menu"];
let prefs = {};
let port = null;

function init() {
  browser.storage.onChanged.addListener(onStorageChanged);
  port = browser.runtime.connect({name: "legacy-addon"});
  port.onMessage.addListener(msg => {
    const {type} = msg;

    switch (type) {
      case "request-prefs":
        if (Object.keys(msg.prefs).length == 0 && msg.prefs.constructor === Object) {
          browser.storage.local.set({
              blackList: "",
              whitelist_check: false,
              whiteList: "",
              privatetab_check: false,
              context_menu: "bottom",
            });
        } else {
          browser.storage.local.set(msg.prefs);
        }
        retriveData();
        break;
      case "open-settings":
        browser.runtime.openOptionsPage();
        break;
      case "add-popup":
        browser.windows.create({
          url: browser.extension.getURL("popup/add-popup.html?info="+msg.windowId+"-"+msg.tabIndex+"-"+(prefs.whitelist_check?"1":"0")),
          type: "panel",
          height: 110,
          width: 400
        }).then({}, onError);
        break;
      case "edit-popup":
        browser.windows.create({
          url: browser.extension.getURL("popup/edit-popup.html?info="+msg.windowId+"-"+msg.tabIndex+"-"+(prefs.whitelist_check?"1":"0")),
          type: "panel",
          height: 110,
          width: 400
        }).then({}, onError);
        break;
      case "entry-info":
        port.postMessage({type: "entry-info", tabId: msg.tabId, whiteList: prefs.whitelist_check, entryIndex: getEntryIndex(msg.tabUrl), priavteTab: prefs.privatetab_check});
        break;
      case "context-check":
        port.postMessage({type: "context-check", position: prefs.context_menu});
        break;
      case "context-position":
        port.postMessage({type: "context-position", windowId: msg.windowId, position: prefs.context_menu});
        break;
      case "toggle-private-tab":
        browser.storage.local.set({privatetab_check: !prefs.privatetab_check});
        break;
    }
  });
  retriveData();
}

init();

function onTabCreated(tab) {
  checkForMute(tab);
}

function checkForMute(tab) {
  if((prefs.privatetab_check && (tab.incognito === true || (("privateTab" in window) && privateTab.isTabPrivate(tab)))) || (prefs.whitelist_check && prefs.whiteList=="")) {
    muteTab(tab);
    return true;
  }else if(prefs.privatetab_check && !((prefs.blackList != "" && !prefs.whitelist_check) || prefs.whitelist_check)){
    if (tab.mutedInfo.muted && tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == extensionId) {
      unMuteTab(tab);
    }
    return true;
  }
  let itemsList = prefs.whitelist_check?prefs.whiteList.split(/, |,/):prefs.blackList.split(/, |,/);
  let url = tab.url;
  for (let item of itemsList){
    if((item.indexOf("\"") == 0 && item.slice(-1) == "\"") || (item.indexOf("'") == 0 && item.slice(-1) == "'")){
      item = item.replace(/\//g , "\\\/");
      item = "^"+item.slice(1, -1)+"$";
    }
    let pattern = new RegExp(item);
    if(!prefs.whitelist_check){
      if(pattern.test(url) && !tab.mutedInfo.muted){
        muteTab(tab);
        break;
      }else if(pattern.test(url) && tab.mutedInfo.muted){
        break;
      }else if((tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == extensionId) && tab.mutedInfo.muted && !pattern.test(url)){
        unMuteTab(tab);
      }
    }else{
      if(!tab.mutedInfo.muted && !pattern.test(url)){
        muteTab(tab);
      }else if(pattern.test(url) && !tab.mutedInfo.muted){
        break;
      }else if((tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == extensionId) && tab.mutedInfo.muted && pattern.test(url)){
        unMuteTab(tab);
        break;
      }
    }
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
      port.postMessage({type: "request-prefs"});
    } else {
      prefs = items;
      if (!("context_menu" in items)) {
        browser.storage.local.set({context_menu: "bottom"});
      }
      if ("priavtetab_check" in items) {
        browser.storage.local.remove("priavtetab_check").then({}, onError);
        browser.storage.local.set({privatetab_check: items["priavtetab_check"]});
        delete items["priavtetab_check"];
      }
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
    if(prefs.privatetab_check || (prefs.blackList != "" && !prefs.whitelist_check) || prefs.whitelist_check){
      if(!browser.tabs.onCreated.hasListener(onTabCreated)) {
        browser.tabs.onCreated.addListener(onTabCreated);
        browser.tabs.onUpdated.addListener(onTabUpdated);
      }
      browser.tabs.query({}).then(getTabs, onError);
      function getTabs(tabs) {
        for (let tab of tabs) {
          checkForMute(tab);
        }
      }
    }else{
      if(browser.tabs.onCreated.hasListener(onTabCreated)) {
        browser.tabs.onCreated.removeListener(onTabCreated);
        browser.tabs.onUpdated.removeListener(onTabUpdated);
      }
      browser.tabs.query({muted:!prefs.whitelist_check}).then(getTabs, onError);
      function getTabs(tabs) {
        for (let tab of tabs) {
          if(!prefs.whitelist_check && (tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == extensionId) && tab.mutedInfo.muted) {
            unMuteTab(tab);
          } else {
            muteTab(tab);
          }
        }
      }
    }
  }
  if ("context_menu" in data && typeof data["context_menu"] !== "undefined") {
    port.postMessage({type: "context-check", position: prefs.context_menu});
  }
}

function getEntryIndex(url) {
  let entryIndex = -1;
  if ((prefs.whitelist_check?prefs.whiteList:prefs.blackList)!="") {
    let itemsList = prefs.whitelist_check?prefs.whiteList.split(/, |,/):prefs.blackList.split(/, |,/);
    for (let item of itemsList){
      let org_item = item;
      if((item.indexOf('\"')==0 && item.slice(-1)=='\"') || (item.indexOf("'")==0 && item.slice(-1)=="'")){
        item = item.replace(/\//g , "\\\/");
        item = "^"+item.slice(1, -1)+"$";
      }
      let pattern = new RegExp(item);
      if(pattern.test(url)) {
        let i = itemsList.indexOf(org_item);
        entryIndex = i;
        break;
      }
    }
  }
  return entryIndex;
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
  case "add-popup-loaded":
    browser.tabs.query({windowId: parseInt(msg.windowId), index: parseInt(msg.tabIndex)}).then(getTabsAdd, onError);
    function getTabsAdd(tabs) {
      browser.runtime.sendMessage({type: "add-popup-loaded", entry: tabs[0].url});
    }
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
  case "edit-popup-loaded":
    browser.tabs.query({windowId: parseInt(msg.windowId), index: parseInt(msg.tabIndex)}).then(getTabsEdit, onError);
    function getTabsEdit(tabs) {
      let entryIndex = getEntryIndex(tabs[0].url);
      let entry = null;
      if (prefs.whitelist_check) {
        entry = prefs.whiteList.split(/, |,/)[entryIndex];
      } else {
        entry = prefs.blackList.split(/, |,/)[entryIndex];
      }
      browser.runtime.sendMessage({type: "edit-popup-loaded", entry: entry, entryIndex: entryIndex});
    }
    break;
  }
});
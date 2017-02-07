"use strict";

const prefsNames = ["blackList","whitelist_check","whiteList","priavtetab_check"];
let prefs = {};
let port = null;

function init() {
  browser.storage.onChanged.addListener(onStorageChanged);
  browser.tabs.onCreated.addListener(onTabCreated);
  browser.tabs.onUpdated.addListener(onTabUpdated);
  port = browser.runtime.connect({name: "legacy-addon"});
  port.onMessage.addListener(msg => {
    const {type} = msg;

    switch (type) {
      case "request-prefs":
        if (Object.keys(msg.prefs).length !== prefsNames.length && msg.prefs.constructor === Object) {
          browser.storage.local.set({
              blackList: "",
              whitelist_check: false,
              whiteList: "",
              priavtetab_check: false,
            });
        } else {
          browser.storage.local.set(msg.prefs);
        }
        retriveData();
        break;
    }
  });
  retriveData();
}

init();


function onUpdated(tab) {
  checkForMute(tab);
}

function onTabCreated(tab) {
  checkForMute(tab);
}

function checkForMute(tab) {
  if((prefs.priavtetab_check && (tab.incognito === true || (("privateTab" in window) && privateTab.isTabPrivate(tab)))) || (prefs.whitelist_check && prefs.whiteList=="")) {
    muteTab(tab);
    return true;
  }else if(prefs.priavtetab_check && !((prefs.blackList != "" && !prefs.whitelist_check) || prefs.whitelist_check)){
    if (tab.mutedInfo.muted && tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == browser.runtime.id) {
      unMuteTab(tab);
    }
    return true;
  }
  let itemsList = prefs.whitelist_check?prefs.whiteList.split(/, |,/):prefs.blackList.split(/, |,/);
  let url = tab.url;
  for (let item of itemsList){
    if((item.indexOf('\"')==0 && item.slice(-1)=='\"') || (item.indexOf("'")==0 && item.slice(-1)=="'")){
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
      }else if((tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == browser.runtime.id) && tab.mutedInfo.muted && !pattern.test(url)){
        unMuteTab(tab);
      }
    }else{
      if(!tab.mutedInfo.muted && !pattern.test(url)){
        muteTab(tab);
      }else if(pattern.test(url) && !tab.mutedInfo.muted){
        break;
      }else if((tab.mutedInfo.reason == "extension" && tab.mutedInfo.extensionId == browser.runtime.id) && tab.mutedInfo.muted && pattern.test(url)){
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
  browser.tabs.update(tab.id, {muted: true}).then(onUpdated, onError);
}

function unMuteTab(tab) {
  browser.tabs.update(tab.id, {muted: false}).then(onUpdated, onError);
}

function retriveData() {
  browser.storage.local.get(prefsNames).then(onStorageGet, onError);

  function onStorageGet(items) {
    if (typeof items[0] !== "undefined") {
      items = items[0];
    }
    if (Object.keys(items).length !== prefsNames.length && items.constructor === Object) {
      port.postMessage({type: "request-prefs"});
    } else {
      prefs = items;
    }
  }
}

function onStorageChanged(changes, area) {
  if (area == "local") {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      prefs[item] = changes[item].newValue;
    }
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

browser.runtime.onMessage.addListener(msg => {
  const {type} = msg;

  switch (type) {
  case "notify-attached-tab":
    browser.notifications.create({
      type: "basic",
      title: "Attached to tab",
      message: msg.message
    });
    break;
  }
});
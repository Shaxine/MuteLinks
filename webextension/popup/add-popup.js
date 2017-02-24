let info = window.location.href.split("info=")[1].split("-");

if (info[1]=="1") {
  document.title = "Add to Whitelist";
  document.getElementById("header").textContent = "Add to Whitelist";
  document.getElementById("add").textContent = "Add to Whitelist";
} else {
  document.title = "Add to Blacklist";
  document.getElementById("header").textContent = "Add to Blacklist";
  document.getElementById("add").textContent = "Add to Blacklist";
}

browser.runtime.sendMessage({type: "add-popup-loaded", tabId: info[0]});

browser.runtime.onMessage.addListener(msg => {
  const {type} = msg;

  switch (type) {
    case "add-popup-loaded":
      document.getElementById("entry").value = "\""+msg.entry+"\"";
      document.getElementById("entry").select();
      break;
  }
});

document.addEventListener("click", (e) => {
  e.preventDefault();
  if (e.target.id === "add") {
    browser.runtime.sendMessage({type: "add", entry: document.getElementById("entry").value});
    closeWindow();
  } else if (e.target.id === "cancel") {
    closeWindow();
  }
});

function closeWindow() {
  browser.windows.getCurrent().then(getWindow, onError);
    function getWindow(window) {
      browser.windows.remove(window.id);
    }
}

document.getElementById("entry").addEventListener("keydown", (e) => {
    if (e.keyCode == 13) {
        document.getElementById("add").click();
    }
});

document.getElementById("entry").addEventListener("input", (e) => {
    if (document.getElementById("entry").value == "" || (document.getElementById("entry").value != "" && document.getElementById("entry").value.match( /( |,)/ ))) {
      document.getElementById("add").disabled = true;
    } else {
      document.getElementById("add").disabled = false;
    }
});

function onError(error) {
  console.log(`Error: ${error}`);
}
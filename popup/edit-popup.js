let info = window.location.href.split("info=")[1].split("-");
let entryIndex = info[1];
document.getElementById("entry").value = atob(info[0]);
document.getElementById("entry").select();

document.addEventListener("click", (e) => {
  e.preventDefault();
  if (e.target.id === "edit") {
    browser.runtime.sendMessage({type: "edit", entry: document.getElementById("entry").value, entryIndex:entryIndex});
    closeWindow();
  } else if (e.target.id === "remove") {
    browser.runtime.sendMessage({type: "remove", entryIndex:entryIndex});
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
        document.getElementById("edit").click();
    }
});

document.getElementById("entry").addEventListener("input", (e) => {
    if (document.getElementById("entry").value == "" || (document.getElementById("entry").value != "" && document.getElementById("entry").value.match( /( |,)/ ))) {
      document.getElementById("edit").disabled = true;
    } else {
      document.getElementById("edit").disabled = false;
    }
});

function onError(error) {
  console.log(`Error: ${error}`);
}
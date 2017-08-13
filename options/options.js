const prefsNames = ["blackList","whitelist_check","whiteList","privatetab_check","context_menu"];

$(function() {
  restoreOptions();
  $("form").submit(function(event) {
    event.preventDefault();
  });
  $("table").on("click", ".edit", function() {
    $(this).closest("table").find(".change-rule:visible").hide().prev(".rule").show().parent().parent().find(".accept").removeClass("disabled").hide().next().show();
    $(this).hide().prev().show();
    let $rule = $(this).parent().parent().find(".rule").hide();
    $rule.next(".change-rule").val($rule.text()).show().select();
  });
  $("table").on("click", ".accept", function() {
    $(this).hide().next().show();
    let $changeRule = $(this).parent().parent().find(".change-rule").hide();
    $changeRule.prev(".rule").text($changeRule.val()).show();
  });
  $("table").on("keydown", ".change-rule", function(e) {
    if (e.which == 13) {
      if ($(this).val() != "" && !$(this).val().match( /( |,)/ )) {
        $(this).hide().prev(".rule").text($(this).val()).show().parent().parent().find(".accept").hide().next().show();
        saveOption($(this).closest("table").attr("id"));
      }
    } else if (e.which == 9) {
      if ($(this).val() != "" && !$(this).val().match( /( |,)/ )) {
        $(this).hide().prev(".rule").text($(this).val()).show().parent().parent().find(".accept").hide().next().show();
        saveOption($(this).closest("table").attr("id"));
      } else {
        $(this).hide().prev(".rule").show().parent().parent().find(".accept").hide().next().show();
      }
    }
  });
  $("table").on("input", ".change-rule", function(e) {
    if ($(this).val() != "" && !$(this).val().match( /( |,)/ )) {
      $(this).parent().parent().find(".accept.disabled").removeClass("disabled");
    } else {
      $(this).parent().parent().find(".accept:not(.disabled)").addClass("disabled");
    }
  });
  $("table").on("focusin", ".new-rule", function(e) {
    $(this).closest("table").find(".change-rule:visible").hide().prev(".rule").show().parent().parent().find(".accept").hide().next().show();
  });
  $("table").on("input", ".new-rule", function() {
    if ($(this).val() != "" && !$(this).val().match( /( |,)/ )) {
      $(this).parent().parent().find(".add.disabled").removeClass("disabled");
    } else {
      $(this).parent().parent().find(".add:not(.disabled)").addClass("disabled");
    }
  });
  $("table").on("keydown", ".new-rule", function(e) {
    if(e.which == 13 && $(this).val() != "" && !$(this).val().match( /( |,)/ )) {
      addItemToTable($(this).closest("table").attr("id"), $(this).val());
      $(this).val("");
      saveOption($(this).closest("table").attr("id"));
      $(this).parent().parent().find(".add:not(.disabled)").addClass("disabled");
    }
  });
  $("table").on("click", ".add", function(e) {
    addItemToTable($(this).closest("table").attr("id"), $(this).parent().parent().find(".new-rule").val());
    $(this).addClass("disabled").parent().parent().find(".new-rule").val("");
    saveOption($(this).closest("table").attr("id"));
  });
  $("table").on("click", ".delete", function(e) {
    let option = $(this).closest("table").attr("id");
    if (confirm("Do you want to remove the \""+$(this).parent().parent().find(".rule").text()+"\" rule?")) {
      $(this).parent().parent().remove();
      saveOption(option);
    }
  });
  $("form").on("change", ":checkbox, select", function(){
    saveOption($(this).attr("id"));
  });
  $(document).on("click", "#paypal", function(e) {
    browser.tabs.create({url:"https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=79NLHH9LUBGWU"});
  });
  $(document).on("click", "#bitcoin", function(e) {
    $(".bitcoin-adress").css("display","inline");
  });
});

function saveOption(option) {
  let opt = {};
  opt[option] = getItem(option);
  browser.storage.local.set(opt);
}

function restoreOptions() {
  browser.storage.local.get(prefsNames).then(onStorageGet, onError);
  function onStorageGet(items) {
    if (typeof items[0] !== "undefined") {
      items = items[0];
    }
    if (Object.keys(items).length === prefsNames.length && items.constructor === Object) {
      let itemsKeys = Object.keys(items);
      for (let item of itemsKeys) {
        changeItem(item, items[item]);
      }
    }
  }
}

function changeItem(item, value) {
  if (item == "blackList" || item == "whiteList"){
    if (value != "") {
      for (let i of value.split(/, |,/)){
        addItemToTable(item, i);
      }
    }
  } else if ($("#"+item).prop("tagName").toLowerCase() == "select"){
    $("#"+item+" option[value=\""+value+"\"]").prop("selected", true);
  } else {
    switch ($("#"+item).prop("type")) {
      case "text":
        $("#"+item).val(value);
        break;
      case "checkbox":
        $("#"+item).prop("checked",value);
        break;
    }
  }
}

function addItemToTable(item, value) {
  $("#"+item+" > tbody > tr").last().before($("<tr>")
    .append($("<td>")
      .append($("<span>", { class: "rule" }).text(value))
      .append($("<input>", { class: "change-rule", type: "text" }))
    )
    .append($("<td>")
      .append($("<img>", { class: "accept", src: "img/accept.png" }))
      .append($("<img>", { class: "edit", src: "img/edit.png" }))
      .append($("<img>", { class: "delete", src: "img/delete.png" }))
    )
  );
}

function getItem(item) {
  if (item == "blackList" || item == "whiteList"){
    if ($("#"+item+" .rule").length) {
      let list = [];
      $("#"+item+" .rule").each(function(i){
        list.push($(this).text());
      });
      return list.join();
    } else {
      return "";
    }
  } else if ($("#"+item).prop("tagName").toLowerCase() == "select"){
    return $("#"+item).val();
  } else {
    switch ($("#"+item).prop("type")) {
      case "text":
        return $("#"+item).val();
      case "checkbox":
        return $("#"+item).prop("checked");
    }
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}
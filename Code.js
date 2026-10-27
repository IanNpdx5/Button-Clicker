$(function () {
  var state = { count: 0, totalClicks: 0, totalPresses: 0, perClick: 1, perSecond: 0 };
  var SAVE_KEY = "buttonClickerSave";

  // type: "pc" = per click, "ps" = per second
  var upgrades = [
    { id: "#up1", price: 15, amount: 1, type: "pc" },
    { id: "#up2", price: 100, amount: 5, type: "pc" },
    { id: "#up3", price: 500, amount: 10, type: "pc" },
    { id: "#up4", price: 1000, amount: 100, type: "pc" },
    { id: "#up5", price: 5000, amount: 500, type: "pc" },
    { id: "#up6", price: 100, amount: 1, type: "ps" },
    { id: "#up7", price: 500, amount: 5, type: "ps" },
    { id: "#up8", price: 1000, amount: 10, type: "ps" },
    { id: "#up9", price: 5000, amount: 50, type: "ps" },
    { id: "#up10", price: 10000, amount: 100, type: "ps" },
    { id: "#up11", price: 25000, amount: 2, type: "pcMultiplier", effect: "2× Click power" },
    { id: "#up12", price: 25000, amount: 2, type: "psMultiplier", effect: "2× CPS" },
    { id: "#up13", price: 250000, amount: 5, type: "pcMultiplier", effect: "5× Click power" },
    { id: "#up14", price: 250000, amount: 5, type: "psMultiplier", effect: "5× CPS" }
  ];
  var PRICE_GROWTH = 1.15; // set to 1 to keep your original fixed prices

  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        version: 1,
        state: state,
        prices: upgrades.map(function (u) { return u.price; })
      }));
    } catch (error) {
      console.error(error)
      // The game remains playable if browser storage is unavailable.
    }
  }

  function loadGame() {
    try {
      var saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || saved.version !== 1 || !saved.state) return;

      ["count", "totalClicks", "presses", "perClick", "perSecond"].forEach(function (key) {
        var value = saved.state[key];
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
          state[key] = key === "perClick" ? Math.max(1, value) : value;
        }
      });

      if (Array.isArray(saved.prices)) {
        upgrades.forEach(function (u, index) {
          var price = saved.prices[index];
          if (typeof price === "number" && Number.isFinite(price) && price >= 1) {
            u.price = price;
          }
        });
      }
    } catch (error) {
      console.error(error)
      // Ignore invalid or unavailable saves and start a fresh game.
    }
  }

  function softReset() {
    state.count = 0;
    state.perSecond = 0;
    state.perClick = 0;
    saveGame();
    location.reload();
  }

  document.getElementById("softReset").addEventListener("click", softReset);

  function hardReset() {
    state.count = 0;
    state.perClick = 0;
    state.perSecond = 0;
    state.totalClicks = 0;
    state.totalPresses = 0;
    saveGame();
    location.reload();
  }

  document.getElementById("hardReset").addEventListener("click", hardReset);

  function render() {
    $("#count").text("Clicks: " + state.count);
    $("#amountPC").text("Amount per click: " + state.perClick);
    $("#amountPS").text("Click(s) per second (CPS): " + state.perSecond);
    $("#clicks").text("Total clicks: " + state.totalClicks);
    $("#presses").text("Total presses: " + state.totalPresses);

    upgrades.forEach(function (u) {
      var affordable = state.count >= u.price;
      var effect = u.effect || ("+" + u.amount + (u.type === "pc" ? " click" : " CPS"));
      $(u.id)
        .html('<span class="cost">' + u.price.toLocaleString() + '</span> Clicks (' + effect + ')')
        .prop("disabled", !affordable)
        .toggleClass("affordable", affordable);
    });
  }

  $("#clickerButton").on("click", function () {
    state.count += state.perClick;
    state.totalClicks += state.perClick;
    state.totalPresses++;
    render();
    saveGame();
  });

  upgrades.forEach(function (u) {
    $(u.id).on("click", function () {
      if (state.count < u.price) return;
      state.count -= u.price;
      if (u.type === "pc") state.perClick += u.amount;
      else if (u.type === "ps") state.perSecond += u.amount;
      else if (u.type === "pcMultiplier") state.perClick *= u.amount;
      else if (u.type === "psMultiplier") state.perSecond = Math.max(1, state.perSecond) * u.amount;
      u.price = Math.ceil(u.price * PRICE_GROWTH);
      render();
      saveGame();
    });
  });

  setInterval(function () {
    if (state.perSecond === 0) return;
    state.count += state.perSecond;
    state.totalClicks += state.perSecond;
    render();
    saveGame();
  }, 1000);

  loadGame();
  window.addEventListener("pagehide", saveGame);
  render();
});

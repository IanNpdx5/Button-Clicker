$(function () {
  var state = { count: 0, totalClicks: 0, totalPresses: 0, perClick: 1, perSecond: 0 };
  var SAVE_KEY = "buttonClickerSave";

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
  var PRICE_GROWTH = 1.15;

  // Cache DOM selectors to eliminate repetitive layout lookups
  var $count = $("#count");
  var $amountPC = $("#amountPC");
  var $amountPS = $("#amountPS");
  var $clicks = $("#clicks");
  var $presses = $("#presses");

  upgrades.forEach(function (u) {
    u.$el = $(u.id);
    u.$textSpan = u.$el.find(".button-text"); // Caches the full text target span
  });

  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        version: 1,
        state: state,
        prices: upgrades.map(function (u) { return u.price; })
      }));
    } catch (error) {
      console.error(error);
    }
  }

  function loadGame() {
    try {
      var saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || saved.version !== 1 || !saved.state) return;

      ["count", "totalClicks", "totalPresses", "perClick", "perSecond"].forEach(function (key) {
        var value = saved.state[key];
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
          state[key] = key === "perClick" ? Math.max(1, value) : value;
        }
      });

      if (Array.isArray(saved.prices)) {
            upgrades.forEach(function (u) {
      var affordable = state.count >= u.price;
      
      // FIXED: Changed u.$costSpan to u.$textSpan
      u.$textSpan.text(u.price.toLocaleString() + " Clicks");
      
      u.$el.prop("disabled", !affordable)
           .toggleClass("affordable", affordable);
    });

      }
    } catch (error) {
      console.error(error);
    }
  }

  function softReset() {
    // 1. Clear out storage completely so it loads clean
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.error(e);
    }

    // 2. Set state back to fresh starting parameters
    state.count = 0;
    state.perSecond = 0;
    state.perClick = 1;
    state.totalClicks = 0;
    state.totalPresses = 0;

    // 3. Force page reload to clear out modified prices currently in memory
    location.reload();
  }
  document.getElementById("softReset").addEventListener("click", softReset);

  function hardReset() {
    // 1. Clear out storage completely
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.error(e);
    }

    // 2. Wipe state variables completely
    state.count = 0;
    state.perClick = 1;
    state.perSecond = 0;
    state.totalClicks = 0;
    state.totalPresses = 0;

    // 3. Reload to reset the active prices array to baseline defaults
    location.reload();
  }
  document.getElementById("hardReset").addEventListener("click", hardReset);

  var savePending = false;
  function queueSave() {
    savePending = true;
  }

  // User input modifications modify the state array, leaving rendering tasks to requestAnimationFrame
  $("#clickerButton").on("click", function () {
    state.count += state.perClick;
    state.totalClicks += state.perClick;
    state.totalPresses++;
    queueSave();
  });

  upgrades.forEach(function (u) {
    u.$el.on("click", function () {
      if (state.count < u.price) return;
      state.count -= u.price;
      if (u.type === "pc") state.perClick += u.amount;
      else if (u.type === "ps") state.perSecond += u.amount;
      else if (u.type === "pcMultiplier") state.perClick *= u.amount;
      else if (u.type === "psMultiplier") state.perSecond = Math.max(1, state.perSecond) * u.amount;
      u.price = Math.ceil(u.price * PRICE_GROWTH);
      queueSave();
    });
  });

  // Background 1-second loop handles throttled operations like saving data to disk
  setInterval(function () {
    if (savePending) {
      saveGame();
      savePending = false;
    }
  }, 1000);

  // --- 60FPS HIGH-FRAMERATE TICK LOOP ENGINE ---
  var lastTick = performance.now();

  function gameLoop(timestamp) {
    // Calculate fractional time difference between monitor frames (delta time)
    var delta = (timestamp - lastTick) / 1000;
    lastTick = timestamp;

    // Smooth point accumulation over fractional time differences
    if (state.perSecond > 0 && delta > 0) {
      var pointsToAdd = state.perSecond * delta;
      state.count += pointsToAdd;
      state.totalClicks += pointsToAdd;
    }

    // High performance UI rendering
    // Math.floor displays stable integer counts, masking hidden float decimals
    $count.text("Clicks: " + Math.floor(state.count).toLocaleString());
    $amountPC.text("Amount per click: " + state.perClick.toLocaleString());
    $amountPS.text("Click(s) per second (CPS): " + state.perSecond.toLocaleString());
    $clicks.text("Total clicks: " + Math.floor(state.totalClicks).toLocaleString());
    $presses.text("Total presses: " + state.totalPresses.toLocaleString());

    upgrades.forEach(function (u) {
      var affordable = state.count >= u.price;
      u.$costSpan.text(u.price.toLocaleString());
      u.$el.prop("disabled", !affordable)
        .toggleClass("affordable", affordable);
    });

    // Schedule next frame rendering pass
    requestAnimationFrame(gameLoop);
  }

  loadGame();
  window.addEventListener("pagehide", saveGame);

  // Kick off the loop
  requestAnimationFrame(gameLoop);
});

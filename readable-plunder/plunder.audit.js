/*
 * Readable audit rewrite of downloaded-plunder/plunder.js.
 *
 * This file is intentionally non-operational:
 * - no beacon request
 * - no external /compute request
 * - no TribalWars.post("scavenge_api", { ajaxaction: "send_squads" }, ...)
 * - no bot-check continuation logic
 *
 * Purpose: explain the original script's structure and data flow without
 * automating gameplay or depending on the external worker.
 */
(function plunderAudit() {
  "use strict";

  const LICENSED_PLAYER = "Arnold22";
  const ORIGINAL_KEY = "6e9f031329d2c74bcd195e5b";
  const ORIGINAL_WORKER = "https://ds-plunder.jumperjim112.workers.dev";
  const STORAGE_PREFIX = "ds.plunder.";

  const UNIT_ORDER = [
    "spear",
    "sword",
    "axe",
    "archer",
    "light",
    "marcher",
    "heavy",
    "knight",
  ];

  const SLOT_IDS = [0, 1, 2, 3];

  function requireGameContext() {
    if (typeof window.game_data === "undefined" || typeof window.TribalWars === "undefined") {
      throw new Error("Open this in Tribal Wars / Die Staemme.");
    }

    const playerName = String(window.game_data.player?.name || "");
    if (playerName.toLowerCase() !== LICENSED_PLAYER.toLowerCase()) {
      throw new Error("Original script was locked to account: " + LICENSED_PLAYER);
    }
  }

  function getAvailableUnits() {
    const gameUnits = window.game_data?.units || [];
    const available = UNIT_ORDER.filter((unit) => gameUnits.indexOf(unit) >= 0);
    return available.length ? available : UNIT_ORDER.slice();
  }

  function getStorageKey(slot) {
    const world = window.game_data?.world || "x";
    return STORAGE_PREFIX + world + (slot ? ".s" + slot : "");
  }

  function readSettings(slot) {
    const raw = localStorage.getItem(getStorageKey(slot));
    return raw ? JSON.parse(raw) : null;
  }

  function writeSettings(settings, slot) {
    localStorage.setItem(getStorageKey(slot), JSON.stringify(settings));
  }

  function readCurrentUiSettings(root) {
    const settings = {
      use: {},
      keep: {},
      cats: [],
      group: root.querySelector("#mqg")?.value || "0",
      mode: root.querySelector("input[name=mm]:checked")?.value || "eff",
      maxH: root.querySelector("#mqT")?.value || "3",
      auto: !!root.querySelector("#mqauto")?.checked,
      interval: root.querySelector("#mqI")?.value || "30",
    };

    root.querySelectorAll(".mu").forEach((input) => {
      settings.use[input.dataset.u] = input.checked;
    });

    root.querySelectorAll(".mk").forEach((input) => {
      if (input.dataset.u) settings.keep[input.dataset.u] = input.value;
    });

    root.querySelectorAll(".mc").forEach((input) => {
      settings.cats[input.dataset.c] = input.checked;
    });

    return settings;
  }

  function applySettings(root, settings) {
    if (!settings) return;

    root.querySelectorAll(".mu").forEach((input) => {
      if (settings.use?.[input.dataset.u] !== undefined) {
        input.checked = settings.use[input.dataset.u];
      }
    });

    root.querySelectorAll(".mk").forEach((input) => {
      if (settings.keep?.[input.dataset.u] !== undefined) {
        input.value = settings.keep[input.dataset.u];
      }
    });

    root.querySelectorAll(".mc").forEach((input) => {
      if (settings.cats?.[input.dataset.c] !== undefined) {
        input.checked = settings.cats[input.dataset.c];
      }
    });

    if (settings.mode) {
      const mode = root.querySelector("input[name=mm][value='" + settings.mode + "']");
      if (mode) mode.checked = true;
    }

    if (settings.maxH) root.querySelector("#mqT").value = settings.maxH;
    if (settings.interval) root.querySelector("#mqI").value = settings.interval;
    if (settings.auto !== undefined) root.querySelector("#mqauto").checked = settings.auto;
    if (settings.group) root.querySelector("#mqg").value = settings.group;
  }

  function extractWorldSettings(html) {
    const source = String(html || "");
    const durationFactor = source.match(/duration_factor[":\s]*([\d.]+)/);
    const durationExponent = source.match(/duration_exponent[":\s]*([\d.]+)/);
    const initialSeconds = source.match(/duration_initial_seconds[":\s]*([\d.]+)/);

    if (!durationFactor) {
      return {
        e: 0.45,
        s: 1800,
        f: Math.pow(window.game_data?.speed || 1, -0.55),
      };
    }

    return {
      f: Number(durationFactor[1]),
      e: durationExponent ? Number(durationExponent[1]) : 0.45,
      s: initialSeconds ? Number(initialSeconds[1]) : 1800,
    };
  }

  function findJsonEnd(source, start) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < source.length; index++) {
      const char = source[index];

      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === "\"") inString = false;
        continue;
      }

      if (char === "\"") inString = true;
      else if (char === "{" || char === "[") depth++;
      else if (char === "}" || char === "]") {
        depth--;
        if (depth === 0) return index;
      }
    }

    return -1;
  }

  function extractVillageData(html) {
    const source = String(html || "");
    let start = -1;
    let depth = 0;

    for (let index = source.lastIndexOf("unit_counts_home"); index >= 0; index--) {
      const char = source[index];
      if (char === "}" || char === "]") depth++;
      else if (char === "{" || char === "[") {
        if (depth === 0) {
          start = index;
          break;
        }
        depth--;
      }
    }

    if (start < 0) return [];

    const end = findJsonEnd(source, start);
    if (end < 0) return [];

    try {
      const parsed = JSON.parse(source.slice(start, end + 1));
      const villages = Array.isArray(parsed) ? parsed : Object.keys(parsed).map((key) => parsed[key]);
      return villages.filter((village) => village && village.unit_counts_home);
    } catch (_) {
      return [];
    }
  }

  function minimizeVillageForCompute(village) {
    const options = {};

    SLOT_IDS.forEach((slotId) => {
      const option = village.options?.[slotId];
      if (!option) return;

      options[slotId] = {
        is_locked: option.is_locked,
        scavenging_squad: option.scavenging_squad
          ? { unit_counts: option.scavenging_squad.unit_counts }
          : null,
      };
    });

    return {
      village_id: village.village_id,
      has_rally_point: village.has_rally_point,
      unit_carry_factor: village.unit_carry_factor,
      unit_counts_home: village.unit_counts_home,
      options,
    };
  }

  function blockedExternalCompute(villages, settings, worldSettings, units) {
    const payload = {
      villages: villages.map(minimizeVillageForCompute),
      st: settings,
      w: worldSettings,
      U: units,
    };

    console.warn("Original script sent this payload to:", ORIGINAL_WORKER + "/compute?key=" + ORIGINAL_KEY);
    console.warn("External compute is disabled in this audit rewrite.", payload);
    return [];
  }

  function blockedSendSquads(squadRequests) {
    console.warn("Original script would send squad_requests to TribalWars scavenge_api.");
    console.warn("Sending is disabled in this audit rewrite.", squadRequests);
  }

  function renderPanel(units) {
    const existing = document.getElementById("mqx");
    if (existing) existing.remove();

    const root = document.createElement("div");
    root.id = "mqx";
    root.innerHTML = [
      "<style>",
      "#mqx{position:fixed;left:16px;top:16px;z-index:9999;width:336px;background:#1c1108;color:#f0e6c8;border:2px solid #9b7a1a;border-radius:8px;font:13px/1.5 sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.8)}",
      "#mqx-hd{background:#271608;padding:10px 14px;border-bottom:1px solid #9b7a1a;display:flex;align-items:center;justify-content:space-between}",
      "#mqx-hd h3{margin:0;font-size:14px;color:#c9a84c}",
      "#mqx-bd{padding:12px 14px;max-height:82vh;overflow-y:auto}",
      ".mqs{margin:8px 0;background:#271608;border:1px solid #5a3a08;border-radius:6px;padding:8px 10px}",
      ".mq-lb{font-size:10px;color:#9b7a1a;font-weight:bold;text-transform:uppercase;margin-bottom:6px}",
      ".mql{display:inline-flex;align-items:center;gap:3px;width:49%;font-size:12px;padding:2px 0}",
      ".mk,#mqT,#mqI,select{background:#130c03;border:1px solid #5a3a08;color:#f0e6c8;font-size:12px}",
      "button{background:#3d2606;color:#f0e6c8;border:1px solid #8b6914;border-radius:4px;padding:5px 10px;cursor:pointer}",
      "#mqst{font-size:11px;min-height:14px;margin-top:4px}",
      "</style>",
      '<div id="mqx-hd"><h3>Massen-Raubzug Audit</h3><button id="mqcl">x</button></div>',
      '<div id="mqx-bd">',
      '<div class="mqs"><div class="mq-lb">Truppen und Reserve</div>',
      units.map((unit) => (
        '<label class="mql"><input type="checkbox" class="mu" data-u="' + unit + '" checked> ' +
        unit +
        ' <input class="mk" data-u="' + unit + '" value="0" style="width:34px"></label>'
      )).join(""),
      "</div>",
      '<div class="mqs"><div class="mq-lb">Einstellungen</div>',
      '<div>Grp <select id="mqg"><option value="0">Alle Gruppen</option></select></div>',
      '<label><input type="radio" name="mm" value="eff" checked> Eff</label> ',
      '<label><input type="radio" name="mm" value="limit"> Limit</label> ',
      'Max <input id="mqT" value="3" style="width:34px">',
      '<div>Slots ' +
        SLOT_IDS.map((slot) => (
          '<label><input type="checkbox" class="mc" data-c="' + slot + '" checked> ' + (slot + 1) + "</label>"
        )).join(" ") +
      "</div>",
      "</div>",
      '<div class="mqs"><div class="mq-lb">Gespeicherte Settings</div>',
      '<button id="mqsave1">Speichern 1</button> <button id="mqload1">Laden 1</button><br>',
      '<button id="mqsave2">Speichern 2</button> <button id="mqload2">Laden 2</button>',
      "</div>",
      '<div class="mqs"><div class="mq-lb">Vollautomatik</div>',
      '<label><input type="checkbox" id="mqauto"> Automatisch wiederholen</label> ',
      '<input id="mqI" value="30" style="width:34px"> min',
      "</div>",
      '<button id="mqc">Audit starten</button>',
      '<div id="mqst"></div>',
      "</div>",
    ].join("");

    document.body.appendChild(root);

    root.querySelector("#mqcl").addEventListener("click", () => root.remove());
    root.querySelector("#mqsave1").addEventListener("click", () => writeSettings(readCurrentUiSettings(root), 1));
    root.querySelector("#mqsave2").addEventListener("click", () => writeSettings(readCurrentUiSettings(root), 2));
    root.querySelector("#mqload1").addEventListener("click", () => applySettings(root, readSettings(1)));
    root.querySelector("#mqload2").addEventListener("click", () => applySettings(root, readSettings(2)));

    root.querySelector("#mqc").addEventListener("click", () => {
      const settings = readCurrentUiSettings(root);
      const unitsForPayload = getAvailableUnits();
      root.querySelector("#mqst").textContent =
        "Audit-Modus: keine externen Requests, keine Raubzuege gesendet. Siehe Console.";

      console.info("Current settings:", settings);
      console.info("Available units:", unitsForPayload);
      console.info("Original flow: load scavenge_mass pages, extract villages, call external compute, send squad_requests.");

      const dummyWorldSettings = extractWorldSettings("");
      const squadRequests = blockedExternalCompute([], settings, dummyWorldSettings, unitsForPayload);
      blockedSendSquads(squadRequests);
    });

    applySettings(root, readSettings(null));
    return root;
  }

  function main() {
    requireGameContext();

    if (location.href.indexOf("scavenge_mass") < 0) {
      console.warn("Original script would redirect to game.php?screen=place&mode=scavenge_mass here.");
    }

    renderPanel(getAvailableUnits());
  }

  main();
})();

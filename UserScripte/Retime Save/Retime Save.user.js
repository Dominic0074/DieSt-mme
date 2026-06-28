// ==UserScript==
// @name         Retime Save
// @namespace    https://github.com/Dominic0074/DieSt-mme
// @version      1.0.0
// @description  Sendet zu einer festgelegten Serverzeit konfigurierte Truppen als Unterstuetzung.
// @author       kk
// @match        https://*.die-staemme.de/game.php*
// @match        https://die-staemme.de/game.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // =========================================================================
  // KONFIGURATION
  // =========================================================================

  // Erst nach dem Eintragen aller Werte auf true setzen.
  const SCRIPT_ENABLED = false;

  // Gewuenschte Absendezeit laut Serveruhr: JJJJ-MM-TT HH:MM:SS.mmm
  const SEND_AT = '2026-06-28 17:57:00.000';

  // Dorf, an das die Unterstuetzung geschickt werden soll.
  const TARGET_X = 587;
  const TARGET_Y = 392;

  // Anzahl der zu sendenden Truppen. Nicht benoetigte Einheitentypen bleiben 0.
  const UNITS = {
    spear: 10,  // Speertraeger
    sword: 10,  // Schwertkaempfer
    axe: 0,       // Axtkaempfer
    archer: 0,    // Bogenschuetzen
    spy: 0,       // Spaeher
    light: 0,     // Leichte Kavallerie
    marcher: 0,   // Berittene Bogenschuetzen
    heavy: 0,     // Schwere Kavallerie
    ram: 0,       // Rammen
    catapult: 0,  // Katapulte
    knight: 0,    // Paladin
    snob: 0,      // Adelsgeschlecht
    militia: 0    // Miliz
  };

  // Optional: ID des Ausgangsdorfs eintragen. null verwendet das aktuell
  // ausgewaehlte Dorf und behaelt es bei allen Seitenwechseln bei.
  const SOURCE_VILLAGE_ID = null;

  // Wie viele Sekunden vor SEND_AT die Bestaetigungsseite vorbereitet wird.
  const PREPARE_SECONDS = 60;

  // Nach dieser Verspaetung wird aus Sicherheitsgruenden nicht mehr gesendet.
  const MAX_LATE_MS = 1500;

  // =========================================================================
  // ENDE DER KONFIGURATION
  // =========================================================================

  const STATUS_ID = 'retime-save-status';
  let stopped = false;

  function getServerNow() {
    const timingNow = Number(window.Timing?.getCurrentServerTime?.());
    if (Number.isFinite(timingNow) && timingNow > 0) {
      return timingNow < 1000000000000 ? timingNow * 1000 : timingNow;
    }
    return Date.now();
  }

  function parseSendTime(value) {
    const match = String(value).trim().match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/
    );
    if (!match) return null;

    const parts = match.slice(1, 7).map(Number);
    const milliseconds = Number(String(match[7] || '0').padEnd(3, '0'));
    const date = new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      parts[3],
      parts[4],
      parts[5],
      milliseconds
    );

    const isExactDate = date.getFullYear() === parts[0]
      && date.getMonth() === parts[1] - 1
      && date.getDate() === parts[2]
      && date.getHours() === parts[3]
      && date.getMinutes() === parts[4]
      && date.getSeconds() === parts[5];

    return isExactDate ? date.getTime() : null;
  }

  function getCurrentVillageId() {
    return new URLSearchParams(location.search).get('village');
  }

  function getSourceVillageId() {
    return SOURCE_VILLAGE_ID === null
      ? getCurrentVillageId()
      : String(SOURCE_VILLAGE_ID);
  }

  function getStorageKey(sendAt) {
    return [
      'retime_save_sent_v1',
      getSourceVillageId() || 'unknown',
      `${TARGET_X}|${TARGET_Y}`,
      sendAt
    ].join(':');
  }

  function getPlaceUrl() {
    const params = new URLSearchParams();
    const villageId = getSourceVillageId();
    if (villageId) params.set('village', villageId);
    params.set('screen', 'place');
    return `${location.origin}${location.pathname}?${params.toString()}`;
  }

  function isBotProtectionActive() {
    if (document.querySelector('#captcha, .captcha, img[src*="captcha"], img[src*="botcheck"]')) {
      return true;
    }

    const botProtection = document.querySelector('#botprotection_quest');
    if (botProtection) {
      const style = window.getComputedStyle(botProtection);
      if (style.display !== 'none' && style.visibility !== 'hidden') return true;
    }

    return /du bist ein bot|bot.{0,30}schutz|captcha|are you human/i
      .test(document.body?.innerText || '');
  }

  function showStatus(text, isError = false) {
    let box = document.getElementById(STATUS_ID);
    if (!box) {
      box = document.createElement('div');
      box.id = STATUS_ID;
      Object.assign(box.style, {
        position: 'fixed',
        right: '12px',
        bottom: '12px',
        zIndex: '10000',
        maxWidth: '360px',
        padding: '10px 14px',
        border: '1px solid #7d510f',
        borderRadius: '4px',
        background: '#f4e4bc',
        color: '#2f2416',
        font: 'bold 13px Arial, sans-serif',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)'
      });
      document.body.appendChild(box);
    }

    box.style.background = isError ? '#f3c7c7' : '#f4e4bc';
    box.style.borderColor = isError ? '#a40000' : '#7d510f';
    box.textContent = `Retime Save: ${text}`;
  }

  function stopWithError(message) {
    stopped = true;
    showStatus(message, true);
    console.error(`Retime Save: ${message}`);
  }

  function formatRemaining(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const restSeconds = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
  }

  function setInputValue(input, value) {
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function getCommandForm() {
    return document.querySelector('#command-data-form');
  }

  function isConfirmationPage() {
    return Boolean(getCommandForm()?.querySelector('#troop_confirm_submit'));
  }

  function validateConfiguration(sendAt) {
    if (!sendAt) return 'SEND_AT hat nicht das Format JJJJ-MM-TT HH:MM:SS.mmm.';
    if (!Number.isInteger(TARGET_X) || TARGET_X < 0 || TARGET_X > 999
      || !Number.isInteger(TARGET_Y) || TARGET_Y < 0 || TARGET_Y > 999) {
      return 'TARGET_X und TARGET_Y muessen ganze Zahlen zwischen 0 und 999 sein.';
    }
    if (!Number.isFinite(PREPARE_SECONDS) || PREPARE_SECONDS < 5) {
      return 'PREPARE_SECONDS muss mindestens 5 sein.';
    }
    if (!Number.isFinite(MAX_LATE_MS) || MAX_LATE_MS < 0) {
      return 'MAX_LATE_MS darf nicht negativ sein.';
    }

    const configuredUnits = Object.entries(UNITS).filter(([, amount]) => Number(amount) > 0);
    if (configuredUnits.length === 0) return 'In UNITS ist keine Truppe eingetragen.';

    const invalidUnit = Object.entries(UNITS).find(([, amount]) => (
      !Number.isInteger(Number(amount)) || Number(amount) < 0
    ));
    if (invalidUnit) return `Die Truppenanzahl fuer "${invalidUnit[0]}" ist ungueltig.`;

    if (SOURCE_VILLAGE_ID !== null && !/^\d+$/.test(String(SOURCE_VILLAGE_ID))) {
      return 'SOURCE_VILLAGE_ID muss null oder eine numerische Dorf-ID sein.';
    }
    return null;
  }

  function prepareCommand(sendAt) {
    const form = getCommandForm();
    const supportButton = form?.querySelector('#target_support, [name="support"]');
    if (!form || !supportButton) {
      stopWithError('Befehlsformular oder Unterstuetzen-Button wurde nicht gefunden.');
      return;
    }

    for (const [unit, rawAmount] of Object.entries(UNITS)) {
      const amount = Number(rawAmount);
      if (amount === 0) continue;

      const input = form.querySelector(`[name="${unit}"]`);
      if (!input) {
        stopWithError(`Das Eingabefeld fuer "${unit}" ist in diesem Dorf nicht vorhanden.`);
        return;
      }

      const available = Number(input.dataset.allCount);
      if (Number.isFinite(available) && amount > available) {
        stopWithError(`Fuer "${unit}" sind ${amount} konfiguriert, aber nur ${available} vorhanden.`);
        return;
      }
      setInputValue(input, amount);
    }

    const xInput = form.querySelector('[name="x"]');
    const yInput = form.querySelector('[name="y"]');
    if (!xInput || !yInput) {
      stopWithError('Die Eingabefelder fuer die Zielkoordinaten wurden nicht gefunden.');
      return;
    }
    setInputValue(xInput, TARGET_X);
    setInputValue(yInput, TARGET_Y);

    if (isBotProtectionActive()) {
      stopWithError('Bot-Schutz erkannt. Versand wurde gestoppt.');
      return;
    }

    if (getServerNow() - sendAt > MAX_LATE_MS) {
      stopWithError('Absendezeit wurde verpasst. Es wird nicht nachtraeglich gesendet.');
      return;
    }

    showStatus('Eingaben gesetzt; Bestaetigungsseite wird vorbereitet.');
    if (typeof form.requestSubmit === 'function') form.requestSubmit(supportButton);
    else supportButton.click();
  }

  function submitAt(sendAt) {
    const form = getCommandForm();
    const submitButton = form?.querySelector('#troop_confirm_submit[name="submit_confirm"], #troop_confirm_submit');
    if (!form || !submitButton) {
      stopWithError('Bestaetigungsformular oder finaler Senden-Button wurde nicht gefunden.');
      return;
    }

    const tick = () => {
      if (stopped) return;
      if (isBotProtectionActive()) {
        stopWithError('Bot-Schutz erkannt. Versand wurde gestoppt.');
        return;
      }

      const remaining = sendAt - getServerNow();
      if (remaining > 1000) {
        showStatus(`Bestaetigung bereit. Versand in ${formatRemaining(remaining)}.`);
        setTimeout(tick, Math.min(remaining - 500, 1000));
        return;
      }
      if (remaining > 20) {
        setTimeout(tick, Math.max(1, remaining - 10));
        return;
      }
      if (remaining > 0) {
        requestAnimationFrame(tick);
        return;
      }
      if (-remaining > MAX_LATE_MS) {
        stopWithError(`Absendezeit um ${Math.round(-remaining)} ms verpasst. Es wird nicht gesendet.`);
        return;
      }

      localStorage.setItem(getStorageKey(sendAt), String(getServerNow()));
      showStatus('Unterstuetzung wird jetzt gesendet.');
      console.log(`Retime Save: Unterstuetzung an ${TARGET_X}|${TARGET_Y} wird gesendet.`);
      if (typeof form.requestSubmit === 'function') form.requestSubmit(submitButton);
      else submitButton.click();
    };

    tick();
  }

  function start(sendAt) {
    if (localStorage.getItem(getStorageKey(sendAt))) {
      showStatus('Dieser konfigurierte Auftrag wurde bereits gesendet.');
      return;
    }

    const remaining = sendAt - getServerNow();
    if (remaining < -MAX_LATE_MS) {
      stopWithError('Absendezeit liegt in der Vergangenheit. Es wird nicht nachtraeglich gesendet.');
      return;
    }

    if (isConfirmationPage()) {
      submitAt(sendAt);
      return;
    }

    const prepareAt = sendAt - PREPARE_SECONDS * 1000;
    const untilPreparation = prepareAt - getServerNow();
    if (untilPreparation > 0) {
      showStatus(`Wartet. Vorbereitung in ${formatRemaining(untilPreparation)}.`);
      setTimeout(() => start(sendAt), Math.min(untilPreparation, 2147483647));
      return;
    }

    const currentVillageId = getCurrentVillageId();
    if (SOURCE_VILLAGE_ID !== null && currentVillageId !== String(SOURCE_VILLAGE_ID)) {
      showStatus('Wechselt zum konfigurierten Ausgangsdorf.');
      location.href = getPlaceUrl();
      return;
    }

    const screen = new URLSearchParams(location.search).get('screen');
    const mode = new URLSearchParams(location.search).get('mode');
    if (screen !== 'place' || mode || !getCommandForm()) {
      showStatus('Oeffnet den Versammlungsplatz.');
      location.href = getPlaceUrl();
      return;
    }

    prepareCommand(sendAt);
  }

  if (!SCRIPT_ENABLED) {
    console.info('Retime Save: deaktiviert. SCRIPT_ENABLED nach der Konfiguration auf true setzen.');
    return;
  }

  const sendAt = parseSendTime(SEND_AT);
  const configurationError = validateConfiguration(sendAt);
  if (configurationError) {
    stopWithError(configurationError);
    return;
  }

  start(sendAt);
}());

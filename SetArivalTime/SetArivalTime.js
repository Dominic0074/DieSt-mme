// ==UserScript==
// @name Set Arrival Time
// @description Set the desired arrival time in Tribal Wars and the script will automatically send the attack
// @author FunnyPocketBook
// @version 3.2.5-fixed
// @date 2026-01-30
// @license MIT
// @namespace FunnyPocketBook
// @include https://*/game.php?*&screen=place&try=confirm
// @downloadURL https://update.greasyfork.org/scripts/40120/Set%20Arrival%20Time.user.js
// @updateURL https://update.greasyfork.org/scripts/40120/Set%20Arrival%20Time.meta.js
// ==/UserScript==

let inputMs;
let input;
let delay;
let arrInterval;
let attInterval;
let activeTimer;
const POLL_INTERVAL = 5;

let delayTime = parseInt(localStorage.delayTime);
if (isNaN(delayTime)) {
    delayTime = 0;
    localStorage.delayTime = JSON.stringify(delayTime);
}

let offsetHtml =
`<tr>
    <td>
        <style>
        .tooltip .tooltiptext {
            visibility: hidden;
            width: 200px;
            background: linear-gradient(to bottom, #e3c485 0%,#ecd09a 100%);
            color: black;
            text-align: center;
            padding: 5px 10px;
            border-radius: 6px;
            border: 1px solid #804000;
            position: absolute;
            z-index: 1;
        }
        .tooltip:hover .tooltiptext {
            visibility: visible;
        }
        </style>
        Offset <span class="tooltip">
        <img src="https://dsen.innogamescdn.com/asset/2661920a/graphic/questionmark.png" style="max-width:13px"/>
        <span class="tooltiptext">
        Adjusts milliseconds. If you set 500ms and it arrives with 520ms, put "-20" into the offset.
        </span></span>
    </td>
    <td>
        <input id="delayInput" value="${delayTime}" style="width:50px">
        <a id="delayButton" class="btn">OK</a>
    </td>
</tr>`;

let setArrivalHtml =
`<tr>
    <td>Set arrival:</td>
    <td id="showArrTime"></td>
</tr>`;

let sendAttackHtml =
`<tr>
    <td>Send at:</td>
    <td id="showSendTime"></td>
</tr>`;

let buttons =
`<a id="arrTime" class="btn" style="cursor:pointer;">Set arrival time</a>
<a id="sendTime" class="btn" style="cursor:pointer;">Set send time</a>`;

document.getElementById("troop_confirm_submit").insertAdjacentHTML("afterend", buttons);

let parentTable = document.getElementById("date_arrival").parentNode.parentNode;
parentTable.insertAdjacentHTML("beforeend", offsetHtml + setArrivalHtml + sendAttackHtml);

/* ================= FIXED SEND FUNCTIONS ================= */

function getTimeParts(timeText) {
    let match = String(timeText || "").match(/(\d{1,2}):(\d{2}):(\d{2})(?::(\d{1,3}))?$/);
    if (!match) return null;

    return {
        hours: parseInt(match[1], 10),
        minutes: parseInt(match[2], 10),
        seconds: parseInt(match[3], 10)
    };
}

function timeToSecond(timeText) {
    let parts = getTimeParts(timeText);
    if (!parts) return null;

    return parts.hours * 3600 + parts.minutes * 60 + parts.seconds;
}

function getInputMilliseconds(value) {
    let ms = parseInt(value, 10);
    if (isNaN(ms)) return 0;
    return Math.max(0, Math.min(ms, 999));
}

function updateDelay() {
    delay = parseInt(delayTime, 10) + getInputMilliseconds(inputMs);
    if (isNaN(delay) || delay < 0) delay = 0;
}

function clearActiveTimer() {
    if (!activeTimer) return;

    clearTimeout(activeTimer.fallbackId);
    if (activeTimer.worker) activeTimer.worker.terminate();
    activeTimer = null;
}

function setWorkerTimeout(callback, timeout) {
    clearActiveTimer();

    let fired = false;
    let worker;
    let finish = function () {
        if (fired) return;
        fired = true;
        clearActiveTimer();
        callback();
    };

    try {
        let workerSource = "self.onmessage=function(e){setTimeout(function(){self.postMessage('done');},e.data);};";
        let workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "application/javascript" }));
        worker = new Worker(workerUrl);
        URL.revokeObjectURL(workerUrl);
        worker.onmessage = finish;
        worker.postMessage(timeout);
    } catch (e) {
        worker = null;
    }

    activeTimer = {
        worker: worker,
        fallbackId: setTimeout(finish, timeout)
    };
}

function secondsUntil(currentSecond, targetSecond) {
    let diff = targetSecond - currentSecond;
    if (diff < 0) diff += 24 * 60 * 60;
    return diff;
}

function scheduleAtSecond(getCurrentTime, targetTime) {
    let targetSecond = timeToSecond(targetTime);
    let lastSecond = timeToSecond(getCurrentTime());
    if (targetSecond === null || lastSecond === null) return;

    clearActiveTimer();

    let syncInterval = setInterval(function () {
        let currentSecond = timeToSecond(getCurrentTime());
        if (currentSecond === null || currentSecond === lastSecond) return;

        clearInterval(syncInterval);
        let timeout = secondsUntil(currentSecond, targetSecond) * 1000 + delay;
        setWorkerTimeout(submitAttack, timeout);
    }, POLL_INTERVAL);

    return syncInterval;
}

function submitAttack() {
    let btn = document.getElementById("troop_confirm_submit");
    btn.disabled = false;
    btn.click();
}

function setArrivalTime() {
    arrInterval = scheduleAtSecond(function () {
        return document.getElementsByClassName("relative_time")[0].textContent;
    }, input);
}

function setSendTime() {
    attInterval = scheduleAtSecond(function () {
        return document.getElementById("serverTime").textContent;
    }, input);
}

/* ================= BUTTON EVENTS ================= */

document.getElementById("arrTime").onclick = function () {
    clearInterval(arrInterval);
    clearInterval(attInterval);
    clearActiveTimer();
    let time = document.getElementsByClassName("relative_time")[0].textContent.slice(-8);
    input = prompt("Please enter desired arrival time", time);
    if (!input) return;
    inputMs = getInputMilliseconds(prompt("Please enter approximate milliseconds", "000"));
    updateDelay();
    document.getElementById("showArrTime").innerHTML =
        input + ":" + inputMs.toString().padStart(3, "0");
    document.getElementById("showSendTime").innerHTML = "";
    setArrivalTime();
};

document.getElementById("sendTime").onclick = function () {
    clearInterval(arrInterval);
    clearInterval(attInterval);
    clearActiveTimer();
    let time = document.getElementById("serverTime").textContent;
    input = prompt("Please enter desired send time", time);
    if (!input) return;
    inputMs = getInputMilliseconds(prompt("Please enter approximate milliseconds", "000"));
    updateDelay();
    document.getElementById("showSendTime").innerHTML =
        input + ":" + inputMs.toString().padStart(3, "0");
    document.getElementById("showArrTime").innerHTML = "";
    setSendTime();
};

document.getElementById("delayButton").onclick = function () {
    delayTime = parseInt(document.getElementById("delayInput").value);
    if (isNaN(delayTime)) delayTime = 0;
    localStorage.delayTime = JSON.stringify(delayTime);
    updateDelay();
};

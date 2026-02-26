import * as vscode from 'vscode';
import * as storage from './storage';
import { getCurrentFile, getCurrentLanguage, todayDate, onActive, onDidChangeFocusState } from '../utils';
import * as config from '../utils/config';
import { TIMER_TICK_MS } from '../constants';

let lastUpdate: number | undefined; // timestamp in milliseconds
let lastActive: number = Date.now();
let lastFocused: number = Date.now();
let _isRunning = false;

const runningStateEmitter = new vscode.EventEmitter<boolean>();
export const onDidChangeRunningState = runningStateEmitter.event;

function updateRunningState(newState: boolean) {
    if (_isRunning !== newState) {
        _isRunning = newState;
        runningStateEmitter.fire(newState);
    }
}

function update() {
    if (lastUpdate === undefined) {
        lastUpdate = Date.now();
        return;
    }
    if (!checkRunning()) {
        lastUpdate = undefined;
        updateRunningState(false);
        return;
    } else {
        updateRunningState(true);
    }
    const duration = Date.now() - lastUpdate;
    lastUpdate = Date.now();
    const data = storage.get();
    // update time info
    const date = todayDate();
    if (data.history[date] === undefined) {
        data.history[date] = storage.constructDailyRecord();
    }
    // 1. update seconds
    data.history[date].seconds += duration / 1000; // convert back to seconds
    // 2. update languages
    const currentLanguage = getCurrentLanguage();
    if (currentLanguage !== undefined) {
        data.history[date].languages[currentLanguage] = (data.history[date].languages[currentLanguage] || 0) + duration / 1000;
    }
    // 3. update files
    const fileName = getCurrentFile();
    if (fileName !== undefined && !fileName.startsWith('/')) { // avoid absolute path
        data.history[date].files[fileName] = (data.history[date].files[fileName] || 0) + duration / 1000;
    }
    storage.set(data);
}

/** Detect if timer should be running */
function checkRunning(): boolean {
    const cfg = config.get();
    // 1. check active/idle (idle happens more common than unfocus, so check first as fast path)
    if (cfg.timer.pauseWhenIdle) {
        let idleThresholdMs = cfg.timer.idleThreshold * 60 * 1000;
        idleThresholdMs = Math.max(idleThresholdMs, TIMER_TICK_MS);
        if (Date.now() - lastActive > idleThresholdMs) {
            return false;
        }
    }
    // 2. check focus/unfocus
    if (cfg.timer.pauseWhenUnfocused) {
        if (!vscode.window.state.focused) {
            // not focusing, check last focused
            let unfocusedThresholdMs = cfg.timer.unfocusedThreshold * 60 * 1000;
            unfocusedThresholdMs = Math.max(unfocusedThresholdMs, TIMER_TICK_MS);
            if (Date.now() - lastFocused > unfocusedThresholdMs) {
                return false;
            }
        }
    }
    return true;
}

/** Init and begin timer */
export function init(): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];
    const interval = setInterval(() => update(), TIMER_TICK_MS); // update every tick
    disposables.push({ dispose: () => clearInterval(interval) });
    // register event listener for activity
    disposables.push(onActive(() => {
        lastActive = Date.now();
    }));
    // register event listener for focus/unfocus
    disposables.push(onDidChangeFocusState(() => {
        lastFocused = Date.now(); // Whether focus or unfocus will update last focused time
    }));
    return vscode.Disposable.from(...disposables);
}

export function isRunning(): boolean {
    return _isRunning;
}

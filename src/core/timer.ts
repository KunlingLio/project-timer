import * as vscode from 'vscode';
import * as storage from './storage';
import { getCurrentFile, getCurrentLanguage, getDate, getProjectName, onActive } from '../utils';
import * as config from '../utils/config';

let lastUpdate: number | undefined; // timestamp in milliseconds
const TIMER_TICK_MS = 1000; // interval between timer update
let lastActive: number = Date.now();
let lastFocused: number = Date.now();

function updateTimer() {
    const projectName = getProjectName();
    if (projectName === undefined) {
        return;
    }
    if (lastUpdate === undefined) {
        lastUpdate = Date.now();
        return;
    }
    if (!isTimerRunning()) {
        lastUpdate = undefined;
        return;
    }
    const duration = Date.now() - lastUpdate;
    lastUpdate = Date.now();
    const timeInfo = storage.get(projectName);
    // update time info
    const date = getDate();
    if (timeInfo.history[date] === undefined) {
        timeInfo.history[date] = storage.constructDailyRecord();
    }
    // 1. update seconds
    timeInfo.history[date].seconds += duration / 1000; // convert back to seconds
    // 2. update languages
    const currentLanguage = getCurrentLanguage();
    if (currentLanguage !== undefined) {
        timeInfo.history[date].languages[currentLanguage] = (timeInfo.history[date].languages[currentLanguage] || 0) + duration / 1000;
    }
    // 3. update files
    const fileName = getCurrentFile();
    if (fileName !== undefined && !fileName.startsWith('/')) { // avoid absolute path
        timeInfo.history[date].files[fileName] = (timeInfo.history[date].files[fileName] || 0) + duration / 1000;
    }
    storage.set(projectName, timeInfo);
}

/// Init and begin timer
export function init(): vscode.Disposable {
    const projectName = getProjectName();
    if (projectName === undefined) {
        console.error('No project name found.');
        throw Error('No project name found.');
    }
    const disposables: vscode.Disposable[] = [];
    const interval = setInterval(() => updateTimer(), TIMER_TICK_MS); // update every second
    disposables.push({ dispose: () => clearInterval(interval) });
    // register event listener for activity
    disposables.push(onActive(() => {
        lastActive = Date.now();
        if (vscode.window.state.focused) {
            lastFocused = Date.now();
        }
    }));
    return vscode.Disposable.from(...disposables);
}

/// Get total seconds for current project
export function getTotalSeconds(): number {
    const projectName = getProjectName();
    if (projectName === undefined) {
        return 0;
    }
    const timeInfo = storage.get(projectName);
    return storage.calculateTotalSeconds(timeInfo);
}

/// Get today seconds for current project
export function getTodaySeconds(): number {
    const projectName = getProjectName();
    if (projectName === undefined) {
        return 0;
    }
    const timeInfo = storage.get(projectName);
    const date = getDate();
    if (timeInfo.history[date] === undefined) {
        return 0;
    }
    return timeInfo.history[date].seconds;
}

/// Detect if timer should be running
export function isTimerRunning(): boolean {
    // 1. check focuse
    const cfg = config.get();
    if (cfg.timer.pauseWhenUnfocused) {
        let unfocusedThresholdMs = cfg.timer.unfocusedThreshold * 60 * 1000;
        if (unfocusedThresholdMs < TIMER_TICK_MS) {
            unfocusedThresholdMs = TIMER_TICK_MS;
        }
        if (Date.now() - lastFocused > unfocusedThresholdMs) {
            return false;
        }
    }
    // 2. check idle
    if (cfg.timer.pauseWhenIdle) {
        let idleThresholdMs = cfg.timer.idleThreshold * 60 * 1000;
        if (idleThresholdMs < TIMER_TICK_MS) {
            idleThresholdMs = TIMER_TICK_MS;
        }
        if (Date.now() - lastActive > idleThresholdMs) {
            return false;
        }
    }
    return true;
}
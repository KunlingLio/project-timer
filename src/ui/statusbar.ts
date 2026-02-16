import * as vscode from 'vscode';
import * as timer from '../core/timer';
import { getProjectName, onActive } from '../utils';
import * as config from '../utils/config';
import { getMenu } from './menu';

type Precision = 'second' | 'minute' | 'hour';

let lastTooltip = "";
let statusBarItem: vscode.StatusBarItem;
let lastPrecision: Precision | undefined;
let statusBarTimeout: NodeJS.Timeout | undefined;

/// Get 'displayPrecision' from config and convert it into Precision.
/// This will automatically calculate 'auto' to concrete precision type.
function getPrecision(seconds: number): Precision {
    const cfg = config.get();
    if (cfg.statusBar.displayPrecision === "auto") {
        if (seconds < 3600) {
            return "second";
        } else {
            return "minute";
        }
    }
    return cfg.statusBar.displayPrecision;
}

function formatSeconds(seconds: number): string {
    let displayPrecision = getPrecision(seconds);
    let buf = '';
    switch (displayPrecision) {
        case "second": {
            const hrs = Math.floor(seconds / 3600);
            if (hrs > 0) {
                buf += `${hrs.toFixed(0)}h `;
            }
            const mins = Math.floor((seconds % 3600) / 60);
            if (mins > 0) {
                buf += `${mins.toFixed(0)}m `;
            }
            const secs = seconds % 60;
            buf += `${secs.toFixed(0)}s`; // last digit must be displayed
            return buf.trim();
        }
        case "minute": {
            const hrs = Math.floor(seconds / 3600);
            if (hrs > 0) {
                buf += `${hrs.toFixed(0)}h `;
            }
            const mins = Math.floor((seconds % 3600) / 60);
            buf += `${mins.toFixed(0)}m `; // last digit must be displayed
            return buf.trim();
        }
        case "hour": {
            const hrs = Math.floor(seconds / 3600);
            return `${hrs.toFixed(0)}h`;
        }
        default: {
            console.error(`Unknown display precision: ${config.get().statusBar.displayPrecision}`);
            throw new Error(`Unknown display precision: ${config.get().statusBar.displayPrecision}`);
        }
    }
}

function renderStatusBar() {
    const cfg = config.get();
    if (!cfg.statusBar.enabled) {
        statusBarItem.hide();
        return;
    };
    const seconds = timer.getTotalSeconds();
    // 1. update status bar text
    let statusBarText = '';
    if (cfg.statusBar.displayProjectName) {
        const project_name = getProjectName();
        statusBarText += `${project_name}: `;
    }
    switch (cfg.statusBar.displayTimeMode) {
        case "today": {
            const today_seconds = timer.getTodaySeconds();
            statusBarText += `${formatSeconds(today_seconds)}`;
            break;
        }
        case "total": {
            statusBarText += `${formatSeconds(seconds)}`;
            break;
        }
        case "both": {
            const today_seconds = timer.getTodaySeconds();
            statusBarText += `${formatSeconds(today_seconds)} / ${formatSeconds(seconds)}`;
            break;
        }
    }
    if (timer.isTimerRunning()) {
        statusBarItem.text = `$(clockface) ${statusBarText}`;
    } else {
        statusBarItem.text = `$(coffee) ${statusBarText}`;
    }
    // 2. update hover menu
    const tooltip = getMenu();
    if (tooltip.value !== lastTooltip) {
        lastTooltip = tooltip.value;
        statusBarItem.tooltip = tooltip;
    }
    // 3. add click event
    statusBarItem.command = 'project-timer.openStatistics';
    statusBarItem.show();
}

function updateStatusBar() {
    if (getProjectName() === undefined) { // no folder is opened
        console.log("No project folder opened");
        statusBarItem.hide();
        return;
    }
    const current_precision = getPrecision(timer.getTotalSeconds());
    if (lastPrecision === undefined) {
        lastPrecision = current_precision;
    } else { // check if precision changed, if changed update interval
        if (current_precision !== lastPrecision) {
            console.log(`Display precision changed from ${lastPrecision} to ${current_precision}`);
            lastPrecision = current_precision;
            registerInterval(current_precision);
            return;
        }
    }
    renderStatusBar();
}

function registerInterval(precision: Precision) {
    renderStatusBar(); // render for the first time
    if (statusBarTimeout) {
        clearTimeout(statusBarTimeout);
    }
    let refresh_interval: number; // in milisecond
    switch (precision) {
        case 'hour': {
            refresh_interval = 10 * 60 * 1000; // 10 min
            break;
        }
        case 'minute': {
            refresh_interval = 20 * 1000; // 20 seconds
            break;
        }
        case 'second': {
            refresh_interval = 1000; // 1 second
            break;
        }
        default: {
            console.error(`Unknown display precision: ${precision}`);
            throw new Error(`Unknown display precision: ${precision}`);
        }
    }
    statusBarTimeout = setTimeout(() => {
        updateStatusBar();
    }, refresh_interval);
}

export function activate(): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];
    // 1. create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    disposables.push(statusBarItem);
    // 2. register updater
    // update when config is changed
    disposables.push(vscode.workspace.onDidChangeConfiguration(change => { // listen config change
        if (change.affectsConfiguration('project-timer.statusBar')) {
            registerInterval(getPrecision(timer.getTotalSeconds()));
        }
    }));
    // update when user actives
    disposables.push(onActive(() => {
        updateStatusBar();
    }));
    // update periodically
    registerInterval(getPrecision(timer.getTotalSeconds()));
    disposables.push({
        dispose: () => {
            if (statusBarTimeout) {
                clearTimeout(statusBarTimeout);
            }
        }
    });
    return vscode.Disposable.from(...disposables);
}
import * as vscode from 'vscode';
import { get_seconds, get_today_seconds, is_timer_running } from '../core/timer';
import { get_project_name, on_active } from '../utils/index';
import { get_config } from '../utils/config';
import { get_context } from '../utils/context';
import { get_menu } from './menu';

type Precision = 'second' | 'minute' | 'hour';

let last_tooltip = "";
let statusBarItem: vscode.StatusBarItem;
let last_precision: Precision | undefined;
let status_bar_timeout: NodeJS.Timeout | undefined;

/// Get 'displayPrecision' from config and convert it into Precision.
/// This will automatically calculate 'auto' to concrete precision type.
function get_precision(seconds: number): Precision {
    const config = get_config();
    if (config.statusBar.displayPrecision === "auto") {
        if (seconds < 3600) {
            return "second";
        } else {
            return "minute";
        }
    }
    return config.statusBar.displayPrecision;
}

function formatSeconds(seconds: number): string {
    let display_precision = get_precision(seconds);
    let buf = '';
    switch (display_precision) {
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
            console.error(`Unknown display precision: ${get_config().statusBar.displayPrecision}`);
            throw new Error(`Unknown display precision: ${get_config().statusBar.displayPrecision}`);
        }
    }
}

function render_status_bar() {
    const config = get_config();
    if (!config.statusBar.enabled) {
        statusBarItem.hide();
        return;
    };
    const seconds = get_seconds();
    // 1. update status bar text
    let status_bar_text = '';
    if (config.statusBar.displayProjectName) {
        const project_name = get_project_name();
        status_bar_text += `${project_name}: `;
    }
    switch (config.statusBar.displayTimeMode) {
        case "today": {
            const today_seconds = get_today_seconds();
            status_bar_text += `${formatSeconds(today_seconds)}`;
            break;
        }
        case "total": {
            status_bar_text += `${formatSeconds(seconds)}`;
            break;
        }
        case "both": {
            const today_seconds = get_today_seconds();
            status_bar_text += `${formatSeconds(today_seconds)} / ${formatSeconds(seconds)}`;
            break;
        }
    }
    if (is_timer_running()) {
        statusBarItem.text = `$(clockface) ${status_bar_text}`;
    } else {
        statusBarItem.text = `$(coffee) ${status_bar_text}`;
    }
    // 2. update hover menu
    const tooltip = get_menu(seconds);
    if (tooltip.value !== last_tooltip) {
        last_tooltip = tooltip.value;
        statusBarItem.tooltip = tooltip;
    }
    // 3. add click event
    statusBarItem.command = 'project-timer.openStatistics';
    statusBarItem.show();
}

function update_status_bar() {
    if (get_project_name() === undefined) { // no folder is opened
        console.log("No project folder opened");
        statusBarItem.hide();
        return;
    }
    const current_precision = get_precision(get_seconds());
    if (last_precision === undefined) {
        last_precision = current_precision;
    } else { // check if precision changed, if changed update interval
        if (current_precision !== last_precision) {
            console.log(`Display precision changed from ${last_precision} to ${current_precision}`);
            last_precision = current_precision;
            register_interval(current_precision);
            return;
        }
    }
    render_status_bar();
}

function register_interval(precision: Precision) {
    render_status_bar(); // render for the first time
    if (status_bar_timeout) {
        clearTimeout(status_bar_timeout);
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
    status_bar_timeout = setTimeout(() => {
        update_status_bar();
    }, refresh_interval);
}

export function activate_status_bar() {
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    const context = get_context();
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push({
        dispose: () => {
            if (status_bar_timeout) {
                clearTimeout(status_bar_timeout);
            }
        }
    });
    // register updater
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(change => { // listen config change
        if (change.affectsConfiguration('project-timer.statusBar')) {
            register_interval(get_precision(get_seconds()));
        }
    }));
    on_active(() => {
        update_status_bar();
    });
    register_interval(get_precision(get_seconds()));
}
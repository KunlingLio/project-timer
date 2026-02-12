import * as vscode from 'vscode';
import { get_project_time_info, set_project_time_info } from './storage';
import { get_project_name, on_active } from './utils';
import { get_config } from './config';
import { get_context } from './context';

let last_update: number | undefined; // timestamp in milliseconds

function update_timer() {
    const project_name = get_project_name();
    if (project_name === undefined) {
        return;
    }
    if (last_update === undefined) {
        last_update = Date.now();
        return;
    }
    if (!is_timer_running()) {
        last_update = undefined;
        return;
    }
    const duration = Date.now() - last_update;
    last_update = Date.now();
    const time_info = get_project_time_info(project_name);
    time_info.total_seconds += duration / 1000; // convert back to seconds
    set_project_time_info(project_name, time_info);
}

/// Init and begin timer
export function begin_timer() {
    const project_name = get_project_name();
    if (project_name === undefined) {
        console.log('No project name found.');
        return;
    }
    const interval = setInterval(() => update_timer(), 1000); // update every second
    const context = get_context();
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
    // register event listener for activity
    on_active(() => {
        last_active = Date.now();
    });
}

/// Get seconds for current project
export function get_seconds(): number {
    const project_name = get_project_name();
    if (project_name === undefined) {
        return 0;
    }
    const time_info = get_project_time_info(project_name);
    return time_info.total_seconds;
}

let last_active: number = Date.now();

/// Detect if timer should be running
export function is_timer_running(): boolean {
    // 1. check focuse
    const config = get_config();
    if (config.timer.pauseWhenUnfocused && !vscode.window.state.focused) {
        return false;
    }
    // 2. check idle
    if (config.timer.idleThreshold > 0) {
        const idle_ms = config.timer.idleThreshold * 60 * 1000;
        if (Date.now() - last_active > idle_ms) {
            return false;
        }
    }
    return true;
}
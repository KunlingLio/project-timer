import * as vscode from 'vscode';
import { get_seconds } from './timer';

let statusBarItem: vscode.StatusBarItem;

function formatSeconds(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
}

export function reg_status_bar(context: vscode.ExtensionContext) {
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    context.subscriptions.push(statusBarItem);
    const interval = setInterval(() => {
        // update stats bar
        const seconds = get_seconds(context);
        if (seconds === undefined) {
            console.warn('Cannot get seconds for current project. Fail to update status bar.');
            statusBarItem.hide();
            return;
        }
        const stats_bar_text = formatSeconds(seconds as number);
        statusBarItem.text = stats_bar_text;
        statusBarItem.show();
    }, 1000); // 1 second
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
}
import * as vscode from 'vscode';
import * as logger from './logger';
import { FORCE_REFRESH_AFTER_STARTUP_MS } from '../constants';

const callbacks: Array<() => void> = [];

export function onRefresh(callback: () => void) {
    callbacks.push(callback);
}

export function init(): vscode.Disposable {
    // To avoid git extension not finishing scanning and cannot provide the correct Git remote URL.
    // And to reserve time for vscode to sync global state.
    const timeout = setTimeout(refresh, FORCE_REFRESH_AFTER_STARTUP_MS);
    // Clear all cache when workfolder changed.
    // This should not happened in usual, because `activationEvents: "workspaceContains:**/*"` will make VS Code call deactivate() and activate() after workspace changed.
    const changeListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        logger.warn("Workspace folders changed, refreshing ALL!");
        refresh();
    });
    return vscode.Disposable.from(
        changeListener,
        {
            dispose: () => {
                clearTimeout(timeout);
            }
        }
    );
}

export function refresh() {
    callbacks.forEach(callback => {
        try {
            callback();
        } catch (e) {
            logger.error(`Error in refresh callback: ${e}`);
        }
    });
}

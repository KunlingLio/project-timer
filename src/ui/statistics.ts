import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as context from '../utils/context';
import * as storage from '../core/storage';
import { todayDate, addCleanup } from '../utils';

function buildPayload() {
    const allDevices = storage.getAllDevicesForCurrentProject();
    const machineId = vscode.env.machineId;
    const today = todayDate();

    // Merge histories from all devices
    let mergedHistory = allDevices[0]?.history ?? {};
    for (let i = 1; i < allDevices.length; i++) {
        mergedHistory = storage.mergeHistory(mergedHistory, allDevices[i].history);
    }

    // Per-device summaries for the devices panel
    const devices = allDevices.map(d => {
        let totalSeconds = 0;
        let todaySeconds = 0;
        for (const [date, rec] of Object.entries(d.history)) {
            totalSeconds += rec.seconds;
            if (date === today) { todaySeconds += rec.seconds; }
        }
        return {
            deviceName: d.deviceName || d.deviceId,
            isLocal: d.deviceId === machineId,
            totalSeconds,
            todaySeconds,
            history: d.history
        };
    });

    // Collect file paths that actually exist on this device's workspace
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const allFilePaths: string[] = [];
    for (const date of Object.values(mergedHistory)) {
        for (const f of Object.keys(date.files || {})) {
            allFilePaths.push(f);
        }
    }
    const uniquePaths = [...new Set(allFilePaths)];
    const existingFiles = uniquePaths.filter(f => {
        // absolute path
        if (path.isAbsolute(f)) { return fs.existsSync(f); }
        // relative path — check against each workspace folder
        return workspaceFolders.some(wf => fs.existsSync(path.join(wf.uri.fsPath, f)));
    });

    return {
        projectName: storage.getProjectName(),
        history: mergedHistory,
        devices,
        existingFiles
    };
}

async function messageHandler(msg: any, panel: vscode.WebviewPanel) {
    if (msg.command === 'getData') {
        panel.webview.postMessage({ command: 'data', payload: buildPayload() });
    }
    if (msg.command === 'openFile') {
        const filePath: string = msg.path;
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        let uri: vscode.Uri | undefined;
        if (path.isAbsolute(filePath)) {
            uri = vscode.Uri.file(filePath);
        } else {
            for (const wf of workspaceFolders) {
                const abs = path.join(wf.uri.fsPath, filePath);
                if (fs.existsSync(abs)) {
                    uri = vscode.Uri.file(abs);
                    break;
                }
            }
        }
        if (uri) {
            const doc = await vscode.workspace.openTextDocument(uri);
            vscode.window.showTextDocument(doc, { preview: true });
        }
    }
}

export function openStatistics() {
    const disposables = [];
    const panel = vscode.window.createWebviewPanel(
        'statistics',
        'Project Statistics',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            // restrict local resource roots to the view folder (copied to out/view during build)
            localResourceRoots: [vscode.Uri.file(path.join(context.get().extensionPath, 'src', 'view'))]
        }
    );

    const projectName = storage.getProjectName();
    if (!projectName) {
        return;
    }

    // 1. get html file from packaged `view`
    const webviewPath = path.join(context.get().extensionPath, 'src', 'view');
    const htmlPath = path.join(webviewPath, 'statistics.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // 2. set a base href so relative resources inside the html resolve via the webview
    const baseUri = panel.webview.asWebviewUri(vscode.Uri.file(webviewPath));
    html = html.replace(/<head>/i, `<head><base href="${baseUri}/">`);
    panel.webview.html = html;

    // 3. listen to messages from Webview
    disposables.push(panel.webview.onDidReceiveMessage(msg => messageHandler(msg, panel)));
    addCleanup(disposables);
}

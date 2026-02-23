import * as vscode from 'vscode';
import * as logger from './logger';

let _context: vscode.ExtensionContext | undefined;

export function set(context: vscode.ExtensionContext) {
    _context = context;
}

export function get(): vscode.ExtensionContext {
    if (!_context) {
        const err = new Error("Context not initialized! Make sure to call set_context in activate().");
        logger.error(err);
        throw err;
    }
    return _context;
}
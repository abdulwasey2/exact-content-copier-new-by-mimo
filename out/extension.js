"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const categoryService_1 = require("./categoryService");
const copyPipeline_1 = require("./copyPipeline");
const errors_1 = require("./errors");
const COMMAND_ID = 'categorizedContentCopier.copyContent';
function activate(context) {
    const command = vscode.commands.registerCommand(COMMAND_ID, async () => {
        try {
            await copyContentOfFiles();
        }
        catch (err) {
            vscode.window.showErrorMessage(`Categorized Content Copier: ${(0, errors_1.errorMessage)(err)}`);
        }
    });
    context.subscriptions.push(command);
}
function deactivate() {
    // Nothing to clean up.
}
async function copyContentOfFiles() {
    const projectRoot = getProjectRoot();
    if (projectRoot === undefined) {
        vscode.window.showWarningMessage('Categorized Content Copier: open a project folder before running this command.');
        return;
    }
    const categories = await (0, categoryService_1.listCategoryFiles)(projectRoot);
    if (categories.length === 0) {
        vscode.window.showWarningMessage(`Categorized Content Copier: no category files found in '${categoryService_1.CATEGORY_DIRECTORY_NAME}'.`);
        return;
    }
    const picked = await vscode.window.showQuickPick(categories.map((category) => ({
        label: category.fileName,
        description: `${categoryService_1.CATEGORY_DIRECTORY_NAME}/${category.fileName}`,
        category
    })), {
        placeHolder: 'Select the category whose content should be copied',
        ignoreFocusOut: true
    });
    if (picked === undefined) {
        return;
    }
    const outcome = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Copying content...',
        cancellable: false
    }, (progress) => (0, copyPipeline_1.runCopyPipeline)(projectRoot, picked.category.absolutePath, (message) => progress.report({ message })));
    if (outcome.output === '') {
        vscode.window.showWarningMessage('Categorized Content Copier: the selected category produced no output.');
        return;
    }
    await vscode.env.clipboard.writeText(outcome.output);
    vscode.window.showInformationMessage([
        'Content copied successfully!',
        '',
        `Files copied: ${outcome.stats.filesCopied}`,
        `Files skipped: ${outcome.stats.filesSkipped}`,
        `Paths not found: ${outcome.stats.pathsNotFound}`
    ].join('\n'));
}
function getProjectRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (folders === undefined || folders.length === 0) {
        return undefined;
    }
    // Multi-root workspaces use the first folder as the project root.
    return folders[0].uri.fsPath;
}
//# sourceMappingURL=extension.js.map
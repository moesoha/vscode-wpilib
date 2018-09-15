'use scrict';
import * as vscode from 'vscode';
import { IExternalAPI, IToolAPI, IToolRunner } from 'vscode-wpilibapi';
import { logger } from './logger';
import { gradleRun } from './utilities';

import * as nls from 'vscode-nls';
import nlsConfig from './nls';
const localize = nls.config(nlsConfig)();

interface IToolQuickPick extends vscode.QuickPickItem {
  runner: IToolRunner;
}

// The tools API provider. Lists tools added to it in a quick pick to select.
export class ToolAPI implements IToolAPI {
  public static async InstallToolsFromGradle(workspace: vscode.WorkspaceFolder, externalApi: IExternalAPI): Promise<void> {
    const grResult = await gradleRun('InstallAllTools', workspace.uri.fsPath, workspace, 'ToolInstall', externalApi.getExecuteAPI(),
                                     externalApi.getPreferencesAPI().getPreferences(workspace));

    if (grResult === 0) {
      const result = await vscode.window.showInformationMessage(
        localize('message.restartAfterInstallAsk', 'Restart required for new tools. Restart now?'),
        localize('layout.yes', 'Yes'), localize('layout.no', 'No'));
      if (result !== undefined && result === localize('layout.yes', 'Yes')) {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    } else {
      logger.log(grResult.toString());
      await vscode.window.showInformationMessage(localize('message.toolInstallFailed', 'Tool install failed'));
      return;
    }
  }

  private tools: IToolQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];
  private externalApi: IExternalAPI;

  public constructor(externalApi: IExternalAPI) {
    this.externalApi = externalApi;
  }

  public async startTool(): Promise<boolean> {
    if (this.tools.length <= 0) {
      const grResult = await vscode.window.showErrorMessage(
        localize('message.noToolAsk', 'No tools found. Would you like to use Gradle to grab some?'),
        localize('layout.yes', 'Yes'), localize('layout.no', 'No'));
      if (grResult !== undefined && grResult === localize('layout.yes', 'Yes')) {
        const preferencesApi = this.externalApi.getPreferencesAPI();
        const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
          vscode.window.showInformationMessage(localize('message.emptyWorkspace.gradle', 'Cannot install gradle tools with an empty workspace'));
          return false;
        }
        await ToolAPI.InstallToolsFromGradle(workspace, this.externalApi);
      }
      return false;
    }

    const result = await vscode.window.showQuickPick(this.tools, { placeHolder: localize('layout.pickTool', 'Pick a tool') });

    if (result === undefined) {
      vscode.window.showInformationMessage(localize('message.toolRunCancelled', 'Tool run canceled.'));
      return false;
    }

    const ret =  result.runner.runTool();
    if (!ret) {
      await vscode.window.showInformationMessage(localize('message.toolRunFailed', 'Failed to start tool: {0}', result.runner.getDisplayName()));
    }
    return ret;
  }
  public addTool(tool: IToolRunner): void {
    const qpi: IToolQuickPick = {
      description: tool.getDescription(),
      label: tool.getDisplayName(),
      runner: tool,
    };
    this.tools.push(qpi);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}

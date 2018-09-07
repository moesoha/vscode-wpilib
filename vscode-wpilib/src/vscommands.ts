'use strict';

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { IExternalAPI } from 'vscode-wpilibapi';
import { requestTeamNumber } from './preferences';

interface IEnvNlsConfig {
  locale: string;
}
const envNlsConfig: IEnvNlsConfig | null = process.env.VSCODE_NLS_CONFIG ? JSON.parse(process.env.VSCODE_NLS_CONFIG) as IEnvNlsConfig : null;
const localize = nls.config({
  locale: envNlsConfig ? envNlsConfig.locale : undefined,
  messageFormat: nls.MessageFormat.both,
})();

// Most of our commands are created here.
// To create a command, use vscode.commands.registerCommand with the name of the command
// and a function to call. This function can either take nothing, or a vscode.Uri if
// the command is expected to be called on a context menu.
// Make sure to push the created command into context.subscriptions
export function createVsCommands(context: vscode.ExtensionContext, externalApi: IExternalAPI) {
  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startRioLog', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    await externalApi.getDeployDebugAPI().startRioLog(await preferences.getTeamNumber(), true);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.openCommandPalette', async () => {
    await vscode.commands.executeCommand('workbench.action.quickOpen', '>WPILib ');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setTeamNumber', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.set', 'Cannot set team number in an empty workspace.'));
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    await preferences.setTeamNumber(await requestTeamNumber());
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startTool', async () => {
    await externalApi.getToolAPI().startTool();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.deployCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.deployCode', 'Cannot deploy code in an empty workspace.'));
      return;
    }
    await externalApi.getDeployDebugAPI().deployCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.debugCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.debugCode', 'Cannot debug code in an empty workspace.'));
      return;
    }
    await externalApi.getDeployDebugAPI().debugCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.simulateCode', async (_source: vscode.Uri | undefined) => {
    await vscode.window.showInformationMessage(localize('message.disableInTest', 'This functionality is disabled for the Alpha test.'));
    return;

    // const preferencesApi = externalApi.getPreferencesAPI();
    // const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    // if (workspace === undefined) {
    //   vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
    //   return;
    // }
    // await externalApi.getDeployDebugAPI().simulateCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.testCode', async (_source: vscode.Uri | undefined) => {
    await vscode.window.showInformationMessage(localize('message.disableInTest', 'This functionality is disabled for the Alpha test.'));
    return;

    // const preferencesApi = externalApi.getPreferencesAPI();
    // const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    // if (workspace === undefined) {
    //   vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
    //   return;
    // }
    // await externalApi.getBuildTestAPI().testCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.buildCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.buildCode', 'Cannot build code in an empty workspace.'));
      return;
    }
    await externalApi.getBuildTestAPI().buildCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.createCommand', async (arg: vscode.Uri | undefined) => {
    if (arg === undefined) {
      await vscode.window.showInformationMessage(localize('message.createCommand.noFolder', 'Must select a folder to create a command.'));
      return;
    }
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.createCommand', 'Cannot create command in an empty workspace.'));
      return;
    }
    await externalApi.getCommandAPI().createCommand(workspace, arg);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setLanguage', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.set', 'Cannot set language in an empty workspace.'));
      return;
    }

    const deployDebugApi = externalApi.getDeployDebugAPI();

    if (deployDebugApi.getLanguageChoices().length <= 0) {
      await vscode.window.showInformationMessage(localize('message.noLanguageAvailableToAdd', 'No languages available to add'));
    }
    const result = await vscode.window.showQuickPick(deployDebugApi.getLanguageChoices(), {
      placeHolder: localize('layout.pickLanguage', 'Pick a language'),
    });
    if (result === undefined) {
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);
    await preferences.setCurrentLanguage(result);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setSkipTests', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.set', 'Cannot set skip tests in an empty workspace.'));
      return;
    }

    const result = await vscode.window.showInformationMessage(
      localize('message.skipTest.confirm', 'Skip tests on deploy?'),
      localize('layout.yes', 'Yes'), localize('layout.no', 'No'));
    if (result === undefined) {
      console.log('Invalid selection for settting skip tests');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage(
      localize('message.ask.saveLevel', 'Save globally or project level?'),
      localize('layout.saveLevel.globally', 'Globally'), localize('layout.saveLevel.project', 'Project'));
    if (request === undefined) {
      return;
    }
    await preferences.setSkipTests(result === localize('layout.yes', 'Yes'), request === localize('layout.saveLevel.globally', 'Globally'));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setOnline', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.set', 'Cannot set online in an empty workspace'));
      return;
    }

    const result = await vscode.window.showInformationMessage(
      localize('message.setOnline.confirm', 'Run commands in Online mode?'),
      localize('layout.yes', 'Yes'), localize('layout.no', 'No'));
    if (result === undefined) {
      console.log('Invalid selection for settting online');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage(
      localize('message.ask.saveLevel', 'Save globally or project level?'),
      localize('layout.saveLevel.globally', 'Globally'), localize('layout.saveLevel.project', 'Project'));
    if (request === undefined) {
      return;
    }
    await preferences.setOnline(result === localize('layout.yes', 'Yes'), request === localize('layout.saveLevel.globally', 'Globally'));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setStopSimulationOnEntry', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set stop simulation in an empty workspace');
      return;
    }

    const result = await vscode.window.showInformationMessage(
      localize('message.stopSimDebugOnEntry.confirm', 'Stop simulation debugging on entry?'),
      localize('layout.yes', 'Yes'), localize('layout.no', 'No'));
    if (result === undefined) {
      console.log('Invalid selection for settting stop simulation on entry');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage(
      localize('message.ask.saveLevel', 'Save globally or project level?'),
      localize('layout.saveLevel.globally', 'Globally'), localize('layout.saveLevel.project', 'Project'));
    if (request === undefined) {
      return;
    }
    await preferences.setStopSimulationOnEntry(
      result === localize('layout.yes', 'Yes'), request === localize('layout.saveLevel.globally', 'Globally'));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setAutoSave', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.set', 'Cannot set auto save in an empty workspace.'));
      return;
    }

    const result = await vscode.window.showInformationMessage(
      localize('message.autoSaveOnDeploy.confirm', 'Automatically save on deploy?'),
      localize('layout.yes', 'Yes'), localize('layout.no', 'No'));
    if (result === undefined) {
      console.log('failed to set automatically save on deploy');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage(
      localize('message.ask.saveLevel', 'Save globally or project level?'),
      localize('layout.saveLevel.globally', 'Globally'), localize('layout.saveLevel.project', 'Project'));
    if (request === undefined) {
      return;
    }
    await preferences.setAutoSaveOnDeploy(result === localize('layout.yes', 'Yes'), request === localize('layout.saveLevel.globally', 'Globally'));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setStartRioLog', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(localize('message.emptyWorkspace.set', 'Cannot set start RioLog in an empty workspace.'));
      return;
    }

    const result = await vscode.window.showInformationMessage(
      localize('message.startRioLogOnDeploy.confirm', 'Automatically start RioLog on deploy?'),
      localize('layout.yes', 'Yes'), localize('layout.no', 'No'));
    if (result === undefined) {
      console.log('Invalid selection for riolog on deploy');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage(
      localize('message.ask.saveLevel', 'Save globally or project level?'),
      localize('layout.saveLevel.globally', 'Globally'), localize('layout.saveLevel.project', 'Project'));
    if (request === undefined) {
      return;
    }
    await preferences.setAutoStartRioLog(result === localize('layout.yes', 'Yes'), request === localize('layout.saveLevel.globally', 'Globally'));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.cancelTasks', async () => {
    await externalApi.getExecuteAPI().cancelCommands();
  }));
}

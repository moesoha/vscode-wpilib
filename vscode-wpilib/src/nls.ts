import * as vscodeNls from 'vscode-nls';

interface IEnvNlsConfig {
  locale: string;
}
const envNlsConfig: IEnvNlsConfig | null = process.env.VSCODE_NLS_CONFIG ? JSON.parse(process.env.VSCODE_NLS_CONFIG) as IEnvNlsConfig : null;

export const nls = vscodeNls;

export default {
  locale: envNlsConfig ? envNlsConfig.locale : undefined,
  messageFormat: vscodeNls.MessageFormat.both,
};

export {};

interface OpenFileDialogResult {
  filePaths: string[];
}

interface ImportExcelResponse {
  success: boolean;
  message: string;
}

interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  launchNeo4j: () => Promise<string>;
  onNeo4jLog: (callback: (data: string) => void) => void;
  onNeo4jError: (callback: (data: string) => void) => void;
  onNeo4jExit: (callback: (code: number) => void) => void;
  runTestQuery: () => Promise<unknown>;
  checkNeo4jConnection: () => Promise<string>;
  openFileDialog: () => Promise<OpenFileDialogResult>;
  importExcel: (filePath: string) => Promise<ImportExcelResponse>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

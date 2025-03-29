export {};

interface OpenFileDialogResult {
  filePaths: string[];
}

interface ImportExcelResponse {
  success: boolean;
  message: string;
}

//global interfaces to pass around graph data - ZT
declare global {
  interface SchemaNode {
    id: string;
    label: string;
  }

  interface SchemaEdge {
    id: string;
    source: string;
    target: string;
  }

  interface SchemaTreeData {
    nodes: SchemaNode[];
    edges: SchemaEdge[];
  }

  interface SummaryCounts {
    totalDc: number;
    totalServer: number;
    totalApp: number;
    totalBf: number;
  }
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
  fetchSchemaData: () => Promise<SchemaTreeData>;
  fetchSummaryCounts: () => Promise<SummaryCounts>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

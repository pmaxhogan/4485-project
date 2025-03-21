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
    count: number;
  }

  interface SchemaEdge {
    from: string;
    to: string;
    id: string;
  }

  interface SchemaTreeData {
    nodes: SchemaNode[];
    edges: SchemaEdge[];
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
  saveImageToExcel(imageDataUrl: string): Promise<{ success: boolean; message: string }>; 
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

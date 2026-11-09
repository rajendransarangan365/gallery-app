/**
 * apps/windows/src/main/rea-engine.ts
 * Reverse Engineer Anything (REA) Engine for PhotoGallery Ecosystem
 * Inspired by morluto/rea - Inspects Android APKs, SQLite databases, and Native Binaries.
 */
export interface ExtractedMediaItem {
    id: string;
    name: string;
    pathInArchive: string;
    sizeBytes: number;
    compressedSize: number;
    mimeType: string;
    dataUri?: string;
}
export interface ApkInspectionResult {
    kind: 'apk';
    filePath: string;
    fileName: string;
    fileSizeBytes: number;
    packageName?: string;
    versionCode?: string;
    versionName?: string;
    minSdkVersion?: string;
    targetSdkVersion?: string;
    permissions: string[];
    activities: string[];
    services: string[];
    dexFiles: string[];
    nativeArchitectures: string[];
    mediaAssets: ExtractedMediaItem[];
    totalFiles: number;
    uncompressedSizeBytes: number;
    compressionRatio: number;
}
export interface SqliteInspectionResult {
    kind: 'sqlite';
    filePath: string;
    fileName: string;
    fileSizeBytes: number;
    pageSize: number;
    pageCount: number;
    freelistPages: number;
    walMode: boolean;
    tables: Array<{
        name: string;
        columns: string[];
        sql: string;
        hasMediaFields: boolean;
    }>;
    totalTables: number;
}
export interface BinaryInspectionResult {
    kind: 'binary';
    filePath: string;
    fileName: string;
    fileSizeBytes: number;
    architecture: string;
    subsystem: string;
    timestamp: string;
    sections: Array<{
        name: string;
        virtualSize: number;
        rawSize: number;
        characteristics: string;
    }>;
    hasEmbeddedResources: boolean;
}
export type ReaInspectionResult = ApkInspectionResult | SqliteInspectionResult | BinaryInspectionResult;
export declare class ReaEngine {
    /**
     * Main inspection dispatcher based on file extension and magic bytes
     */
    static inspectFile(targetPath: string): Promise<ReaInspectionResult>;
    /**
     * Inspect Android APK (ZIP Archive + Android Manifest strings)
     */
    static inspectApk(apkPath: string, fileSizeBytes: number): Promise<ApkInspectionResult>;
    /**
     * Helper: Read bytes of an entry inside a ZIP/APK
     */
    private static readZipEntryBytes;
    /**
     * Helper: Extract printable UTF-8 and UTF-16 strings from binary AndroidManifest.xml
     */
    private static extractStringsFromBinaryXml;
    /**
     * Inspect SQLite Database
     */
    static inspectSqlite(dbPath: string, fileSizeBytes: number, headerBuf: Buffer): Promise<SqliteInspectionResult>;
    /**
     * Inspect Windows PE / Native Executable (.exe, .dll)
     */
    static inspectPeBinary(binPath: string, fileSizeBytes: number, headerBuf: Buffer): Promise<BinaryInspectionResult>;
    /**
     * Extract all media assets from an APK or archive into a destination folder
     */
    static extractAllAssets(archivePath: string, destinationDir: string): Promise<string[]>;
    /**
     * Run REA CLI command (via npx --yes rea-agents)
     */
    static runReaCli(command: string, args: string[], onOutput: (chunk: string) => void): Promise<{
        exitCode: number;
    }>;
}
//# sourceMappingURL=rea-engine.d.ts.map
import { BlobReader, BlobWriter, Data64URIReader, ZipReader, ZipWriter } from "@zip.js/zip.js";
import fg from "fast-glob";
import fs from "fs";
import path from "path";

export async function blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
}

export async function blobToFile(blob: Blob, path: string): Promise<void> {
    const buffer = await blob.arrayBuffer();
    fs.writeFileSync(path, Buffer.from(buffer));
    return;
}

export function isPlainText(base64: string): boolean {
    const buffer = Buffer.from(base64, "base64");
    const text = buffer.toString("utf-8");

    // Regular expression to match printable characters, including Unicode
    const printableChars = /^[\p{L}\p{N}\p{P}\p{S}\p{Z}\p{C}]*$/u;

    return printableChars.test(text);
}

export async function zipFolder(sourcePath: string): Promise<Blob> {
    const blobWriter = new BlobWriter("application/zip");
    const writer = new ZipWriter(blobWriter);

    // NOTE: we could do the following in a single step with the glob pattern "**/*",
    //       but empty directories would be missing and that could cause comparison problems

    const directories = await fg("**/*", { cwd: sourcePath, dot: true, onlyDirectories: true });
    // Add each directory to the archive
    for (const entry of directories) {
        const fullPath = path.join(sourcePath, entry);
        const relativePath = path.relative(sourcePath, fullPath);
        await writer.add(`${relativePath}/`, undefined);
    }

    const files = await fg("**/*", { cwd: sourcePath, dot: true, onlyFiles: true });
    // Add each file to the archive
    for (const entry of files) {
        const fullPath = path.join(sourcePath, entry);
        const relativePath = path.relative(sourcePath, fullPath);
        const fileBlob = new Blob([fs.readFileSync(fullPath)]);
        await writer.add(relativePath, new BlobReader(fileBlob));
    }

    await writer.close();

    return await blobWriter.getData();
}

async function getBase64ZipFileEntries(zipFile: string) {
    const zipFileReader = new Data64URIReader(zipFile);
    const zipReader = new ZipReader(zipFileReader);
    return await zipReader.getEntries();
}

export async function areBase64ZipFilesEquivalent(zipFileA: string, zipFileB: string): Promise<boolean> {
    const entriesA = await getBase64ZipFileEntries(zipFileA);
    const entriesAKeys = Object.keys(entriesA);

    const entriesB = await getBase64ZipFileEntries(zipFileB);
    const entriesBKeys = Object.keys(entriesB);

    // check that the entries are the same
    if (entriesAKeys.length !== entriesBKeys.length) {
        // zip files have different numbers of entries
        return false;
    }
    for (const key in entriesAKeys) {
        const entryA = entriesA[key];
        const entryB = entriesB[key];
        // check file names
        if (entryA.filename !== entryB.filename) {
            // Filenames are different in the given position
            return false;
        }
        // check file sizes
        if (entryA.uncompressedSize !== entryB.uncompressedSize) {
            // Files have different sizes
            return false;
        }
        // check file contents
        // the Blob.text() method works well enough for text and binaries
        try {
            const contentA = entryA.getData ? await (await entryA.getData(new BlobWriter())).text() : "";
            const contentB = entryB.getData ? await (await entryB.getData(new BlobWriter())).text() : "";
            if (contentA !== contentB) {
                return false;
            }
        } catch (error) {
            console.error(`Error reading file ${entryA.filename}`);
            return false;
        }
    }
    return true;
}

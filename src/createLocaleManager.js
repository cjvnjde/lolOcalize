import fs from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const storage = new Map();

function parseLocalPath(path) {
  const [namespace, locale] = path.replace(".json", "").split("/").reverse();

  return {
    locale,
    namespace,
  };
}

function readJSONFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading JSON file:", filePath, error);
  }
}

function traverseDirectory(dir, fileCallback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      traverseDirectory(filePath, fileCallback);
    } else if (stats.isFile() && path.extname(filePath) === ".json") {
      fileCallback(filePath);
    }
  });
}

function watchDirectories(dir, fileCallback) {
  try {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      const filePath = path.join(dir, filename);
      if (!fs.existsSync(filePath)) {
        return;
      }

      const stats = fs.statSync(filePath);
      if (stats.isFile() && path.extname(filePath) === ".json") {
        fileCallback(filePath);
      }
    });
  } catch (error) {
    console.error("Error watching directory:", dir, error);
  }
}

function writeJSONFile(filename, data) {
  return writeFile(filename, JSON.stringify(data, null, 2), "utf8");
}

export function createLocaleManager(rootFolder, onFileChange) {
  watchDirectories(rootFolder, (filepath) => {
    const { locale, namespace } = parseLocalPath(filepath);
    const content = readJSONFile(filepath);

    storage.set(filepath, {
      locale,
      namespace,
      content,
    });

    onFileChange(storage.get(filepath));
  });

  traverseDirectory(rootFolder, (filepath) => {
    const { locale, namespace } = parseLocalPath(filepath);
    const content = readJSONFile(filepath);

    storage.set(filepath, {
      locale,
      namespace,
      content,
    });
  });

  return {
    getAll: () => Object.fromEntries(storage.entries()),
    deleteField: async (path, field) => {
      if (storage.has(path)) {
        const data = storage.get(path);
        const { [field]: _, ...content } = data.content;

        storage.set(path, {
          ...data,
          content,
        });

        await writeJSONFile(path, storage.get(path).content);
      }
    },
    addField: async (path, field, value) => {
      if (storage.has(path)) {
        const data = storage.get(path);

        storage.set(path, {
          ...data,
          content: {
            ...data.content,
            [field]: value,
          },
        });
        await writeJSONFile(path, storage.get(path).content);
      }
    },
  };
}

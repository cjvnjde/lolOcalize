import fs from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const storage = {};

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

function updateStorage(filepath) {
  const { locale, namespace } = parseLocalPath(filepath);
  const content = readJSONFile(filepath);

  if (!storage[locale]) {
    storage[locale] = {};
  }

  storage[locale][namespace] = content;
}

export function createLocaleManager(rootFolder, onFileChange) {
  watchDirectories(rootFolder, (filepath) => {
    updateStorage(filepath);
    const { locale, namespace } = parseLocalPath(filepath);
    onFileChange(storage[locale][namespace]);
  });

  traverseDirectory(rootFolder, updateStorage);

  return {
    getAll: (locale) => storage[locale],
    deleteField: async (path, field) => {

      const { locale, namespace } = parseLocalPath(path);
      if (storage[locale]?.[namespace]?.[field]) {
        delete storage[locale][namespace][field];

        await writeJSONFile(path, storage[locale][namespace]);
      }
    },
    addField: async (path, field, value) => {
      const { locale, namespace } = parseLocalPath(path);
      if (storage[locale]?.[namespace]) {
        storage[locale][namespace][field] = value;

        await writeJSONFile(path, storage[locale][namespace]);
      }
    },
  };
}

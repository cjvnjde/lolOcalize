import {readdir, readFile, stat, writeFile} from "node:fs/promises";
import path from "node:path";

const cache = {};

function extractLocaleInfoFromPath(filepath) {
    const [namespace, locale] = filepath.replace(".json", "").split("/").reverse();

    return {
        locale,
        namespace,
    };
}

async function readJSONFile(filePath) {
    try {
        const data = await readFile(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading JSON file:", filePath, error);
    }
}

async function traverseDirectory(dir, fileCallback) {
    const files = await readdir(dir);

    await Promise.all(files.map(async file => {
        const filePath = path.join(dir, file);
        const stats = await stat(filePath);

        if (stats.isDirectory()) {
            await traverseDirectory(filePath, fileCallback);
        } else if (stats.isFile() && path.extname(filePath) === ".json") {
            fileCallback(filePath);
        }
    }));
}

function writeJSONFile(filename, data) {
    return writeFile(filename, JSON.stringify(data, null, 2), "utf8");
}

async function updateCache(filepath) {
    const {locale, namespace} = extractLocaleInfoFromPath(filepath);
    const content = await readJSONFile(filepath);

    if (!cache[locale]) {
        cache[locale] = {};
    }

    cache[locale][namespace] = content;
}

function formatKey(key, namespace) {
    return `${namespace}:${key}`;
}

function escapeRegExp(term) {
    return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchPairs(pairs, term) {
    if (!term) {
        return pairs;
    }
    let escapedTerm = escapeRegExp(term);
    const regex = new RegExp(escapedTerm, "i");
    return pairs.filter(pair => regex.test(pair[0]) || regex.test(pair[1]));
}

export async function getEngine(rootFolder, onFileChange) {
    await traverseDirectory(rootFolder, updateCache);

    return {
        getLocales: () => Array.from(Object.keys(cache)),
        getEntries: (locale, search) => {
            return searchPairs(Object.entries(cache[locale]).reduce((acc, [namespace, value]) => {
                Object.entries(value).forEach(([key, text]) => {
                    acc.push([formatKey(key, namespace), text]);
                });

                return acc;
            }, []), search);
        },
        getAll: (locale) => cache[locale],
        deleteField: async (path, field) => {

            const {locale, namespace} = extractLocaleInfoFromPath(path);
            if (cache[locale]?.[namespace]?.[field]) {
                delete cache[locale][namespace][field];

                await writeJSONFile(path, cache[locale][namespace]);
            }
        },
        addField: async (path, field, value) => {
            const {locale, namespace} = extractLocaleInfoFromPath(path);
            if (cache[locale]?.[namespace]) {
                cache[locale][namespace][field] = value;

                await writeJSONFile(path, cache[locale][namespace]);
            }
        },
    };
}

import Fastify from "fastify";
import {getEngine} from "./engine.js";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import formbody from "@fastify/formbody";
import pug from "pug";

function initFastify() {
    const fastify = Fastify();
    fastify.register(formbody);
    fastify.register(fastifyStatic, {
        root: path.join(import.meta.dirname, "public"),
    });
    fastify.register(fastifyView, {
        engine: {
            pug,
        },
        root: path.join(import.meta.dirname, "views"),
    });
    return fastify;
}

export async function startServer() {
    const localeEngine = await getEngine("./testLocales", (path) => {
        console.log("File has changed ", path);
    });

    const fastify = initFastify();

    fastify.get("/", (req, reply) => {
        const entries = localeEngine.getEntries("en");
        const locales = localeEngine.getLocales();

        return reply.view("index.pug", {entries, locales});
    });

    fastify.post("/htmx/locale", async function handler(request, reply) {
        await localeEngine.addField("testLocales/en/common.json", "test22", "value");

        return reply.view("row.pug", {key: "test222", value: "value"});
    });

    fastify.post("/search", {
        schema: {
            body: {
                type: "object",
                properties: {
                    search: {type: "string"},
                },
            },
        },
        handler(request, reply) {
            console.log(request.body.search);
            return reply.view("search.pug", {result: {a: "tste"}});
        },
    });

    fastify.delete("/htmx/locale", async function handler(request, reply) {
        return localeEngine.deleteField("testLocales/en/common.json", "test22");
    });

    try {
        await fastify.listen({port: 3228});
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
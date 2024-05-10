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

let selectedLocale = "en";

export async function startServer() {
    const localeEngine = await getEngine("./testLocales");

    const fastify = initFastify();

    fastify.get("/", (req, reply) => {
        const entries = localeEngine.getEntries(selectedLocale);
        const locales = localeEngine.getLocales();

        return reply.view("index.pug", {entries, locales, selected: selectedLocale});
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
        handler(req, reply) {
            const entries = localeEngine.getEntries(selectedLocale, req.body.search);

            return reply.view("search.pug", {entries});
        },
    });


    fastify.post("/set-locale", {
        schema: {
            body: {
                type: "object",
                properties: {
                    locale: {type: "string"},
                },
            },
        },
        handler(req, reply) {
            selectedLocale = req.body.locale;

            const entries = localeEngine.getEntries(selectedLocale);
            const locales = localeEngine.getLocales();

            return reply.view("body.pug", {entries, locales, selected: selectedLocale});
        },
    });

    fastify.get("/open-add", (req, reply) => {
        return reply.view("add-modal.pug");
    });

    fastify.get("/close-modal", (req, reply) => {
        return reply.view("empty.pug");
    });

    fastify.post("/add", {
        schema: {
            body: {
                type: "object",
                properties: {
                    key: {type: "string"},
                    value: {type: "string"},
                },
            },
        },
        handler(req, reply) {
            const {key, value} = req.body;
            localeEngine.addField(selectedLocale, key, value);

            return reply.view("add-response.pug", {key, value});
        },
    });

    try {
        await fastify.listen({port: 3228});
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
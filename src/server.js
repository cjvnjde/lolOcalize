import Fastify from "fastify";
import { createLocaleManager } from "./createLocaleManager.js";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import formbody from "@fastify/formbody";
import pug from "pug";

export async function startServer() {
  const localeManager = createLocaleManager("./testLocales", (path) => {
    console.log("File has changed ", path);
  });

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

  fastify.get("/", (req, reply) => {
    let data = localeManager.getAll("en");
    data = Object.fromEntries(Object.entries(data).map(([key, value]) => {
      return [key, JSON.stringify(value)];
    }));

    return reply.view("index.pug", { data });
  });

  fastify.post("/htmx/locale", async function handler(request, reply) {
    await localeManager.addField("testLocales/en/common.json", "test22", "value");

    return reply.view("row.pug", { key: "test222", value: "value" });
  });


  fastify.delete("/htmx/locale", async function handler(request, reply) {
    return localeManager.deleteField("testLocales/en/common.json", "test22");
  });

  try {
    await fastify.listen({ port: 3228 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
#!/usr/bin/env node

import { createServer } from "http";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PORT = 5174;
const SKILLS_DIR = join(homedir(), ".skillrunner", "skills");
const RUNS_DIR = join(homedir(), ".skillrunner", "runs");
const DIST = join(process.cwd(), "dist");

const routes = {
  "/api/skills/installed": (req, res) => {
    const skills = [];
    if (existsSync(SKILLS_DIR)) {
      for (const e of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
        if (e.isDirectory()) {
          const md = join(SKILLS_DIR, e.name, "SKILL.md");
          let desc = "";
          if (existsSync(md)) {
            const c = readFileSync(md, "utf-8");
            const m = c.match(/^description:\s*["']?([^"'\n]+)/m);
            if (m) desc = m[1];
          }
          skills.push({ name: e.name.split("@")[0], description: desc });
        }
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ skills }));
  },
  "/api/runs": (req, res) => {
    const runs = [];
    if (existsSync(RUNS_DIR)) {
      const ids = readdirSync(RUNS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
        .reverse()
        .slice(0, 50);
      for (const id of ids) {
        const metaPath = join(RUNS_DIR, id, "meta.json");
        if (existsSync(metaPath)) {
          const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
          runs.push({ id, ...meta });
        }
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ runs }));
  },
};

function serveFile(path, contentType) {
  return (req, res) => {
    const file = path.startsWith("/api")
      ? null
      : join(DIST, path === "/" ? "index.html" : path.slice(1));
    if (file && existsSync(file)) {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(readFileSync(file));
    } else {
      res.writeHead(404);
      res.end();
    }
  };
}

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;
  const handler = routes[path] || routes[path.replace(/\/[^/]+$/, "/*")];
  if (path.startsWith("/api/runs/") && path !== "/api/runs") {
    const id = path.split("/").pop();
    const metaPath = join(RUNS_DIR, id, "meta.json");
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(meta));
      return;
    }
  }
  if (handler) return handler(req, res);
  const ext = path.split(".").pop();
  const types = {
    html: "text/html",
    js: "application/javascript",
    css: "text/css",
    json: "application/json",
  };
  return serveFile(path, types[ext] || "text/plain")(req, res);
}).listen(PORT, () => console.log(`Dashboard API: http://localhost:${PORT}`));

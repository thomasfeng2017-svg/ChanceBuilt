import { defineConfig } from "deepsec/config";

export default defineConfig({
  projects: [
    { id: "autoshop", root: ".." },
    // <deepsec:projects-insert-above>
  ],
});

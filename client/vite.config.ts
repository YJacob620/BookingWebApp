import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
// import fs from 'fs'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // future https support? or is this only for development?
  // server: {
  //   https: {
  //     key: fs.readFileSync('./path/to/server.key'),
  //     cert: fs.readFileSync('./path/to/server.cert')
  //   }
  // }
});
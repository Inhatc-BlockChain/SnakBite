import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: { allow: [".."] }   // web 폴더 밖의 ignition/deployments 를 읽기 위해
  }
});

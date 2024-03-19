// vite.config.ts
import { resolve } from "path";
import { defineConfig } from "file:///C:/Users/crypt/projects/sy-plugin/sy-progressive-plugin/node_modules/.pnpm/vite@4.5.2_@types+node@20.11.25_sass@1.71.1/node_modules/vite/dist/node/index.js";
import minimist from "file:///C:/Users/crypt/projects/sy-plugin/sy-progressive-plugin/node_modules/.pnpm/minimist@1.2.8/node_modules/minimist/index.js";
import { viteStaticCopy } from "file:///C:/Users/crypt/projects/sy-plugin/sy-progressive-plugin/node_modules/.pnpm/vite-plugin-static-copy@0.15.0_vite@4.5.2/node_modules/vite-plugin-static-copy/dist/index.js";
import livereload from "file:///C:/Users/crypt/projects/sy-plugin/sy-progressive-plugin/node_modules/.pnpm/rollup-plugin-livereload@2.0.5/node_modules/rollup-plugin-livereload/dist/index.cjs.js";
import { svelte } from "file:///C:/Users/crypt/projects/sy-plugin/sy-progressive-plugin/node_modules/.pnpm/@sveltejs+vite-plugin-svelte@2.5.3_svelte@3.59.2_vite@4.5.2/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import zipPack from "file:///C:/Users/crypt/projects/sy-plugin/sy-progressive-plugin/node_modules/.pnpm/vite-plugin-zip-pack@1.2.2_vite@4.5.2/node_modules/vite-plugin-zip-pack/dist/esm/index.mjs";
import fg from "file:///C:/Users/crypt/projects/sy-plugin/sy-progressive-plugin/node_modules/.pnpm/fast-glob@3.3.2/node_modules/fast-glob/out/index.js";
var __vite_injected_original_dirname = "C:\\Users\\crypt\\projects\\sy-plugin\\sy-progressive-plugin";
var args = minimist(process.argv.slice(2));
var isWatch = args.watch || args.w || false;
var devDistDir = "./dev";
var distDir = isWatch ? devDistDir : "./dist";
console.log("isWatch=>", isWatch);
console.log("distDir=>", distDir);
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "src")
    }
  },
  plugins: [
    svelte(),
    viteStaticCopy({
      targets: [
        {
          src: "./README*.md",
          dest: "./"
        },
        {
          src: "./icon.png",
          dest: "./"
        },
        {
          src: "./preview.png",
          dest: "./"
        },
        {
          src: "./plugin.json",
          dest: "./"
        },
        {
          src: "./src/i18n/**",
          dest: "./i18n/"
        }
      ]
    })
  ],
  // https://github.com/vitejs/vite/issues/1930
  // https://vitejs.dev/guide/env-and-mode.html#env-files
  // https://github.com/vitejs/vite/discussions/3058#discussioncomment-2115319
  // 在这里自定义变量
  define: {
    "process.env.DEV_MODE": `"${isWatch}"`,
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
  },
  build: {
    // 输出路径
    outDir: distDir,
    emptyOutDir: false,
    // 构建后是否生成 source map 文件
    sourcemap: false,
    // 设置为 false 可以禁用最小化混淆
    // 或是用来指定是应用哪种混淆器
    // boolean | 'terser' | 'esbuild'
    // 不压缩，用于调试
    minify: !isWatch,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      // the proper extensions will be added
      fileName: "index",
      formats: ["cjs"]
    },
    rollupOptions: {
      plugins: [
        ...isWatch ? [
          livereload(devDistDir),
          {
            //监听静态资源文件
            name: "watch-external",
            async buildStart() {
              const files = await fg([
                "src/i18n/*.json",
                "./README*.md",
                "./plugin.json"
              ]);
              for (const file of files) {
                this.addWatchFile(file);
              }
            }
          }
        ] : [
          zipPack({
            inDir: "./dist",
            outDir: "./",
            outFileName: "package.zip"
          })
        ]
      ],
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["siyuan", "process"],
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") {
            return "index.css";
          }
          return assetInfo.name;
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxjcnlwdFxcXFxwcm9qZWN0c1xcXFxzeS1wbHVnaW5cXFxcc3ktcHJvZ3Jlc3NpdmUtcGx1Z2luXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxjcnlwdFxcXFxwcm9qZWN0c1xcXFxzeS1wbHVnaW5cXFxcc3ktcHJvZ3Jlc3NpdmUtcGx1Z2luXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9jcnlwdC9wcm9qZWN0cy9zeS1wbHVnaW4vc3ktcHJvZ3Jlc3NpdmUtcGx1Z2luL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IG1pbmltaXN0IGZyb20gXCJtaW5pbWlzdFwiO1xuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tIFwidml0ZS1wbHVnaW4tc3RhdGljLWNvcHlcIjtcbmltcG9ydCBsaXZlcmVsb2FkIGZyb20gXCJyb2xsdXAtcGx1Z2luLWxpdmVyZWxvYWRcIjtcbmltcG9ydCB7IHN2ZWx0ZSB9IGZyb20gXCJAc3ZlbHRlanMvdml0ZS1wbHVnaW4tc3ZlbHRlXCI7XG5pbXBvcnQgemlwUGFjayBmcm9tIFwidml0ZS1wbHVnaW4temlwLXBhY2tcIjtcbmltcG9ydCBmZyBmcm9tIFwiZmFzdC1nbG9iXCI7XG5cbmNvbnN0IGFyZ3MgPSBtaW5pbWlzdChwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpO1xuY29uc3QgaXNXYXRjaCA9IGFyZ3Mud2F0Y2ggfHwgYXJncy53IHx8IGZhbHNlO1xuY29uc3QgZGV2RGlzdERpciA9IFwiLi9kZXZcIjtcbmNvbnN0IGRpc3REaXIgPSBpc1dhdGNoID8gZGV2RGlzdERpciA6IFwiLi9kaXN0XCI7XG5cbmNvbnNvbGUubG9nKFwiaXNXYXRjaD0+XCIsIGlzV2F0Y2gpO1xuY29uc29sZS5sb2coXCJkaXN0RGlyPT5cIiwgZGlzdERpcik7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyY1wiKSxcbiAgICB9LFxuICB9LFxuXG4gIHBsdWdpbnM6IFtcbiAgICBzdmVsdGUoKSxcblxuICAgIHZpdGVTdGF0aWNDb3B5KHtcbiAgICAgIHRhcmdldHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHNyYzogXCIuL1JFQURNRSoubWRcIixcbiAgICAgICAgICBkZXN0OiBcIi4vXCIsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzcmM6IFwiLi9pY29uLnBuZ1wiLFxuICAgICAgICAgIGRlc3Q6IFwiLi9cIixcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHNyYzogXCIuL3ByZXZpZXcucG5nXCIsXG4gICAgICAgICAgZGVzdDogXCIuL1wiLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc3JjOiBcIi4vcGx1Z2luLmpzb25cIixcbiAgICAgICAgICBkZXN0OiBcIi4vXCIsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzcmM6IFwiLi9zcmMvaTE4bi8qKlwiLFxuICAgICAgICAgIGRlc3Q6IFwiLi9pMThuL1wiLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KSxcbiAgXSxcblxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdml0ZWpzL3ZpdGUvaXNzdWVzLzE5MzBcbiAgLy8gaHR0cHM6Ly92aXRlanMuZGV2L2d1aWRlL2Vudi1hbmQtbW9kZS5odG1sI2Vudi1maWxlc1xuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdml0ZWpzL3ZpdGUvZGlzY3Vzc2lvbnMvMzA1OCNkaXNjdXNzaW9uY29tbWVudC0yMTE1MzE5XG4gIC8vIFx1NTcyOFx1OEZEOVx1OTFDQ1x1ODFFQVx1NUI5QVx1NEU0OVx1NTNEOFx1OTFDRlxuICBkZWZpbmU6IHtcbiAgICBcInByb2Nlc3MuZW52LkRFVl9NT0RFXCI6IGBcIiR7aXNXYXRjaH1cImAsXG4gICAgXCJwcm9jZXNzLmVudi5OT0RFX0VOVlwiOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5OT0RFX0VOViksXG4gIH0sXG5cbiAgYnVpbGQ6IHtcbiAgICAvLyBcdThGOTNcdTUxRkFcdThERUZcdTVGODRcbiAgICBvdXREaXI6IGRpc3REaXIsXG4gICAgZW1wdHlPdXREaXI6IGZhbHNlLFxuXG4gICAgLy8gXHU2Nzg0XHU1RUZBXHU1NDBFXHU2NjJGXHU1NDI2XHU3NTFGXHU2MjEwIHNvdXJjZSBtYXAgXHU2NTg3XHU0RUY2XG4gICAgc291cmNlbWFwOiBmYWxzZSxcblxuICAgIC8vIFx1OEJCRVx1N0Y2RVx1NEUzQSBmYWxzZSBcdTUzRUZcdTRFRTVcdTc5ODFcdTc1MjhcdTY3MDBcdTVDMEZcdTUzMTZcdTZERjdcdTZEQzZcbiAgICAvLyBcdTYyMTZcdTY2MkZcdTc1MjhcdTY3NjVcdTYzMDdcdTVCOUFcdTY2MkZcdTVFOTRcdTc1MjhcdTU0RUFcdTc5Q0RcdTZERjdcdTZEQzZcdTU2NjhcbiAgICAvLyBib29sZWFuIHwgJ3RlcnNlcicgfCAnZXNidWlsZCdcbiAgICAvLyBcdTRFMERcdTUzOEJcdTdGMjlcdUZGMENcdTc1MjhcdTRFOEVcdThDMDNcdThCRDVcbiAgICBtaW5pZnk6ICFpc1dhdGNoLFxuXG4gICAgbGliOiB7XG4gICAgICAvLyBDb3VsZCBhbHNvIGJlIGEgZGljdGlvbmFyeSBvciBhcnJheSBvZiBtdWx0aXBsZSBlbnRyeSBwb2ludHNcbiAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmMvaW5kZXgudHNcIiksXG4gICAgICAvLyB0aGUgcHJvcGVyIGV4dGVuc2lvbnMgd2lsbCBiZSBhZGRlZFxuICAgICAgZmlsZU5hbWU6IFwiaW5kZXhcIixcbiAgICAgIGZvcm1hdHM6IFtcImNqc1wiXSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgLi4uKGlzV2F0Y2hcbiAgICAgICAgICA/IFtcbiAgICAgICAgICAgIGxpdmVyZWxvYWQoZGV2RGlzdERpciksXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIC8vXHU3NkQxXHU1NDJDXHU5NzU5XHU2MDAxXHU4RDQ0XHU2RTkwXHU2NTg3XHU0RUY2XG4gICAgICAgICAgICAgIG5hbWU6IFwid2F0Y2gtZXh0ZXJuYWxcIixcbiAgICAgICAgICAgICAgYXN5bmMgYnVpbGRTdGFydCgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlcyA9IGF3YWl0IGZnKFtcbiAgICAgICAgICAgICAgICAgIFwic3JjL2kxOG4vKi5qc29uXCIsXG4gICAgICAgICAgICAgICAgICBcIi4vUkVBRE1FKi5tZFwiLFxuICAgICAgICAgICAgICAgICAgXCIuL3BsdWdpbi5qc29uXCIsXG4gICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLmFkZFdhdGNoRmlsZShmaWxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF1cbiAgICAgICAgICA6IFtcbiAgICAgICAgICAgIHppcFBhY2soe1xuICAgICAgICAgICAgICBpbkRpcjogXCIuL2Rpc3RcIixcbiAgICAgICAgICAgICAgb3V0RGlyOiBcIi4vXCIsXG4gICAgICAgICAgICAgIG91dEZpbGVOYW1lOiBcInBhY2thZ2UuemlwXCIsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdKSxcbiAgICAgIF0sXG5cbiAgICAgIC8vIG1ha2Ugc3VyZSB0byBleHRlcm5hbGl6ZSBkZXBzIHRoYXQgc2hvdWxkbid0IGJlIGJ1bmRsZWRcbiAgICAgIC8vIGludG8geW91ciBsaWJyYXJ5XG4gICAgICBleHRlcm5hbDogW1wic2l5dWFuXCIsIFwicHJvY2Vzc1wiXSxcblxuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiBcIltuYW1lXS5qc1wiLFxuICAgICAgICBhc3NldEZpbGVOYW1lczogKGFzc2V0SW5mbykgPT4ge1xuICAgICAgICAgIGlmIChhc3NldEluZm8ubmFtZSA9PT0gXCJzdHlsZS5jc3NcIikge1xuICAgICAgICAgICAgcmV0dXJuIFwiaW5kZXguY3NzXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhc3NldEluZm8ubmFtZTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtVyxTQUFTLGVBQWU7QUFDM1gsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxjQUFjO0FBQ3JCLFNBQVMsc0JBQXNCO0FBQy9CLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsY0FBYztBQUN2QixPQUFPLGFBQWE7QUFDcEIsT0FBTyxRQUFRO0FBUGYsSUFBTSxtQ0FBbUM7QUFTekMsSUFBTSxPQUFPLFNBQVMsUUFBUSxLQUFLLE1BQU0sQ0FBQyxDQUFDO0FBQzNDLElBQU0sVUFBVSxLQUFLLFNBQVMsS0FBSyxLQUFLO0FBQ3hDLElBQU0sYUFBYTtBQUNuQixJQUFNLFVBQVUsVUFBVSxhQUFhO0FBRXZDLFFBQVEsSUFBSSxhQUFhLE9BQU87QUFDaEMsUUFBUSxJQUFJLGFBQWEsT0FBTztBQUVoQyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLElBQy9CO0FBQUEsRUFDRjtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLElBRVAsZUFBZTtBQUFBLE1BQ2IsU0FBUztBQUFBLFFBQ1A7QUFBQSxVQUNFLEtBQUs7QUFBQSxVQUNMLE1BQU07QUFBQSxRQUNSO0FBQUEsUUFDQTtBQUFBLFVBQ0UsS0FBSztBQUFBLFVBQ0wsTUFBTTtBQUFBLFFBQ1I7QUFBQSxRQUNBO0FBQUEsVUFDRSxLQUFLO0FBQUEsVUFDTCxNQUFNO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxVQUNFLEtBQUs7QUFBQSxVQUNMLE1BQU07QUFBQSxRQUNSO0FBQUEsUUFDQTtBQUFBLFVBQ0UsS0FBSztBQUFBLFVBQ0wsTUFBTTtBQUFBLFFBQ1I7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNQSxRQUFRO0FBQUEsSUFDTix3QkFBd0IsSUFBSSxPQUFPO0FBQUEsSUFDbkMsd0JBQXdCLEtBQUssVUFBVSxRQUFRLElBQUksUUFBUTtBQUFBLEVBQzdEO0FBQUEsRUFFQSxPQUFPO0FBQUE7QUFBQSxJQUVMLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQTtBQUFBLElBR2IsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFNWCxRQUFRLENBQUM7QUFBQSxJQUVULEtBQUs7QUFBQTtBQUFBLE1BRUgsT0FBTyxRQUFRLGtDQUFXLGNBQWM7QUFBQTtBQUFBLE1BRXhDLFVBQVU7QUFBQSxNQUNWLFNBQVMsQ0FBQyxLQUFLO0FBQUEsSUFDakI7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFNBQVM7QUFBQSxRQUNQLEdBQUksVUFDQTtBQUFBLFVBQ0EsV0FBVyxVQUFVO0FBQUEsVUFDckI7QUFBQTtBQUFBLFlBRUUsTUFBTTtBQUFBLFlBQ04sTUFBTSxhQUFhO0FBQ2pCLG9CQUFNLFFBQVEsTUFBTSxHQUFHO0FBQUEsZ0JBQ3JCO0FBQUEsZ0JBQ0E7QUFBQSxnQkFDQTtBQUFBLGNBQ0YsQ0FBQztBQUNELHlCQUFXLFFBQVEsT0FBTztBQUN4QixxQkFBSyxhQUFhLElBQUk7QUFBQSxjQUN4QjtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsUUFDRixJQUNFO0FBQUEsVUFDQSxRQUFRO0FBQUEsWUFDTixPQUFPO0FBQUEsWUFDUCxRQUFRO0FBQUEsWUFDUixhQUFhO0FBQUEsVUFDZixDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0o7QUFBQTtBQUFBO0FBQUEsTUFJQSxVQUFVLENBQUMsVUFBVSxTQUFTO0FBQUEsTUFFOUIsUUFBUTtBQUFBLFFBQ04sZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCLENBQUMsY0FBYztBQUM3QixjQUFJLFVBQVUsU0FBUyxhQUFhO0FBQ2xDLG1CQUFPO0FBQUEsVUFDVDtBQUNBLGlCQUFPLFVBQVU7QUFBQSxRQUNuQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==

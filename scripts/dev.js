// Build + servidor + reconstrucción automática al guardar cambios en src/ o site.config.js.
import { spawnSync, spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const build = () => spawnSync(process.execPath, ['scripts/build.js'], { cwd: root, stdio: 'inherit' });
build();
spawn(process.execPath, ['scripts/serve.js'], { cwd: root, stdio: 'inherit' });

let timer;
const rebuild = () => { clearTimeout(timer); timer = setTimeout(build, 150); };
watch(resolve(root, 'src'), { recursive: true }, rebuild);
watch(resolve(root, 'site.config.js'), rebuild);

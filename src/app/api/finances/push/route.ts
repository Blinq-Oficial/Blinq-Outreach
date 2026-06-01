import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

function runGitCommand(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; success: boolean }> {
  return new Promise((resolve) => {
    exec(cmd, { cwd }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: !error
      });
    });
  });
}

export async function POST() {
  try {
    const cwd = path.join(process.cwd());
    const timestamp = new Date().toLocaleString();
    const logs: string[] = [];

    logs.push(`[CMD] git add database_fallback.json`);
    const addRes = await runGitCommand('git add database_fallback.json', cwd);
    if (addRes.stdout) logs.push(addRes.stdout);
    if (addRes.stderr) logs.push(`[WARN] ${addRes.stderr}`);
    
    if (!addRes.success) {
      return NextResponse.json({
        success: false,
        message: 'Fallo al agregar base de datos al stage de Git.',
        logs
      }, { status: 500 });
    }

    logs.push(`[CMD] git commit -m "chore: sync company finances (${timestamp})"`);
    const commitRes = await runGitCommand(`git commit -m "chore: sync company finances (${timestamp})"`, cwd);
    if (commitRes.stdout) logs.push(commitRes.stdout);
    if (commitRes.stderr) logs.push(`[WARN] ${commitRes.stderr}`);

    // If commit failed because nothing changed, that is fine, let's proceed to push or notify
    const nothingToCommit = commitRes.stderr.includes('nothing to commit') || commitRes.stdout.includes('nothing to commit') || commitRes.stdout.includes('no changes added');
    
    if (!commitRes.success && !nothingToCommit) {
      return NextResponse.json({
        success: false,
        message: 'Fallo al realizar el commit de Git.',
        logs
      }, { status: 500 });
    }

    logs.push(`[CMD] git push origin main`);
    const pushRes = await runGitCommand('git push origin main', cwd);
    if (pushRes.stdout) logs.push(pushRes.stdout);
    if (pushRes.stderr) logs.push(pushRes.stderr);

    if (!pushRes.success) {
      return NextResponse.json({
        success: false,
        message: 'Fallo al subir (Push) a GitHub.',
        logs
      }, { status: 500 });
    }

    logs.push(`[SYSTEM] Sincronización con GitHub completada de forma exitosa en origin main! ✅`);
    return NextResponse.json({
      success: true,
      message: 'Sincronización de finanzas completada con éxito en GitHub.',
      logs
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Error crítico interno del servidor.',
      error: error.message,
      logs: [`[FATAL] ${error.message}`]
    }, { status: 500 });
  }
}
